import { highestFromSrcset, findUpgradeUrl } from '../media/quality';
import { ensureFsButton } from '../fullscreen/index';
import { log } from '../utils/log';

export function upgradeImageElement(img: HTMLImageElement): void {
  if (img.dataset.igForceHd === '1') return;

  const srcset = img.getAttribute('srcset');
  if (srcset) {
    const best = highestFromSrcset(srcset);
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    if (best && img.src !== best) img.src = best;
  }

  img.dataset.igForceHd = '1';
}

export function maybeUpgradeVideoElement(video: HTMLVideoElement): void {
  if (video.dataset.igForceHd === '1') return;

  const current = video.currentSrc || video.src;
  if (!current) return;

  const better = findUpgradeUrl(current);
  if (!better) return;

  const wasPaused = video.paused;
  const t = video.currentTime;
  video.src = better;
  video.dataset.igForceHd = '1';

  video.addEventListener(
    'loadedmetadata',
    () => {
      try {
        if (t > 0) video.currentTime = t;
      } catch {
        // Seek position may be out of range on the new source; ignore.
      }
      if (!wasPaused) video.play().catch(() => {});
    },
    { once: true },
  );

  log('upgraded video element src');
}

export function prepareVideo(video: HTMLVideoElement): void {
  maybeUpgradeVideoElement(video);
  ensureFsButton(video);
}

export function scanDom(root: ParentNode = document): void {
  root.querySelectorAll<HTMLImageElement>('img').forEach(upgradeImageElement);
  root.querySelectorAll<HTMLVideoElement>('video').forEach(prepareVideo);
}
