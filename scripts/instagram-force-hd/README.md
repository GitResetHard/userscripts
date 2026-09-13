# Instagram Force HD Media

Forces Instagram to serve the highest available quality for photos and videos, and adds fullscreen support for videos.

## Features

- **HD videos** — intercepts Instagram API responses (fetch + XHR) and keeps only the highest-quality progressive rendition; prunes DASH manifests to the highest-bandwidth representation
- **HD images** — strips lower-resolution `srcset` candidates so only the best URL is served
- **Connection spoofing** — reports the connection as fast Wi-Fi so Instagram's quality ladder starts at the top
- **Fullscreen button** — every video gets an overlay button to enter/exit fullscreen
- **Double-click** to toggle fullscreen on any video
- **`F` key** to fullscreen the largest visible video
- **`Esc`** to exit CSS-based fullscreen fallback
- **Auto-fullscreen** when a video starts playing after a user gesture (configurable)
- **Reel following** — when swiping Reels while fullscreen, fullscreen follows the new active video

## Requirements

- [ScriptCat](https://scriptcat.org/) or Tampermonkey
- Chrome, Firefox, or Edge (modern version)

## Installation

1. Install [ScriptCat](https://scriptcat.org/) or [Tampermonkey](https://www.tampermonkey.net/)
2. Build the script (see [Development](#development)) or download a pre-built `instagram-force-hd.user.js`
3. Open the `.user.js` file — your userscript manager will prompt to install it

## Usage

Browse Instagram normally. HD quality is applied automatically on every page load.

| Action | Trigger |
|--------|---------|
| Toggle fullscreen | Click the ⛶ button on a video |
| Toggle fullscreen | Double-click a video |
| Fullscreen best visible video | Press `F` |
| Exit CSS fullscreen | Press `Esc` |

## Configuration

Edit `src/config.ts` before building:

| Option | Default | Description |
|--------|---------|-------------|
| `debug` | `false` | Print debug messages to the browser console |
| `autoFullscreenOnOpen` | `true` | Auto-enter fullscreen when a video starts after a gesture |
| `gestureMaxAgeMs` | `2500` | Maximum gesture age (ms) that qualifies for auto-fullscreen |

## Permissions

`@grant none` — no special browser or userscript permissions required.

## Architecture

```
src/
├── main.ts              Entry point — orchestration only
├── config.ts            Configuration with defaults
├── types.ts             Shared TypeScript interfaces and global augmentations
├── media/
│   ├── quality.ts       Video/image quality scoring, selection, and caching
│   ├── dash.ts          DASH manifest pruning
│   └── rewriter.ts      JSON API response walking and rewriting
├── network/
│   ├── fetch-hook.ts    fetch() interception
│   ├── xhr-hook.ts      XMLHttpRequest interception
│   └── connection.ts    navigator.connection spoofing
├── fullscreen/
│   ├── index.ts         Fullscreen state, enter/exit, button injection, styles
│   └── gestures.ts      Keyboard shortcuts and gesture tracking
├── dom/
│   ├── observer.ts      MutationObserver setup
│   └── upgrade.ts       Image and video element upgrading + DOM scanning
└── utils/
    ├── log.ts           Conditional debug logging
    └── url.ts           URL filter (shouldTouchUrl)
```

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
cd scripts/instagram-force-hd
npm install
```

### Dev server

```bash
npm run dev
```

Vite starts a dev server. Install the served URL via your userscript manager to get live reloading.

### Build

```bash
npm run build
```

Output: `dist/instagram-force-hd.user.js`

### Type check

```bash
npm run typecheck
```

### Format

```bash
npm run format
```

Check only (CI):

```bash
npm run format:check
```

## Changelog

### 1.2.0

- Modular TypeScript rewrite with full separation of concerns
- Fullscreen button injected on every video
- Double-click, `F` key, and auto-fullscreen support
- CSS fullscreen fallback for cases where the Fullscreen API is unavailable
- Reel swipe fullscreen following
- DASH manifest pruning added
- Connection spoofing added
