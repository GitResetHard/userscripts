# Reddit Cleaner

A userscript that lets you bulk unsubscribe from subreddits and remove upvotes from a single panel — no more doing it one-by-one.

## Features

- **View all subscriptions** — fetches every subreddit you follow, paginated automatically
- **View all upvoted posts** — fetches your upvote history (requires public upvotes in Reddit settings)
- **Filter** — instant search by subreddit name or post title/subreddit
- **Sort** — A→Z, Z→A, member count (subs) or newest/oldest/score (posts)
- **Bulk select** — checkbox per item, Select All, Deselect All
- **Batch unsubscribe / un-upvote** — confirmation step before any irreversible action; 350 ms delay between requests to respect Reddit's rate limits
- **Progress bar** — live progress during batch operations
- **Reload** — re-fetch data at any time without closing the panel
- Works on both **www.reddit.com** and **old.reddit.com**
- Runs inside a **Shadow DOM** — zero style conflicts with Reddit

## Requirements

- [ScriptCat](https://scriptcat.org/) or [Tampermonkey](https://www.tampermonkey.net/)
- Logged in to Reddit

## Important — Upvotes visibility

Reddit hides upvoted posts from the API unless you make them public:

> **Reddit Settings → Safety & Privacy → Content Visibility → Allow people to follow you ... and make your votes public**

Without this the Upvoted tab will show an "Upvotes are private" message.

## Installation

1. Install ScriptCat or Tampermonkey.
2. Build the script (see [Development](#development)) or install a pre-built `reddit-cleaner.js`.
3. Open the `.js` file — your userscript manager will prompt to install it.

## Usage

A **Reddit Cleaner** button (🧹, bottom-right corner) appears on every Reddit page. Click it or use the userscript manager menu command.

| Tab | What it does |
|-----|-------------|
| **Subscriptions** | Lists every subreddit you follow |
| **Upvoted** | Lists every post you've upvoted |

1. Filter / sort the list.
2. Check items (or click **Select All**).
3. Click **Unsubscribe (N)** / **Remove N upvotes**.
4. Confirm in the prompt that appears.
5. Watch the progress bar — processed items disappear from the list automatically.

## Configuration

Edit `src/config.ts` before building:

| Option | Default | Description |
|--------|---------|-------------|
| `debug` | `false` | Enable console logging |
| `api.pageSize` | `100` | Items per API page (Reddit max is 100) |
| `api.actionDelayMs` | `350` | Delay between batch actions (ms) |

## Permissions

| Permission | Used by |
|-----------|---------|
| `GM_getValue` / `GM_setValue` | Reserved for future preference persistence |
| `GM_registerMenuCommand` | "Open / Close" keyboard-accessible menu entry |

All Reddit API calls use the browser's existing session cookie (`credentials: 'include'`) — no OAuth or API key required.

## Architecture

```
src/
├── main.ts                 Entry point
├── config.ts               Tuneable defaults
├── types.ts                Shared TypeScript interfaces
├── api/
│   ├── auth.ts             GET /api/me.json — username + modhash
│   ├── subreddits.ts       GET /subreddits/mine/subscriber.json, POST /api/subscribe
│   └── votes.ts            GET /user/{name}/upvoted.json, POST /api/vote
├── ui/
│   ├── panel.ts            Shadow DOM panel, state management, all UI logic
│   └── styles.ts           CSS injected into Shadow DOM
└── utils/
    ├── fmt.ts              Number and relative-time formatting
    ├── log.ts              Debug-gated logging
    └── sleep.ts            Promise-based delay
```

## Development

```bash
cd scripts/reddit-cleaner
npm install
npm run build        # → dist/reddit-cleaner.js
npm run typecheck
npm run dev          # dev server for live reload
```

## Changelog

### 1.0.0
- Initial release: subscriptions tab, upvoted tab, filter, sort, bulk actions, progress tracking
