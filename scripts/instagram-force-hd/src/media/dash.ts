/**
 * Prunes a DASH MPD manifest to keep only the highest-bandwidth Representation
 * inside each video AdaptationSet. Audio AdaptationSets are left untouched.
 */
export function pruneDashManifest(mpd: string): string {
  if (!mpd.includes('<MPD') || !mpd.includes('Representation')) return mpd;

  return mpd.replace(
    /<AdaptationSet\b[^>]*>[\s\S]*?<\/AdaptationSet>/gi,
    (adaptationSet) => {
      const isVideo =
        /contentType\s*=\s*["']video["']/i.test(adaptationSet) ||
        (/mimeType\s*=\s*["']video\//i.test(adaptationSet) &&
          !/contentType\s*=\s*["']audio["']/i.test(adaptationSet));

      if (!isVideo) return adaptationSet;

      const reps = [...adaptationSet.matchAll(/<Representation\b[\s\S]*?<\/Representation>/gi)].map(
        (m) => m[0],
      );
      if (reps.length <= 1) return adaptationSet;

      let best = reps[0] ?? '';
      let bestScore = -1;
      for (const rep of reps) {
        const bw = Number((/\bbandwidth\s*=\s*["'](\d+)["']/i.exec(rep) ?? [])[1] ?? 0);
        const w = Number((/\bwidth\s*=\s*["'](\d+)["']/i.exec(rep) ?? [])[1] ?? 0);
        const h = Number((/\bheight\s*=\s*["'](\d+)["']/i.exec(rep) ?? [])[1] ?? 0);
        const score = bw || w * h;
        if (score >= bestScore) {
          bestScore = score;
          best = rep;
        }
      }

      let first = true;
      return adaptationSet.replace(/<Representation\b[\s\S]*?<\/Representation>/gi, () => {
        if (first) { first = false; return best; }
        return '';
      });
    },
  );
}
