import { config } from './config';

export function initSettings(): void {
  config.autoFullscreenOnOpen = GM_getValue('autoFullscreenOnOpen', config.autoFullscreenOnOpen);
}

export function registerMenuCommands(): void {
  const label = `Auto-fullscreen on open: ${config.autoFullscreenOnOpen ? 'ON' : 'OFF'} — click to toggle`;

  GM_registerMenuCommand(label, () => {
    const next = !config.autoFullscreenOnOpen;
    GM_setValue('autoFullscreenOnOpen', next);
    config.autoFullscreenOnOpen = next;
    location.reload();
  });
}
