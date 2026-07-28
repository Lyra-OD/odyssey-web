/**
 * Construction timeline + intervalles de ducking (fonctions pures).
 */

import { cinematicTheme } from "@/src/lib/creatomate/cinematicTheme";
import type {
  DuckInterval,
  ResolvedMediaAsset,
  TimelineMediaClip,
} from "@/src/lib/creatomate/types";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

function mergeDuckIntervals(intervals: DuckInterval[]): DuckInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.startSec - b.startSec);
  const out: DuckInterval[] = [{ ...sorted[0]! }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const last = out[out.length - 1]!;
    if (cur.startSec <= last.endSec + 0.05) {
      last.endSec = Math.max(last.endSec, cur.endSec);
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

/**
 * Ordonne les clips selon storyboard.chapters[].mediaIds.
 * `timeSec` est relatif au début du **contenu** (après intro).
 */
export function buildTimelineClips(params: {
  storyboard: WizardStoryboardState;
  mediaById: Map<string, ResolvedMediaAsset>;
}): {
  clips: TimelineMediaClip[];
  duckIntervals: DuckInterval[];
  contentDurationSec: number;
  chapterSpans: Array<{
    chapterId: string;
    contentStartSec: number;
    contentDurationSec: number;
  }>;
} {
  const photoDur = cinematicTheme.media.photoDurationSec;
  const clips: TimelineMediaClip[] = [];
  const duckRaw: DuckInterval[] = [];
  const chapterSpans: Array<{
    chapterId: string;
    contentStartSec: number;
    contentDurationSec: number;
  }> = [];
  let cursor = 0;

  for (const chapter of params.storyboard.chapters) {
    const chapterStart = cursor;
    for (const mediaId of chapter.mediaIds) {
      if (params.storyboard.excludedIds.includes(mediaId)) continue;
      const asset = params.mediaById.get(mediaId);
      if (!asset) continue;

      const durationSec =
        asset.kind === "video" ? asset.durationSec : photoDur;

      clips.push({
        mediaId,
        kind: asset.kind,
        url: asset.url,
        timeSec: cursor,
        durationSec,
        trimStartSec: asset.trimStartSec,
        focalX: asset.focalX,
        focalY: asset.focalY,
        hasAudio: asset.hasAudio,
      });

      if (asset.kind === "video" && asset.hasAudio) {
        duckRaw.push({
          startSec: cursor,
          endSec: cursor + durationSec,
        });
      }

      cursor += durationSec;
    }
    chapterSpans.push({
      chapterId: chapter.id,
      contentStartSec: chapterStart,
      contentDurationSec: cursor - chapterStart,
    });
  }

  return {
    clips,
    duckIntervals: mergeDuckIntervals(duckRaw),
    contentDurationSec: cursor,
    chapterSpans,
  };
}

export type MusicSegment = {
  timeSec: number;
  durationSec: number;
  volume: string;
  fadeInSec: number;
  fadeOutSec: number;
  trimStartSec: number;
};

/**
 * Segmente la musique d'un chapitre : bed vs duck selon les vidéos sonores.
 * duckIntervals / chapter spans sont en temps **contenu** (hors intro).
 */
export function buildDuckedMusicSegments(params: {
  contentOffsetSec: number;
  chapterContentStartSec: number;
  chapterContentDurationSec: number;
  duckIntervals: DuckInterval[];
  bedVolume: string;
  duckVolume: string;
  attackSec: number;
  releaseSec: number;
}): MusicSegment[] {
  const {
    contentOffsetSec,
    chapterContentStartSec,
    chapterContentDurationSec,
    duckIntervals,
    bedVolume,
    duckVolume,
    attackSec,
    releaseSec,
  } = params;

  if (chapterContentDurationSec <= 0) return [];

  const chapterEnd = chapterContentStartSec + chapterContentDurationSec;
  const ducks = duckIntervals
    .map((d) => ({
      startSec: Math.max(d.startSec, chapterContentStartSec),
      endSec: Math.min(d.endSec, chapterEnd),
    }))
    .filter((d) => d.endSec - d.startSec > 0.05);

  const boundaries = new Set<number>([chapterContentStartSec, chapterEnd]);
  for (const d of ducks) {
    boundaries.add(d.startSec);
    boundaries.add(d.endSec);
  }
  const times = [...boundaries].sort((a, b) => a - b);

  const segments: MusicSegment[] = [];
  let trimCursor = 0;

  for (let i = 0; i < times.length - 1; i++) {
    const a = times[i]!;
    const b = times[i + 1]!;
    const dur = b - a;
    if (dur < 0.05) continue;

    const mid = a + dur / 2;
    const isDuck = ducks.some((d) => mid >= d.startSec && mid < d.endSec);

    segments.push({
      timeSec: contentOffsetSec + a,
      durationSec: dur,
      volume: isDuck ? duckVolume : bedVolume,
      fadeInSec: Math.min(isDuck ? attackSec : 0.3, dur / 2),
      fadeOutSec: Math.min(isDuck ? releaseSec : 0.3, dur / 2),
      trimStartSec: trimCursor,
    });
    trimCursor += dur;
  }

  return segments;
}
