/**
 * GM_xmlhttpRequest wrappers that bypass same-origin restrictions.
 * Required for fetching bunkr.cr pages from balbums.st context (hover preview)
 * and for hitting bunkr APIs without CORS rejections.
 */

export function gmFetch(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      timeout: 12_000,
      headers: { Accept: "text/html,application/json,*/*" },
      onload(r) {
        if (r.status >= 400) {
          reject(new Error(`HTTP ${r.status}: ${url}`));
        } else {
          resolve(r.responseText);
        }
      },
      onerror() {
        reject(new Error(`Network error fetching: ${url}`));
      },
      ontimeout() {
        reject(new Error(`Timeout fetching: ${url}`));
      },
    });
  });
}

export function gmFetchJson<T>(url: string): Promise<T> {
  return gmFetch(url).then((text) => JSON.parse(text) as T);
}
