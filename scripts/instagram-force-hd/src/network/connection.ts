/** Spoof navigator.connection as a fast Wi-Fi link so Instagram serves HD. */
export function spoofNetworkHints(): void {
  const fake = {
    downlink: 10,
    downlinkMax: Infinity,
    effectiveType: '4g' as const,
    rtt: 50,
    saveData: false,
    type: 'wifi' as const,
    addEventListener(): void {},
    removeEventListener(): void {},
    dispatchEvent(): boolean {
      return false;
    },
    onchange: null as null,
  };

  for (const prop of ['connection', 'mozConnection', 'webkitConnection'] as const) {
    try {
      Object.defineProperty(navigator, prop, {
        configurable: true,
        get: () => fake,
      });
    } catch {
      // Some environments disallow redefining navigator properties; ignore.
    }
  }
}
