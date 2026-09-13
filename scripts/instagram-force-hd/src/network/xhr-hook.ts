import { rewriteJsonText } from '../media/rewriter';
import { shouldTouchUrl } from '../utils/url';
import { log } from '../utils/log';

const requestUrls = new WeakMap<XMLHttpRequest, string>();

export function hookXHR(): void {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  // Cast to accept both open() overloads while passing all args through unchanged.
  (XMLHttpRequest.prototype as { open: unknown }).open = function (
    this: XMLHttpRequest,
    method: string,
    url: string | URL,
    async = true,
    username?: string | null,
    password?: string | null,
  ): void {
    requestUrls.set(this, String(url));
    originalOpen.call(this, method, url, async, username, password);
  };

  XMLHttpRequest.prototype.send = function (
    this: XMLHttpRequest,
    body?: Document | XMLHttpRequestBodyInit | null,
  ): void {
    if (shouldTouchUrl(requestUrls.get(this))) {
      this.addEventListener(
        'readystatechange',
        function (this: XMLHttpRequest) {
          if (this.readyState !== XMLHttpRequest.DONE) return;
          if (typeof this.responseText !== 'string') return;
          const rewritten = rewriteJsonText(this.responseText);
          if (rewritten == null) return;
          try {
            Object.defineProperty(this, 'responseText', {
              configurable: true,
              get: () => rewritten,
            });
            Object.defineProperty(this, 'response', {
              configurable: true,
              get: () => rewritten,
            });
          } catch (err) {
            log('xhr rewrite failed', err);
          }
        },
        { once: true },
      );
    }
    originalSend.call(this, body);
  };
}
