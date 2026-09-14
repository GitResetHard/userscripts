import { config } from '../config';

export function log(...args: unknown[]): void {
  if (config.debug) console.log(config.logPrefix, ...args);
}

export function warn(...args: unknown[]): void {
  console.warn(config.logPrefix, ...args);
}
