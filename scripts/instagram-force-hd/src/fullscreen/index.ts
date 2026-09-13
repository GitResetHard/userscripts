import { config } from '../config';
import { log } from '../utils/log';

// --- Module state ---

let lastGestureAt = 0;
let lastFullscreenVideo: HTMLVideoElement | null = null;
let cssFullscreenActive = false;

export function setLastGestureAt(time: number): void {
  lastGestureAt = time;
}

export function getLastFullscreenVideo(): HTMLVideoElement | null {
  return lastFullscreenVideo;
}

export function isCssFullscreenActive(): boolean {
  return cssFullscreenActive;
}

// --- Fullscreen detection ---

function isNativeFullscreen(video: HTMLVideoElement): boolean {
  const fsEl =
    document.fullscreenElement ??
    document.webkitFullscreenElement ??
    document.msFullscreenElement;
  return !!fsEl && (fsEl === video || fsEl.contains(video));
}

export function isFullscreen(video: HTMLVideoElement): boolean {
  return isNativeFullscreen(video) || (cssFullscreenActive && lastFullscreenVideo === video);
}

// --- CSS fullscreen fallback ---

function exitCssFullscreen(): void {
  lastFullscreenVideo?.classList.remove('ig-force-hd-css-fs');
  document.body?.classList.remove('ig-force-hd-css-fs-lock');
  cssFullscreenActive = false;
}

// --- Native fullscreen ---

async function enterNativeFullscreen(el: Element): Promise<boolean> {
  const req =
    el.requestFullscreen.bind(el) ??
    el.webkitRequestFullscreen?.bind(el) ??
    el.webkitEnterFullscreen?.bind(el) ??
    el.msRequestFullscreen?.bind(el);
  if (!req) return false;
  try {
    await req();
    return true;
  } catch (err) {
    log('native fullscreen failed', err);
    return false;
  }
}

async function exitNativeFullscreen(): Promise<void> {
  const exit =
    document.exitFullscreen.bind(document) ??
    document.webkitExitFullscreen?.bind(document) ??
    document.msExitFullscreen?.bind(document);
  if (!exit) return;
  try {
    await exit();
  } catch {
    // Ignore — already exited or unavailable.
  }
}

// --- Public fullscreen operations ---

export async function enterFullscreen(video: HTMLVideoElement): Promise<void> {
  lastFullscreenVideo = video;
  injectFullscreenStyles();

  const ok = await enterNativeFullscreen(video);
  if (ok) {
    exitCssFullscreen();
    updateFsButton(video);
    log('entered native fullscreen');
    return;
  }

  // CSS fallback when the browser blocks the Fullscreen API outside a gesture.
  document.querySelectorAll<HTMLVideoElement>('video.ig-force-hd-css-fs').forEach((v) => {
    v.classList.remove('ig-force-hd-css-fs');
  });
  video.classList.add('ig-force-hd-css-fs');
  document.body?.classList.add('ig-force-hd-css-fs-lock');
  cssFullscreenActive = true;
  updateFsButton(video);
  log('entered CSS fullscreen fallback');
}

export async function exitFullscreen(video: HTMLVideoElement | null): Promise<void> {
  if (document.fullscreenElement != null || document.webkitFullscreenElement != null) {
    await exitNativeFullscreen();
  }
  exitCssFullscreen();
  if (video) updateFsButton(video);
  log('exited fullscreen');
}

export async function toggleFullscreen(video: HTMLVideoElement | null): Promise<void> {
  if (!video) return;
  if (isFullscreen(video)) await exitFullscreen(video);
  else await enterFullscreen(video);
}

// --- Video visibility heuristic ---

export function isPrimaryVideo(video: HTMLVideoElement): boolean {
  const rect = video.getBoundingClientRect();
  if (rect.width < 160 || rect.height < 160) return false;

  const vw = window.innerWidth || document.documentElement.clientWidth;
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const visibleW = Math.min(rect.right, vw) - Math.max(rect.left, 0);
  const visibleH = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
  if (visibleW <= 0 || visibleH <= 0) return false;

  const visibleArea = visibleW * visibleH;
  if (visibleArea / (rect.width * rect.height) < 0.45) return false;
  return visibleArea >= vw * vh * 0.18 || rect.height >= vh * 0.45;
}

export function getBestVisibleVideo(): HTMLVideoElement | null {
  const videos = [...document.querySelectorAll<HTMLVideoElement>('video')].filter(isPrimaryVideo);
  if (videos.length === 0) return null;
  return (
    videos.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return br.width * br.height - ar.width * ar.height;
    })[0] ?? null
  );
}

// --- Fullscreen button ---

function fsIcon(expanded: boolean): string {
  return expanded
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 9H4V7h3V4h2v5zm6 0V4h2v3h3v2h-5zm0 6h5v2h-3v3h-2v-5zm-6 0v5H7v-3H4v-2h5z"/></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5v2H6v3H4zm10-5h5v5h-2V6h-3V4zM4 15h2v3h3v2H4v-5zm16 0v5h-5v-2h3v-3h2z"/></svg>`;
}

function updateFsButton(video: HTMLVideoElement): void {
  const btn = video.parentElement?.querySelector<HTMLButtonElement>(
    ':scope > .ig-force-hd-fs-btn',
  );
  if (!btn) return;
  const expanded = isFullscreen(video);
  btn.innerHTML = fsIcon(expanded);
  const label = expanded ? 'Exit fullscreen (F / Esc)' : 'Fullscreen (F)';
  btn.title = label;
  btn.setAttribute('aria-label', label);
}

export function injectFullscreenStyles(): void {
  if (document.getElementById('ig-force-hd-fs-style')) return;
  const style = document.createElement('style');
  style.id = 'ig-force-hd-fs-style';
  style.textContent = `
    .ig-force-hd-fs-btn {
      position: absolute; right: 12px; bottom: 12px; z-index: 2147483646;
      width: 40px; height: 40px; border: 0; border-radius: 999px;
      background: rgba(0,0,0,0.55); color: #fff; cursor: pointer;
      display: grid; place-items: center; padding: 0; opacity: 0.85;
      transition: opacity 120ms ease, transform 120ms ease;
    }
    .ig-force-hd-fs-btn:hover { opacity: 1; transform: scale(1.04); }
    .ig-force-hd-fs-btn svg { width: 20px; height: 20px; fill: currentColor; }
    .ig-force-hd-fs-host { position: relative !important; }
    video.ig-force-hd-css-fs {
      position: fixed !important; inset: 0 !important;
      width: 100vw !important; height: 100vh !important;
      max-width: none !important; max-height: none !important;
      object-fit: contain !important; background: #000 !important;
      z-index: 2147483645 !important;
    }
    body.ig-force-hd-css-fs-lock { overflow: hidden !important; }
  `;
  (document.head ?? document.documentElement).appendChild(style);
}

/**
 * Attaches the fullscreen button and all video-level event listeners to a
 * video element. Idempotent — safe to call multiple times on the same element.
 */
export function ensureFsButton(video: HTMLVideoElement): void {
  if (video.dataset.igFsBound === '1') return;
  video.dataset.igFsBound = '1';

  injectFullscreenStyles();

  const host = video.parentElement;
  if (host && getComputedStyle(host).position === 'static') {
    host.classList.add('ig-force-hd-fs-host');
  }

  if (host && !host.querySelector(':scope > .ig-force-hd-fs-btn')) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ig-force-hd-fs-btn';
    btn.innerHTML = fsIcon(false);
    btn.title = 'Fullscreen (F)';
    btn.setAttribute('aria-label', 'Fullscreen (F)');
    btn.addEventListener(
      'click',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        lastGestureAt = Date.now();
        void toggleFullscreen(video);
      },
      true,
    );
    host.appendChild(btn);
  }

  if (video.dataset.igFsEvents === '1') return;
  video.dataset.igFsEvents = '1';

  video.addEventListener(
    'dblclick',
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      lastGestureAt = Date.now();
      void toggleFullscreen(video);
    },
    true,
  );

  video.addEventListener('playing', () => {
    if (!config.autoFullscreenOnOpen) return;
    if (Date.now() - lastGestureAt > config.gestureMaxAgeMs) return;
    if (isFullscreen(video)) return;
    if (!isPrimaryVideo(video)) return;
    void enterFullscreen(video);
  });

  // When swiping Reels while already in fullscreen, follow the new active video.
  video.addEventListener('play', () => {
    if (!lastFullscreenVideo) return;
    if (!isFullscreen(lastFullscreenVideo) && !cssFullscreenActive && document.fullscreenElement == null) return;
    if (video === lastFullscreenVideo) return;
    if (!isPrimaryVideo(video)) return;
    void enterFullscreen(video);
  });
}

/** Bind the fullscreenchange event to keep the button icon in sync. */
export function bindFullscreenChangeListener(): void {
  const onchange = (): void => {
    if (lastFullscreenVideo) updateFsButton(lastFullscreenVideo);
    // If native FS was closed externally (Esc, browser UI), clear any CSS state.
    if (document.fullscreenElement == null && document.webkitFullscreenElement == null) {
      exitCssFullscreen();
    }
  };
  document.addEventListener('fullscreenchange', onchange);
  document.addEventListener('webkitfullscreenchange', onchange);
}
