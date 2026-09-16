import { config } from "../config";

export function getVisitedAlbums(): Set<string> {
  try {
    const raw = GM_getValue<string>(config.alreadySeen.storageKey, "[]");
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

export function addVisitedAlbum(albumId: string): void {
  const visited = getVisitedAlbums();
  if (visited.has(albumId)) return;
  visited.add(albumId);
  // Keep only the most-recent entries to cap storage size.
  const trimmed = [...visited].slice(-config.alreadySeen.maxTracked);
  GM_setValue(config.alreadySeen.storageKey, JSON.stringify(trimmed));
}

export function clearVisitedAlbums(): void {
  GM_setValue(config.alreadySeen.storageKey, "[]");
}
