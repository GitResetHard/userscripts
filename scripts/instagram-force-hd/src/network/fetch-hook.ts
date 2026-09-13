import { rewriteJsonText } from '../media/rewriter';
import { pruneDashManifest } from '../media/dash';
import { shouldTouchUrl } from '../utils/url';
import { log } from '../utils/log';

export function hookFetch(): void {
  const originalFetch = window.fetch;
  if (typeof originalFetch !== 'function') return;

  window.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const url =
      input instanceof URL
        ? input.href
        : typeof input === 'string'
          ? input
          : input.url;

    const response = await originalFetch.call(this, input, init);
    if (!shouldTouchUrl(url)) return response;

    try {
      const clone = response.clone();
      const contentType = clone.headers.get('content-type') ?? '';

      if (
        contentType.includes('application/json') ||
        url.includes('graphql') ||
        url.includes('/api/')
      ) {
        const text = await clone.text();
        const rewritten = rewriteJsonText(text);
        if (rewritten != null) {
          return new Response(rewritten, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }
      }

      if (
        contentType.includes('application/dash+xml') ||
        contentType.includes('application/xml') ||
        url.includes('.mpd')
      ) {
        const text = await clone.text();
        const pruned = pruneDashManifest(text);
        if (pruned !== text) {
          return new Response(pruned, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }
      }
    } catch (err) {
      log('fetch rewrite failed', err);
    }

    return response;
  };
}
