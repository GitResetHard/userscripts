import type { VideoVersion, ImageCandidate, MediaNode } from '../types';

/**
 * Stores the best-known progressive video URL indexed by every identifier
 * (id, pk, code, shortcode) seen on the same media node from API responses.
 * Used later to upgrade video elements whose src points to a lower rendition.
 */
const bestVideoByKey = new Map<string, string>();

function scoreDims(width: number | undefined, height: number | undefined): number {
  return (Number(width) || 0) * (Number(height) || 0);
}

export function pickBestVideoVersion(versions: VideoVersion[]): VideoVersion | null {
  if (versions.length === 0) return null;
  let best: VideoVersion | null = null;
  let bestScore = -1;
  for (const v of versions) {
    if (typeof v.url !== 'string') continue;
    const score = scoreDims(v.width, v.height) || Number(v.bandwidth) || 0;
    if (score >= bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
}

export function rememberVideo(node: MediaNode, best: VideoVersion): void {
  if (!best.url) return;
  const keys = [node.id, node.pk, node.code, node.shortcode, best.id]
    .filter((k): k is string | number => k != null)
    .map(String);
  for (const key of keys) bestVideoByKey.set(key, best.url);
}

export function upgradeImageCandidates(candidates: ImageCandidate[]): boolean {
  if (candidates.length < 2) return false;
  const best = candidates.reduce((a, b) =>
    scoreDims(b.width, b.height) >= scoreDims(a.width, a.height) ? b : a,
  );
  if (!best.url) return false;
  candidates.splice(0, candidates.length, best);
  return true;
}

/** Pick the highest-resolution URL from an `img` srcset string. */
export function highestFromSrcset(srcset: string): string | null {
  let bestUrl: string | null = null;
  let bestScore = -1;
  for (const part of srcset.split(',')) {
    const bits = part.trim().split(/\s+/);
    const url = bits[0];
    if (!url) continue;
    const score = parseFloat(bits[1] ?? '') || 0;
    if (score >= bestScore) {
      bestScore = score;
      bestUrl = url;
    }
  }
  return bestUrl;
}

/**
 * Looks up a better progressive URL for a video element whose current src
 * appears to be a low-quality CDN rendition. Returns null if no upgrade applies.
 */
export function findUpgradeUrl(currentSrc: string): string | null {
  if (!/cdninstagram\.com|fbcdn\.net/.test(currentSrc)) return null;
  const isLow =
    /_(?:240|270|360|480|540)(?:w|p)?_/.test(currentSrc) ||
    /\/s\d+x\d+\//.test(currentSrc);
  if (!isLow) return null;

  for (const url of bestVideoByKey.values()) {
    if (!url || url === currentSrc) continue;
    if (!/cdninstagram\.com|fbcdn\.net/.test(url)) continue;
    return url;
  }
  return null;
}

export function scoreDisplayResource(r: { config_width?: number; config_height?: number }): number {
  return scoreDims(r.config_width, r.config_height);
}
