/**
 * Album Stats Proxy — In-Page CORS Enhancement
 *
 * On bunkr.cr album pages (/a/*):
 *
 *  1. Waits for the file grid (.theItem cards) to render (they may arrive via
 *     infinite-scroll / client-side JS after page load).
 *  2. Counts file cards by type: video cards carry a play-icon badge, everything
 *     else is treated as an image/other.
 *  3. Tries to fetch richer stats from s.bunkr.ru (accessible same-origin or via
 *     GM_xmlhttpRequest from within bunkr.cr) and merges the data if available.
 *  4. Injects a compact stats bar after the album title showing the breakdown and
 *     any extra API-supplied metadata (total views, upload date).
 *  5. Re-counts automatically when infinite-scroll appends more items.
 */

import { gmFetchJson } from '../services/cross-fetch';
import { log, warn } from '../utils/log';
import type { FileTypeSummary } from '../types';

const PANEL_ID = 'bks-stats-panel';

const STYLES = `
#${PANEL_ID} {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
  background: #111114;
  border: 1px solid #1d1d24;
  border-radius: 10px;
  padding: 9px 15px;
  margin-top: 10px;
  margin-bottom: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #9a9aa6;
  animation: bks-stats-in 0.25s cubic-bezier(.2,.8,.2,1) both;
}
@keyframes bks-stats-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.bks-stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.bks-stat-val {
  color: #e8e8ec;
  font-weight: 500;
}
.bks-stat-sep {
  width: 1px;
  height: 11px;
  background: #25252d;
  flex-shrink: 0;
}
`;

interface AlbumApiData {
  views?: number;
  totalViews?: number;
  createdAt?: string;
  created_at?: string;
  [key: string]: unknown;
}

function injectStyles(): void {
  if (document.getElementById('bks-stats-styles')) return;
  const s = document.createElement('style');
  s.id = 'bks-stats-styles';
  s.textContent = STYLES;
  document.head.appendChild(s);
}

function countFileTypes(): FileTypeSummary {
  const items = document.querySelectorAll<Element>('.theItem, [class*="theItem"]');
  let videos = 0;
  let images = 0;

  items.forEach((item) => {
    const link = item.querySelector<HTMLAnchorElement>('a[href]');
    const href = link?.getAttribute('href') ?? '';
    // Video file pages use /v/ prefix; image pages use /i/.
    // The item may also carry a video-icon badge we can check as a fallback.
    const hasVideoPath = href.startsWith('/v/');
    const hasVideoIcon = !!item.querySelector(
      '[class*="video"], [class*="play-circle"], svg[class*="play"]',
    );
    if (hasVideoPath || hasVideoIcon) {
      videos++;
    } else {
      images++;
    }
  });

  return { videos, images, total: videos + images };
}

function makeStat(value: string, label: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'bks-stat-item';
  const v = document.createElement('span');
  v.className = 'bks-stat-val';
  v.textContent = value;
  const l = document.createElement('span');
  l.textContent = label;
  el.append(v, l);
  return el;
}

function makeSep(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'bks-stat-sep';
  return el;
}

function buildPanel(summary: FileTypeSummary, apiData?: AlbumApiData): HTMLElement {
  const panel = document.createElement('div');
  panel.id = PANEL_ID;

  const parts: HTMLElement[] = [];

  if (summary.videos > 0) parts.push(makeStat(String(summary.videos), 'videos'));
  if (summary.images > 0) parts.push(makeStat(String(summary.images), 'images'));

  if (summary.videos > 0 && summary.images > 0) {
    const ratio = ((summary.videos / summary.total) * 100).toFixed(0);
    parts.push(makeStat(`${ratio}%`, 'video'));
  }

  if (apiData) {
    const views = apiData.views ?? apiData.totalViews;
    if (typeof views === 'number' && views > 0) {
      parts.push(makeStat(views.toLocaleString(), 'views'));
    }

    const rawDate = apiData.createdAt ?? apiData.created_at;
    if (typeof rawDate === 'string') {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          parts.push(makeStat(d.toLocaleDateString(), 'uploaded'));
        }
      } catch {
        // ignore malformed date
      }
    }
  }

  // Interleave separators between parts.
  parts.forEach((part, i) => {
    panel.appendChild(part);
    if (i < parts.length - 1) panel.appendChild(makeSep());
  });

  return panel;
}

function injectPanel(summary: FileTypeSummary, apiData?: AlbumApiData): void {
  if (summary.total === 0) return;

  document.getElementById(PANEL_ID)?.remove();

  const panel = buildPanel(summary, apiData);

  // Insert after the first <h1> (album title) we find.
  const heading = document.querySelector<HTMLElement>('h1');
  if (heading?.parentElement) {
    heading.parentElement.insertBefore(panel, heading.nextSibling);
    log('Stats panel injected:', summary, apiData ?? {});
  }
}

async function fetchAlbumApiData(albumId: string): Promise<AlbumApiData | undefined> {
  try {
    const data = await gmFetchJson<AlbumApiData>(
      `https://s.bunkr.ru/api/albums/ats/${albumId}`,
    );
    log('Album API data:', data);
    return data;
  } catch (err) {
    // API is not always reachable — silently degrade.
    warn('Album API unavailable:', err);
    return undefined;
  }
}

function waitForItems(timeoutMs = 10_000): Promise<void> {
  if (document.querySelector('.theItem, [class*="theItem"]')) return Promise.resolve();

  return new Promise((resolve) => {
    const obs = new MutationObserver(() => {
      if (document.querySelector('.theItem, [class*="theItem"]')) {
        obs.disconnect();
        resolve();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      obs.disconnect();
      resolve(); // resolve anyway — panel will show 0 stats gracefully
    }, timeoutMs);
  });
}

export async function initAlbumStats(): Promise<void> {
  injectStyles();

  const albumId = window.location.pathname.match(/\/a\/([A-Za-z0-9_-]+)/)?.[1];
  if (!albumId) return;

  // Kick off API request in parallel with waiting for the grid to render.
  const [, apiData] = await Promise.all([waitForItems(), fetchAlbumApiData(albumId)]);

  const summary = countFileTypes();
  injectPanel(summary, apiData);

  // Re-run when infinite scroll appends more file cards.
  let lastTotal = summary.total;
  const obs = new MutationObserver(() => {
    const current = countFileTypes();
    if (current.total !== lastTotal) {
      lastTotal = current.total;
      injectPanel(current, apiData);
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}
