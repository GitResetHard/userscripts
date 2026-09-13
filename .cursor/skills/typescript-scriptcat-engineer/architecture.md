# Architecture Reference

## Module structure by complexity

### Small script — single concern, minimal logic

```
src/
├── main.ts
└── utils.ts
```

Use this when the entire script fits comfortably in two files without either becoming hard to follow.

### Medium script — distinct concerns, moderate logic

```
src/
├── main.ts
├── config.ts
├── types.ts
└── utils.ts
```

Introduce `config.ts` when configuration values are referenced in multiple places. Introduce `types.ts` when type definitions are shared by more than one module.

### Large script — multiple features, significant logic

```
src/
├── main.ts
├── config.ts
├── constants.ts
├── types.ts
├── features/
│   ├── download.ts
│   └── overlay.ts
├── services/
│   └── api.ts
├── dom/
│   ├── elements.ts
│   └── observer.ts
├── storage/
│   └── index.ts
├── observers/
│   └── navigation.ts
└── utils/
    ├── url.ts
    └── format.ts
```

Introduce subdirectories only when there are multiple files in that concern.

## Module responsibilities

| Module / Directory | Responsibility |
|---|---|
| `main.ts` | Orchestration only — init, wire, start |
| `config.ts` | Load and expose configuration with defaults |
| `constants.ts` | Named constants reused across multiple modules |
| `types.ts` | Shared TypeScript interfaces and type aliases |
| `features/` | High-level feature implementations |
| `services/` | API clients, data fetching, external integrations |
| `dom/` | DOM queries, element factories, DOM utilities |
| `observers/` | MutationObserver setup and management |
| `storage/` | GM_setValue/getValue wrappers, persistence logic |
| `utils/` | Pure utility functions — URL parsing, formatting, etc. |

## `main.ts` pattern

```typescript
import { loadConfig } from './config';
import { VideoService } from './services/video';
import { initDownloadFeature } from './features/download';
import { observeNavigation } from './observers/navigation';

async function main(): Promise<void> {
  const config = loadConfig();
  const service = new VideoService(config.apiBase);

  observeNavigation(() => initDownloadFeature(service, config));
  initDownloadFeature(service, config);
}

main();
```

`main.ts` must not import DOM utilities directly to build UI — delegate to features. It must not contain `querySelector` calls except as a last resort at the top level.

## Dependency direction

Dependencies must flow in one direction:

```
main.ts
  ↓
features/  →  services/
  ↓              ↓
dom/          utils/
  ↓
utils/
```

`utils/` and `types.ts` may be imported by any module.  
`config.ts` and `constants.ts` may be imported by any module.  
`features/` must not import other `features/` directly — share through services or utils.  
`dom/` must not import `features/`.  
No circular imports.

## Config module pattern

```typescript
// config.ts
export interface Config {
  readonly apiBase: string;
  readonly maxRetries: number;
  readonly debug: boolean;
}

const DEFAULTS: Config = {
  apiBase: 'https://example.com/api',
  maxRetries: 3,
  debug: false,
};

export function loadConfig(): Config {
  return {
    ...DEFAULTS,
    debug: GM_getValue('debug', DEFAULTS.debug),
  };
}
```

## Types module pattern

```typescript
// types.ts — shared types only; do not add types used by a single module here
export interface VideoInfo {
  id: string;
  title: string;
  duration: number;
  sources: readonly VideoSource[];
}

export interface VideoSource {
  url: string;
  quality: string;
  format: string;
}

export type Quality = '1080p' | '720p' | '480p' | '360p';
```

## Storage module pattern

```typescript
// storage/index.ts
const KEYS = {
  settings: 'scriptcat_settings',
  lastRun: 'scriptcat_last_run',
} as const;

export interface Settings {
  autoDownload: boolean;
  preferredQuality: string;
}

const DEFAULT_SETTINGS: Settings = {
  autoDownload: false,
  preferredQuality: '1080p',
};

export function loadSettings(): Settings {
  const stored = GM_getValue<Partial<Settings>>(KEYS.settings, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(settings: Settings): void {
  GM_setValue(KEYS.settings, settings);
}
```

## Feature module pattern

```typescript
// features/download.ts
import type { Config } from '../config';
import type { VideoService } from '../services/video';
import { addDownloadButton } from '../dom/elements';

export function initDownloadFeature(
  service: VideoService,
  config: Config,
): void {
  const container = document.querySelector('.video-actions');
  if (!container) return;

  addDownloadButton(container, async () => {
    const info = await service.getVideoInfo(getCurrentVideoId());
    if (!info) return;
    startDownload(info, config);
  });
}

function getCurrentVideoId(): string {
  // URL parsing logic
  return new URL(location.href).searchParams.get('v') ?? '';
}

function startDownload(/* ... */): void {
  // implementation
}
```
