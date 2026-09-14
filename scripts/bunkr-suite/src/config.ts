export const config = {
  debug: false,
  logPrefix: '[BunkrSuite]',

  hoverPreview: {
    /** Milliseconds of hover dwell before fetching the album preview. */
    delayMs: 350,
    /** Max thumbnails shown in the preview popover. */
    maxThumbnails: 12,
  },

  alreadySeen: {
    storageKey: 'bks_visited',
    /** CSS opacity applied to seen album cards (0–1). */
    dimOpacity: '0.42',
    /** Cap on stored album IDs to prevent unbounded growth. */
    maxTracked: 10_000,
  },
} as const;
