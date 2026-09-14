/**
 * Lightweight MutationObserver helpers used by all features.
 */

/**
 * Calls `callback` for every element matching `selector` that is added to
 * `root`'s subtree, including elements already present at call time.
 */
export function observeAdded(
  root: Node,
  selector: string,
  callback: (el: Element) => void,
): MutationObserver {
  // Process elements already in the DOM.
  if (root instanceof Element || root instanceof Document) {
    (root as Element).querySelectorAll?.(selector).forEach(callback);
  }

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches(selector)) callback(node);
        node.querySelectorAll(selector).forEach(callback);
      }
    }
  });

  obs.observe(root, { childList: true, subtree: true });
  return obs;
}

/**
 * Resolves when `selector` matches an element in the document, or rejects
 * after `timeout` ms.
 */
export function waitForElement<T extends Element>(
  selector: string,
  timeout = 15_000,
): Promise<T> {
  const existing = document.querySelector<T>(selector);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const obs = new MutationObserver(() => {
      const found = document.querySelector<T>(selector);
      if (found) {
        obs.disconnect();
        resolve(found);
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(() => {
      obs.disconnect();
      reject(new Error(`Timed out waiting for: ${selector}`));
    }, timeout);
  });
}
