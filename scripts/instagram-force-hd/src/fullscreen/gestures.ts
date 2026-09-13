import {
  toggleFullscreen,
  exitFullscreen,
  getBestVisibleVideo,
  getLastFullscreenVideo,
  isCssFullscreenActive,
  setLastGestureAt,
} from './index';

/**
 * Marks every pointer/keyboard/touch event as a user gesture (for auto-fullscreen
 * timing) and wires up keyboard shortcuts for fullscreen control.
 */
export function bindGestureTracking(): void {
  const markGesture = (): void => setLastGestureAt(Date.now());
  for (const type of ['pointerdown', 'click', 'keydown', 'touchstart'] as const) {
    window.addEventListener(type, markGesture, true);
  }

  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        const video = getBestVisibleVideo() ?? getLastFullscreenVideo();
        if (!video) return;
        e.preventDefault();
        void toggleFullscreen(video);
        return;
      }

      // Escape is handled natively for the Fullscreen API; only handle CSS fallback.
      if (e.key === 'Escape' && isCssFullscreenActive()) {
        void exitFullscreen(getLastFullscreenVideo());
      }
    },
    true,
  );
}
