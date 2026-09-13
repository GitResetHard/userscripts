export const config = {
  /** Enable debug logging to the browser console. */
  debug: false,
  /** Auto-enter fullscreen when a video starts playing after a user gesture. */
  autoFullscreenOnOpen: true,
  /** Maximum age (ms) of a user gesture that qualifies for auto-fullscreen. */
  gestureMaxAgeMs: 2500,
  logPrefix: '[IG Force HD]',
} as const;

export type Config = typeof config;
