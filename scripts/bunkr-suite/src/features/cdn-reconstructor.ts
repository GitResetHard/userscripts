/**
 * CDN URL Reconstructor — Direct Link Injector
 *
 * On bunkr.cr file pages (/v/* for videos, /i/* for images):
 *
 *  1. Waits for the page to set the real CDN URL on a <video src>, <source src>,
 *     or <img src> element (Plyr fetches a signed token asynchronously before
 *     setting the src, so we observe the attribute change via MutationObserver).
 *  2. Falls back to the page's own download link href if a media element src
 *     is not found within the observation window.
 *  3. Injects a compact fixed panel (bottom-right) with:
 *       • Copy URL  — copies the raw CDN link to clipboard
 *       • New Tab   — opens the CDN URL directly in a new tab
 *       • Open VLC  — launches via vlc:// URI scheme (requires VLC installed
 *                     and registered as a protocol handler)
 *     The panel is dismissible and auto-skips the VLC button on image pages.
 */

import { log, warn } from '../utils/log';
import type { CDNLink } from '../types';

const PANEL_ID = 'bks-cdn-panel';

const STYLES = `
#${PANEL_ID} {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #15151a;
  border: 1px solid #25252d;
  border-radius: 12px;
  padding: 14px 16px;
  z-index: 99999;
  font-family: 'JetBrains Mono', monospace;
  color: #e8e8ec;
  box-shadow: 0 12px 48px rgba(0,0,0,0.82);
  max-width: 330px;
  animation: bks-cdn-in 0.18s cubic-bezier(.2,.8,.2,1) both;
}
@keyframes bks-cdn-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.bks-cdn-label {
  font-size: 9px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #5e5e6b;
  margin-bottom: 6px;
}
.bks-cdn-name {
  font-size: 10px;
  color: #9a9aa6;
  margin-bottom: 12px;
  word-break: break-all;
  line-height: 1.55;
  max-height: 46px;
  overflow: hidden;
}
.bks-cdn-btns {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  align-items: center;
}
.bks-cdn-btn {
  cursor: pointer;
  background: transparent;
  border: 1px solid #25252d;
  border-radius: 7px;
  padding: 6px 11px;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  color: #9a9aa6;
  line-height: 1;
  transition: border-color 0.18s, color 0.18s;
}
.bks-cdn-btn:hover { border-color: #5e5e6b; color: #e8e8ec; }
.bks-cdn-btn-close { margin-left: auto; padding: 6px 9px; color: #5e5e6b; }
.bks-cdn-btn-close:hover { color: #e8e8ec; }
`;

function injectStyles(): void {
  if (document.getElementById('bks-cdn-styles')) return;
  const s = document.createElement('style');
  s.id = 'bks-cdn-styles';
  s.textContent = STYLES;
  document.head.appendChild(s);
}

function extractFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split('/').filter(Boolean).pop() ?? 'file';
  } catch {
    return 'file';
  }
}

/**
 * Returns true when `url` looks like a CDN URL (not hosted on bunkr.cr itself).
 * Signed CDN URLs include `ex=` and `token=` query params.
 */
function isCDNUrl(url: string): boolean {
  if (!url.startsWith('http')) return false;
  try {
    const u = new URL(url);
    return !u.hostname.includes('bunkr.cr');
  } catch {
    return false;
  }
}

function showPanel(link: CDNLink): void {
  if (document.getElementById(PANEL_ID)) return;

  const panel = document.createElement('div');
  panel.id = PANEL_ID;

  const label = document.createElement('div');
  label.className = 'bks-cdn-label';
  label.textContent = 'Direct CDN Link';

  const name = document.createElement('div');
  name.className = 'bks-cdn-name';
  name.textContent = link.filename;
  name.title = link.url;

  const btns = document.createElement('div');
  btns.className = 'bks-cdn-btns';

  function makeBtn(text: string, extra = ''): HTMLButtonElement {
    const b = document.createElement('button');
    b.className = `bks-cdn-btn ${extra}`.trim();
    b.textContent = text;
    return b;
  }

  const copyBtn = makeBtn('Copy URL');
  copyBtn.addEventListener('click', () => {
    GM_setClipboard(link.url);
    copyBtn.textContent = 'Copied ✓';
    setTimeout(() => {
      copyBtn.textContent = 'Copy URL';
    }, 2000);
  });

  const newTabBtn = makeBtn('New Tab');
  newTabBtn.addEventListener('click', () => {
    window.open(link.url, '_blank');
  });

  const closeBtn = makeBtn('✕', 'bks-cdn-btn-close');
  closeBtn.title = 'Dismiss';
  closeBtn.addEventListener('click', () => panel.remove());

  btns.append(copyBtn, newTabBtn);

  if (link.isVideo) {
    const vlcBtn = makeBtn('Open VLC');
    vlcBtn.title = 'Requires VLC registered as a vlc:// protocol handler';
    vlcBtn.addEventListener('click', () => {
      window.location.href = `vlc://${link.url}`;
    });
    btns.appendChild(vlcBtn);
  }

  btns.appendChild(closeBtn);
  panel.append(label, name, btns);
  document.body.appendChild(panel);
  log('CDN panel injected for:', link.filename);
}

function tryFind(): boolean {
  const isVideo = window.location.pathname.startsWith('/v/');

  // 1. Download anchor (most reliable — the page puts the CDN URL here).
  const dlAnchor = document.querySelector<HTMLAnchorElement>('a[download][href]');
  if (dlAnchor?.href && isCDNUrl(dlAnchor.href)) {
    showPanel({ url: dlAnchor.href, filename: extractFilename(dlAnchor.href), isVideo });
    return true;
  }

  if (isVideo) {
    // 2. <video src="...">
    const video = document.querySelector<HTMLVideoElement>('video[src]');
    if (video?.src && isCDNUrl(video.src)) {
      showPanel({ url: video.src, filename: extractFilename(video.src), isVideo: true });
      return true;
    }
    // 3. <source src="..."> inside <video>
    const source = document.querySelector<HTMLSourceElement>('video source[src]');
    if (source?.src && isCDNUrl(source.src)) {
      showPanel({ url: source.src, filename: extractFilename(source.src), isVideo: true });
      return true;
    }
  } else {
    // 4. Main content image on /i/* pages.
    //    Signed CDN image URLs contain `ex=` and `token=` params.
    const img = document.querySelector<HTMLImageElement>(
      'img[src*="ex="][src*="token="], .image-container img[src], main img[src]',
    );
    if (img?.src && isCDNUrl(img.src)) {
      showPanel({ url: img.src, filename: extractFilename(img.src), isVideo: false });
      return true;
    }
  }

  return false;
}

export function initCDNReconstructor(): void {
  injectStyles();

  if (tryFind()) return;

  // Plyr fetches the signed token and sets video src asynchronously.
  // Watch for src/href attribute changes on any element in the document.
  const obs = new MutationObserver(() => {
    if (tryFind()) obs.disconnect();
  });

  obs.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'href'],
  });

  const TIMEOUT_MS = 20_000;
  setTimeout(() => {
    obs.disconnect();
    if (!document.getElementById(PANEL_ID)) {
      warn('CDN URL not detected within', TIMEOUT_MS, 'ms — panel not shown');
    }
  }, TIMEOUT_MS);
}
