# Code Patterns Reference

## MutationObserver — basic

```typescript
// observers/dom.ts
export function observeElement(
  selector: string,
  callback: (element: Element) => void,
): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches(selector)) callback(node);
        node.querySelectorAll(selector).forEach(callback);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}
```

## MutationObserver — wait for element

```typescript
export function waitForElement<T extends Element>(
  selector: string,
  timeout = 10_000,
): Promise<T | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector<T>(selector);
    if (existing) { resolve(existing); return; }

    const timer = setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);

    const observer = new MutationObserver(() => {
      const el = document.querySelector<T>(selector);
      if (!el) return;
      clearTimeout(timer);
      observer.disconnect();
      resolve(el);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}
```

## SPA navigation — history API

```typescript
// observers/navigation.ts
export function observeNavigation(callback: (url: string) => void): void {
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = (...args) => {
    originalPushState(...args);
    callback(location.href);
  };

  history.replaceState = (...args) => {
    originalReplaceState(...args);
    callback(location.href);
  };

  window.addEventListener('popstate', () => callback(location.href));
}
```

## SPA navigation — site-specific events (YouTube example)

```typescript
document.addEventListener('yt-navigate-finish', () => {
  initFeature();
});
```

Prefer site-specific navigation events over patching `history` when the target site emits them.

## DOM — defensive element access

```typescript
// dom/elements.ts
export function getRequiredElement<T extends Element>(
  selector: string,
  context: ParentNode = document,
): T | null {
  const el = context.querySelector<T>(selector);
  if (!el) {
    console.warn(`[ScriptName] Element not found: ${selector}`);
  }
  return el;
}

export function createButton(
  label: string,
  onClick: () => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}
```

## Network requests — GM_xmlhttpRequest wrapper

```typescript
// services/http.ts
export function get<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url,
      responseType: 'json',
      onload: (response) => {
        if (response.status >= 200 && response.status < 300) {
          resolve(response.response as T);
        } else {
          reject(new Error(`HTTP ${response.status}: ${url}`));
        }
      },
      onerror: () => reject(new Error(`Network error: ${url}`)),
    });
  });
}
```

## URL parsing

```typescript
// utils/url.ts
export function getQueryParam(key: string, url = location.href): string | null {
  try {
    return new URL(url).searchParams.get(key);
  } catch {
    return null;
  }
}

export function matchesPattern(url: string, pattern: string): boolean {
  // Simple wildcard match — replace with regex if needed
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  return regex.test(url);
}
```

## Typed DOM queries

```typescript
// Always use generics — never cast
const video = document.querySelector<HTMLVideoElement>('video');
const input = document.querySelector<HTMLInputElement>('#search');
const links = document.querySelectorAll<HTMLAnchorElement>('a.result');

// Narrow before use
if (video) {
  video.play(); // video is HTMLVideoElement here
}
```

## Type narrowing over assertions

```typescript
// ✅ Narrow
function handleEvent(target: EventTarget | null): void {
  if (!(target instanceof HTMLButtonElement)) return;
  target.disabled = true; // correctly typed
}

// ❌ Avoid
function handleEvent(target: EventTarget | null): void {
  (target as HTMLButtonElement).disabled = true; // unsafe
}
```

## Userscript metadata template

```typescript
// ==UserScript==
// @name         Script Name
// @namespace    https://github.com/yourname/userscripts
// @version      1.0.0
// @description  What the script does
// @author       Your Name
// @match        https://example.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==
```

Grant only what is used. `GM_xmlhttpRequest` requires an explicit `@connect` for each domain.

## Cleanup on unload

```typescript
const observers: MutationObserver[] = [];
const controllers: AbortController[] = [];

function cleanup(): void {
  observers.forEach((o) => o.disconnect());
  controllers.forEach((c) => c.abort());
  observers.length = 0;
  controllers.length = 0;
}

window.addEventListener('beforeunload', cleanup);

// Using AbortController for event listeners
const controller = new AbortController();
controllers.push(controller);
document.addEventListener('click', handler, { signal: controller.signal });
```

## Logging utility

```typescript
// utils/log.ts
const PREFIX = '[ScriptName]';

export const log = {
  info: (...args: unknown[]) => console.log(PREFIX, ...args),
  warn: (...args: unknown[]) => console.warn(PREFIX, ...args),
  error: (...args: unknown[]) => console.error(PREFIX, ...args),
  debug: (...args: unknown[]) => {
    if (GM_getValue('debug', false)) console.debug(PREFIX, ...args);
  },
};
```

## Error handling pattern

```typescript
async function fetchVideoInfo(id: string): Promise<VideoInfo | null> {
  try {
    return await api.get<VideoInfo>(`/video/${id}`);
  } catch (err) {
    log.error('Failed to fetch video info', id, err);
    return null;
  }
}
```

Return `null` (or a `Result` type) rather than letting errors propagate unhandled into UI code.

## Vite config for userscript output

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Script Name',
        namespace: 'https://github.com/yourname/userscripts',
        version: '1.0.0',
        description: 'What the script does',
        match: ['https://example.com/*'],
        grant: ['GM_getValue', 'GM_setValue'],
      },
    }),
  ],
});
```
