import { upgradeImageElement, prepareVideo, scanDom } from './upgrade';
import { injectFullscreenStyles } from '../fullscreen/index';

export function observeDom(): void {
  const start = (): void => {
    injectFullscreenStyles();
    scanDom(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          const target = mutation.target;

          if (
            target instanceof HTMLImageElement &&
            (mutation.attributeName === 'srcset' || mutation.attributeName === 'src')
          ) {
            delete target.dataset.igForceHd;
            upgradeImageElement(target);
          }

          if (
            target instanceof HTMLVideoElement &&
            (mutation.attributeName === 'src' || mutation.attributeName === 'srcObject')
          ) {
            delete target.dataset.igForceHd;
            prepareVideo(target);
          }
        }

        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node instanceof HTMLImageElement) upgradeImageElement(node);
          else if (node instanceof HTMLVideoElement) prepareVideo(node);
          else if (node instanceof Element) scanDom(node);
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'srcset', 'srcObject'],
    });
  };

  // @run-at document-start: documentElement is typically available, but guard
  // against the rare case it is not yet present.
  if (document.documentElement) {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  }
}
