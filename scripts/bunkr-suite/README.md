# Bunkr Suite

A single userscript that enhances both **balbums.st** (the album index) and **bunkr.cr** (the file host) with four complementary features.

## Features

### 1. Already-Seen Deduplication *(balbums.st)*
Dims album cards you have previously opened and overlays a small **Seen** badge. The history persists across browser sessions via `GM_setValue`. When you land on a bunkr.cr album page the album is automatically recorded so the badge appears next time it shows up in search results.

A **"Clear seen history"** menu command (accessible from the userscript manager icon) wipes all tracked IDs and restores every card to full opacity.

### 2. Hover Quick-Preview Panel *(balbums.st)*
Hovering an album card for 350 ms fetches the corresponding bunkr.cr album page in the background via `GM_xmlhttpRequest` (which bypasses the browser's CORS restriction) and shows a floating popover containing:
- Up to 12 thumbnails in a 3-column grid
- Album title
- File count

The popover positions itself to the right of the hovered card (or left if there is not enough viewport space) and is cached in-memory so subsequent hovers on the same card are instant.

### 3. CDN URL Reconstructor *(bunkr.cr — /v/* and /i/* pages)*
Bunkr uses signed CDN URLs (tokens fetched from `gb-apisign.cdn.cr`) to deliver media. Once the player has resolved the URL and set it on the `<video>` or `<img>` element, the script detects it via `MutationObserver` and injects a compact **bottom-right panel** with:

| Button | Action |
|--------|--------|
| **Copy URL** | Copies the raw CDN link to clipboard |
| **New Tab** | Opens the CDN URL directly (no player wrapper) |
| **Open VLC** | Launches via `vlc://` URI scheme (video pages only) |

The panel is dismissible. The VLC button requires VLC to be registered as a protocol handler for `vlc://`.

### 4. Album Stats Proxy *(bunkr.cr — /a/* pages)*
Injects an enhanced stats bar below the album title showing:
- **Video / image breakdown** — counts `.theItem` cards by their `/v/` or `/i/` link prefix
- **Video ratio** — percentage of files that are videos
- **API-sourced data** (when available from `s.bunkr.ru`): total view count, upload date

The bar re-counts automatically when infinite scroll appends more cards.

## Requirements

- [ScriptCat](https://scriptcat.org/) or [Tampermonkey](https://www.tampermonkey.net/)
- Chrome, Firefox, or Edge (modern version)

## Installation

1. Install ScriptCat or Tampermonkey.
2. Build the script (see [Development](#development)) or install a pre-built `bunkr-suite.js`.
3. Open the `.js` file — your userscript manager will prompt to install it.
4. Grant the requested permissions (`GM_xmlhttpRequest` for cross-origin fetches, `GM_getValue`/`GM_setValue` for history persistence, `GM_setClipboard` for the copy button).

## Configuration

Edit `src/config.ts` before building to change defaults:

| Option | Default | Description |
|--------|---------|-------------|
| `debug` | `false` | Enable console logging |
| `hoverPreview.delayMs` | `350` | Hover dwell time before fetching preview (ms) |
| `hoverPreview.maxThumbnails` | `12` | Maximum thumbnails shown in the popover |
| `alreadySeen.dimOpacity` | `"0.42"` | CSS opacity of seen cards (0–1) |
| `alreadySeen.maxTracked` | `10000` | Maximum album IDs stored before oldest are trimmed |

## Permissions

| Permission | Used by |
|-----------|---------|
| `GM_getValue` / `GM_setValue` | Already-seen history persistence |
| `GM_xmlhttpRequest` | Hover preview (cross-origin fetch of bunkr.cr from balbums.st) |
| `GM_setClipboard` | CDN Reconstructor "Copy URL" button |
| `GM_registerMenuCommand` | "Clear seen history" menu command |

**Connected domains:** `bunkr.cr`, `s.bunkr.ru`, `static.scdn.st`

## Architecture

```
src/
├── main.ts                     Entry point — routes by hostname/path
├── config.ts                   All tuneable defaults in one place
├── types.ts                    Shared TypeScript interfaces
├── features/
│   ├── already-seen.ts         Deduplication (balbums.st + bunkr.cr/a/*)
│   ├── hover-preview.ts        Quick-preview popover (balbums.st)
│   ├── cdn-reconstructor.ts    Direct link panel (bunkr.cr/v/* and /i/*)
│   └── album-stats.ts          Stats bar (bunkr.cr/a/*)
├── services/
│   ├── storage.ts              GM_getValue/GM_setValue wrappers
│   └── cross-fetch.ts          GM_xmlhttpRequest Promise wrapper
├── dom/
│   └── observer.ts             MutationObserver helpers
└── utils/
    └── log.ts                  Conditional debug logging
```

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
cd scripts/bunkr-suite
npm install
```

### Dev server

```bash
npm run dev
```

### Build

```bash
npm run build
```

Output: `dist/bunkr-suite.js`

### Type check

```bash
npm run typecheck
```

## Changelog

### 1.0.0

- Initial release with four features: already-seen deduplication, hover quick-preview, CDN URL reconstructor, album stats proxy
