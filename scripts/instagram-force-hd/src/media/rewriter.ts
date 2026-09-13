import type { MediaNode, DisplayResource } from '../types';
import {
  pickBestVideoVersion,
  rememberVideo,
  upgradeImageCandidates,
  scoreDisplayResource,
} from './quality';
import { pruneDashManifest } from './dash';
import { log } from '../utils/log';

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function rewriteNode(node: MediaNode): boolean {
  let changed = false;

  if (Array.isArray(node.video_versions)) {
    const best = pickBestVideoVersion(node.video_versions);
    if (best) {
      rememberVideo(node, best);
      node.video_versions = [best];
      if (typeof node.video_url === 'string') node.video_url = best.url;
      changed = true;
    }
  }

  for (const key of ['video_dash_manifest', 'dash_manifest'] as const) {
    const manifest = node[key];
    if (typeof manifest === 'string') {
      const pruned = pruneDashManifest(manifest);
      if (pruned !== manifest) {
        node[key] = pruned;
        changed = true;
      }
    }
  }

  const candidates = node.image_versions2?.candidates;
  if (Array.isArray(candidates) && upgradeImageCandidates(candidates)) changed = true;

  if (Array.isArray(node.display_resources) && node.display_resources.length > 0) {
    const best = (node.display_resources as DisplayResource[]).reduce((a, b) =>
      scoreDisplayResource(b) >= scoreDisplayResource(a) ? b : a,
    );
    node.display_resources = [best];
    if (typeof node.display_url === 'string' && best.src) node.display_url = best.src;
    changed = true;
  }

  if (Array.isArray(node.candidates) && upgradeImageCandidates(node.candidates)) changed = true;

  return changed;
}

function walk(value: unknown, seen = new WeakSet<object>()): boolean {
  if (!isObject(value)) return false;
  if (seen.has(value)) return false;
  seen.add(value);

  let changed = rewriteNode(value as MediaNode);

  if (Array.isArray(value)) {
    for (const item of value) {
      if (walk(item, seen)) changed = true;
    }
    return changed;
  }

  for (const key of Object.keys(value)) {
    if (walk(value[key], seen)) changed = true;
  }
  return changed;
}

/** Parse, mutate for HD quality, and re-serialize a JSON API response body. */
export function rewriteJsonText(text: string): string | null {
  if (text.length < 20) return null;
  if (
    !text.includes('video_versions') &&
    !text.includes('video_dash_manifest') &&
    !text.includes('dash_manifest') &&
    !text.includes('image_versions2') &&
    !text.includes('display_resources')
  ) {
    return null;
  }

  try {
    const data: unknown = JSON.parse(text);
    if (!walk(data)) return null;
    log('rewrote API payload');
    return JSON.stringify(data);
  } catch {
    return null;
  }
}
