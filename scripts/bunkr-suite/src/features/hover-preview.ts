/**
 * Hover Quick-Preview Panel
 *
 * On balbums.st, hovering an album card for `config.hoverPreview.delayMs`
 * milliseconds fetches the corresponding bunkr.cr album page via
 * GM_xmlhttpRequest (bypassing CORS), extracts the thumbnail grid, and
 * renders a floating popover without leaving the index page.
 *
 * Results are cached in-memory so repeated hovers on the same card are free.
 */

import { gmFetch } from '../services/cross-fetch';
import { observeAdded } from '../dom/observer';
import { config } from '../config';
import { log } from '../utils/log';
import type { PreviewData } from '../types';

type CacheEntry = PreviewData | 'error';

const POPOVER_ID = 'bks-preview-popover';
const POPOVER_W = 316;

const STYLES = `
#${POPOVER_ID} {
  position: fixed;
  width: ${POPOVER_W}px;
  background: #15151a;
  border: 1px solid #25252d;
  border-radius: 12px;
  padding: 12px;
  z-index: 99999;
  box-shadow: 0 24px 64px rgba(0,0,0,0.88);
  pointer-events: none;
  animation: bks-pop-in 0.14s cubic-bezier(.2,.8,.2,1) both;
}
@keyframes bks-pop-in {
  from { opacity: 0; transform: scale(0.95) translateY(5px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);   }
}
.bks-pop-title {
  font-size: 12px;
  font-family: 'Geist', system-ui, sans-serif;
  color: #9a9aa6;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bks-pop-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin-bottom: 9px;
}
.bks-pop-thumb {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
  border-radius: 5px;
  background: #1c1c22;
  display: block;
}
.bks-pop-meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #5e5e6b;
  letter-spacing: 0.1em;
}
.bks-pop-state {
  text-align: center;
  padding: 22px 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #5e5e6b;
}
.bks-pop-state.error { color: #ff7a59; }
`;

const previewCache = new Map<string, CacheEntry>();
let activePopover: HTMLElement | null = null;
let hoverTimer: ReturnType<typeof setTimeout> | null = null;

function injectStyles(): void {
  if (document.getElementById('bks-pop-styles')) return;
  const s = document.createElement('style');
  s.id = 'bks-pop-styles';
  s.textContent = STYLES;
  document.head.appendChild(s);
}

function computePosition(anchor: Element): { top: number; left: number } {
  const r = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ESTIMATED_H = 270;
  const GAP = 10;

  let left = r.right + GAP;
  if (left + POPOVER_W > vw - 8) left = r.left - POPOVER_W - GAP;
  left = Math.max(8, Math.min(left, vw - POPOVER_W - 8));

  let top = r.top;
  if (top + ESTIMATED_H > vh - 8) top = vh - ESTIMATED_H - 8;
  top = Math.max(8, top);

  return { top, left };
}

function buildPopover(content: PreviewData | 'loading' | 'error', anchor: Element): HTMLElement {
  const el = document.createElement('div');
  el.id = POPOVER_ID;
  const { top, left } = computePosition(anchor);
  el.style.top = `${top}px`;
  el.style.left = `${left}px`;

  if (content === 'loading') {
    const state = document.createElement('div');
    state.className = 'bks-pop-state';
    state.textContent = 'Loading preview…';
    el.appendChild(state);
    return el;
  }

  if (content === 'error') {
    const state = document.createElement('div');
    state.className = 'bks-pop-state error';
    state.textContent = 'Preview unavailable';
    el.appendChild(state);
    return el;
  }

  if (content.title) {
    const title = document.createElement('div');
    title.className = 'bks-pop-title';
    title.textContent = content.title;
    el.appendChild(title);
  }

  if (content.thumbnails.length > 0) {
    const grid = document.createElement('div');
    grid.className = 'bks-pop-grid';
    content.thumbnails.forEach((src) => {
      const img = document.createElement('img');
      img.className = 'bks-pop-thumb';
      img.src = src;
      img.loading = 'lazy';
      img.decoding = 'async';
      grid.appendChild(img);
    });
    el.appendChild(grid);
  } else {
    const state = document.createElement('div');
    state.className = 'bks-pop-state';
    state.textContent = 'No thumbnails found';
    el.appendChild(state);
  }

  const meta = document.createElement('div');
  meta.className = 'bks-pop-meta';
  meta.textContent = content.fileCount > 0 ? `${content.fileCount} files` : '';
  el.appendChild(meta);

  return el;
}

function showPopover(content: PreviewData | 'loading' | 'error', anchor: Element): void {
  removePopover();
  activePopover = buildPopover(content, anchor);
  document.body.appendChild(activePopover);
}

function removePopover(): void {
  activePopover?.remove();
  activePopover = null;
}

function parseAlbumPage(html: string, albumId: string): PreviewData {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Thumbnails live inside .theItem elements on the bunkr.cr album page.
  // They are served from static.scdn.st under a /thumbs/ path.
  const thumbs = Array.from(doc.querySelectorAll<HTMLImageElement>('img'))
    .map((img) => {
      const src = img.getAttribute('src') ?? '';
      // Convert relative src to absolute using the bunkr.cr origin.
      if (src.startsWith('http')) return src;
      if (src.startsWith('/')) return `https://bunkr.cr${src}`;
      return '';
    })
    .filter((src) => src.includes('scdn.st') && src.includes('thumbs'))
    .slice(0, config.hoverPreview.maxThumbnails);

  const title = doc.querySelector('h1')?.textContent?.trim() ?? '';
  const countMatch = doc.body.textContent?.match(/(\d[\d,]*)\s+[Ff]iles?/);
  const fileCount = countMatch?.[1] ? parseInt(countMatch[1].replace(/,/g, ''), 10) : 0;

  log('Parsed preview for', albumId, '— thumbs:', thumbs.length);
  return { thumbnails: thumbs, title, fileCount };
}

async function fetchPreview(albumId: string): Promise<CacheEntry> {
  const cached = previewCache.get(albumId);
  if (cached !== undefined) return cached;

  try {
    const html = await gmFetch(`https://bunkr.cr/a/${albumId}`);
    const data = parseAlbumPage(html, albumId);
    previewCache.set(albumId, data);
    return data;
  } catch (err) {
    log('Preview fetch failed for', albumId, err);
    previewCache.set(albumId, 'error');
    return 'error';
  }
}

async function onHover(card: HTMLAnchorElement): Promise<void> {
  const albumId = card.href.match(/\/a\/([A-Za-z0-9_-]+)/)?.[1];
  if (!albumId) return;

  const cached = previewCache.get(albumId);
  if (cached !== undefined) {
    showPopover(cached, card);
    return;
  }

  // Show loading state immediately, then replace once data arrives.
  showPopover('loading', card);
  const data = await fetchPreview(albumId);
  // Only update if the popover is still open (user hasn't moved away).
  if (activePopover) showPopover(data, card);
}

function attachHoverListeners(card: HTMLAnchorElement): void {
  if (card.dataset.bksHover) return;
  card.dataset.bksHover = '1';

  card.addEventListener('mouseenter', () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      void onHover(card);
    }, config.hoverPreview.delayMs);
  });

  card.addEventListener('mouseleave', () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    hoverTimer = null;
    removePopover();
  });
}

export function initHoverPreview(): void {
  injectStyles();

  observeAdded(document.body, 'a[href*="bunkr.cr/a/"]', (el) => {
    attachHoverListeners(el as HTMLAnchorElement);
  });
}
