/**
 * Construction timeline visuelle (fonctions pures).
 * Ducking bed ← sync : voir mixBus.compileDuckEnvelopes.
 */

import { cinematicTheme } from "@/src/lib/creatomate/cinematicTheme";
import { bedVolumeForDuckCause } from "@/src/lib/creatomate/mixBus";
import type {
  DuckInterval,
  ResolvedMediaAsset,
  TimelineMediaClip,
} from "@/src/lib/creatomate/types";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

/**
 * Ordonne les clips selon storyboard.chapters[].mediaIds.
 * `timeSec` est relatif au début du **contenu** (après intro).
 */
export function buildTimelineClips(params: {
  storyboard: WizardStoryboardState;
  mediaById: Map<string, ResolvedMediaAsset>;
}): {
  clips: TimelineMediaClip[];
  contentDurationSec: number;
  chapterSpans: Array<{
    chapterId: string;
    contentStartSec: number;
    contentDurationSec: number;
  }>;
} {
  const photoDur = cinematicTheme.media.photoDurationSec;
  const clips: TimelineMediaClip[] = [];
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
 * Segmente un stem **bed** selon les enveloppes de ducking (sync → bed).
 */
export function buildDuckedMusicSegments(params: {
  contentOffsetSec: number;
  chapterContentStartSec: number;
  chapterContentDurationSec: number;
  duckIntervals: DuckInterval[];
  bedVolume: string;
  attackSec: number;
  releaseSec: number;
}): MusicSegment[] {
  const {
    contentOffsetSec,
    chapterContentStartSec,
    chapterContentDurationSec,
    duckIntervals,
    bedVolume,
    attackSec,
    releaseSec,
  } = params;

  if (chapterContentDurationSec <= 0) return [];

  const chapterEnd = chapterContentStartSec + chapterContentDurationSec;
  const ducks = duckIntervals
    .map((d) => ({
      startSec: Math.max(d.startSec, chapterContentStartSec),
      endSec: Math.min(d.endSec, chapterEnd),
      causedBy: d.causedBy,
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
    const active = ducks.find((d) => mid >= d.startSec && mid < d.endSec);
    const isDuck = Boolean(active);
    const volume = isDuck
      ? bedVolumeForDuckCause(active?.causedBy ?? "sync")
      : bedVolume;

    segments.push({
      timeSec: contentOffsetSec + a,
      durationSec: dur,
      volume,
      fadeInSec: Math.min(isDuck ? attackSec : 0.3, dur / 2),
      fadeOutSec: Math.min(isDuck ? releaseSec : 0.3, dur / 2),
      trimStartSec: trimCursor,
    });
    trimCursor += dur;
  }

  return segments;
}
