/**
 * Assemble le RenderScript Creatomate (source JSON dynamique).
 * Film = atomes craft (intro / médias / outro) + lit musical.
 */

import { assembleAtomFilm } from "@/src/lib/creatomate/atomsAssembler";
import { cinematicTheme } from "@/src/lib/creatomate/cinematicTheme";
import {
  buildDuckedMusicSegments,
  type MusicSegment,
} from "@/src/lib/creatomate/timeline";
import type { OdysseyRenderPlan } from "@/src/lib/creatomate/types";

type CreatomateElement = Record<string, unknown>;

function buildMusicElements(
  plan: OdysseyRenderPlan,
  introDur: number,
  filmDurationSec: number,
): CreatomateElement[] {
  const music = cinematicTheme.music;
  const bedStems = plan.audioStems.filter((s) => s.layer === "bed");
  const elements: CreatomateElement[] = [];
  let segIndex = 0;

  for (const bed of bedStems) {
    // film_global : lit sous intro + contenu, borné à la durée du film (C0).
    const isGlobal = bed.placement === "film_global";
    const contentOffsetSec = isGlobal ? 0 : introDur;
    const chapterContentStartSec = isGlobal ? 0 : bed.timeSec;
    const rawDurationSec = isGlobal ? filmDurationSec : bed.durationSec;
    const maxContentDur = Math.max(
      0,
      filmDurationSec - contentOffsetSec - chapterContentStartSec,
    );
    const chapterContentDurationSec = Math.min(rawDurationSec, maxContentDur);

    const segments: MusicSegment[] = buildDuckedMusicSegments({
      contentOffsetSec,
      chapterContentStartSec,
      chapterContentDurationSec,
      duckIntervals: plan.duckIntervals,
      bedVolume: music.bedVolume,
      attackSec: music.duckAttackSec,
      releaseSec: music.duckReleaseSec,
    });

    for (const seg of segments) {
      if (seg.timeSec >= filmDurationSec) continue;
      const duration = Math.min(
        seg.durationSec,
        filmDurationSec - seg.timeSec,
      );
      if (duration < 0.05) continue;

      const endsAtFilm =
        seg.timeSec + duration >= filmDurationSec - 0.05;
      const desiredFadeOut = endsAtFilm
        ? Math.max(
            seg.fadeOutSec,
            music.chapterFadeOutSec,
            music.filmEndFadeOutSec,
          )
        : Math.max(seg.fadeOutSec, music.chapterFadeOutSec * 0.35);

      elements.push({
        id: `bed-${bed.chapterId ?? "global"}-${segIndex++}`,
        type: "audio",
        track: music.creatomateTracks.bed,
        time: seg.timeSec,
        duration,
        source: bed.url,
        trim_start: bed.trimStartSec + seg.trimStartSec,
        volume: seg.volume,
        audio_fade_in: Math.min(
          Math.max(seg.fadeInSec, music.chapterFadeInSec * 0.35),
          duration * 0.45,
        ),
        audio_fade_out: Math.min(desiredFadeOut, duration * 0.9),
      });
    }
  }

  return elements;
}

/**
 * Source Creatomate complète (atomes + ducking).
 */
export function buildCreatomateSource(
  plan: OdysseyRenderPlan,
): Record<string, unknown> {
  const film = assembleAtomFilm(plan);

  const elements: CreatomateElement[] = [
    ...film.elements,
    ...buildMusicElements(
      plan,
      film.introDurationSec,
      film.durationSec,
    ),
  ];

  return {
    output_format: cinematicTheme.outputFormat,
    frame_rate: cinematicTheme.frameRate,
    width: plan.resolution.width,
    height: plan.resolution.height,
    duration: film.durationSec,
    snapshot_time: Math.min(8, film.introDurationSec / 2),
    elements,
  };
}

export function buildCreatomateRenderBody(plan: OdysseyRenderPlan): Record<
  string,
  unknown
> {
  return {
    webhook_url: plan.webhookUrl,
    metadata: plan.jobId,
    source: buildCreatomateSource(plan),
  };
}
