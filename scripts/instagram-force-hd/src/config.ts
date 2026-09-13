export interface Config {
  debug: boolean;
  autoFullscreenOnOpen: boolean;
  gestureMaxAgeMs: number;
  readonly logPrefix: string;
}

export const config: Config = {
  debug: false,
  autoFullscreenOnOpen: true,
  gestureMaxAgeMs: 2500,
  logPrefix: '[IG Force HD]',
};
