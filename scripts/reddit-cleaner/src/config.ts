export const config = {
  debug: false,
  logPrefix: '[RedditCleaner]',
  api: {
    /** Items per paginated API request (max Reddit allows is 100). */
    pageSize: 100,
    /** Delay between consecutive POST actions to respect rate limits (ms). */
    actionDelayMs: 350,
  },
} as const;
