/**
 * Assemble le RenderScript Creatomate (source JSON dynamique).
 * Intro = atome craft ; médias / outro = builders TS (étape 3 = atomes).
 */

import { assembleIntroAtom } from "@/src/lib/creatomate/atomsAssembler";
import { cinematicTheme } from "@/src/lib/creatomate/cinematicTheme";
import {
  buildDuckedMusicSegments,
  type MusicSegment,
} from "@/src/lib/creatomate/timeline";
import type { OdysseyRenderPlan } from "@/src/lib/creatomate/types";

type CreatomateElement = Record<string, unknown>;

function focalToPercent(v: number): string {
  const clamped = Math.min(1, Math.max(0, v));
  return `${(clamped * 100).toFixed(2)}%`;
}

function buildSignatureOutro(startSec: number): CreatomateElement[] {
  const o = cinematicTheme.outro;
  const brand = cinematicTheme.brand;
  const colors = cinematicTheme.colors;

  return [
    {
      id: "outro-void",
      type: "shape",
      track: 1,
      time: startSec,
      duration: o.durationSec,
      width: "100%",
      height: "100%",
      fill_color: colors.void,
      animations: [
        {
          time: 0,
          duration: o.fadeInSec,
          easing: "quadratic-out",
          type: "fade",
        },
      ],
    },
    {
      id: "outro-wordmark",
      type: "text",
      track: 2,
      time: startSec + 0.35,
      duration: o.durationSec - 0.5,
      text: brand.wordmark,
      font_family: brand.fontFamily,
      font_weight: brand.fontWeight,
      font_size: brand.fontSizeVmin,
      letter_spacing: brand.letterSpacing,
      fill_color: brand.fill,
      width: "90%",
      height: "20%",
      x: "50%",
      y: o.wordmarkY,
      x_alignment: "50%",
      y_alignment: "50%",
      animations: [
        {
          time: 0,
          duration: o.fadeInSec,
          easing: "quadratic-out",
          type: "fade",
        },
        {
          easing: "linear",
          type: "scale",
          fade: false,
          scope: "element",
          start_scale: o.startScale,
          duration: o.durationSec - 0.5,
        },
      ],
    },
  ];
}

function buildMediaElements(
  plan: OdysseyRenderPlan,
  introDur: number,
): CreatomateElement[] {
  const fade = cinematicTheme.media.transitionFadeSec;
  const kb = cinematicTheme.media.kenBurns;
  const elements: CreatomateElement[] = [];

  plan.clips.forEach((clip, index) => {
    const time = introDur + clip.timeSec;
    const fadeIn = Math.min(fade, clip.durationSec / 3);
    const animations: Record<string, unknown>[] = [
      {
        time: 0,
        duration: fadeIn,
        easing: "quadratic-out",
        type: "fade",
        transition: index > 0,
      },
    ];

    // Ken Burns — photos seulement (vidéos gardent leur mouvement natif).
    if (clip.kind === "image") {
      const startScale = index % 2 === 0 ? kb.startScaleA : kb.startScaleB;
      animations.push({
        easing: "linear",
        type: "scale",
        fade: false,
        scope: "element",
        start_scale: startScale,
        duration: clip.durationSec,
      });
    }

    const base: CreatomateElement = {
      id: `media-${clip.mediaId}-${index}`,
      track: 1,
      time,
      duration: clip.durationSec,
      width: "100%",
      height: "100%",
      fit: cinematicTheme.media.fit,
      x_alignment: focalToPercent(clip.focalX),
      y_alignment: focalToPercent(clip.focalY),
      animations,
    };

    if (clip.kind === "video") {
      elements.push({
        ...base,
        type: "video",
        source: clip.url,
        trim_start: clip.trimStartSec,
        volume: clip.hasAudio ? "100%" : "0%",
        audio_fade_in: 0.2,
        audio_fade_out: 0.25,
      });
    } else {
      elements.push({
        ...base,
        type: "image",
        source: clip.url,
      });
    }
  });

  return elements;
}

function buildMusicElements(
  plan: OdysseyRenderPlan,
  introDur: number,
): CreatomateElement[] {
  const music = cinematicTheme.music;
  const bedStems = plan.audioStems.filter((s) => s.layer === "bed");
  const elements: CreatomateElement[] = [];
  let segIndex = 0;

  for (const bed of bedStems) {
    // film_global : lit sous intro + contenu (recette craft / bed unique).
    const isGlobal = bed.placement === "film_global";
    const contentOffsetSec = isGlobal ? 0 : introDur;
    const chapterContentStartSec = isGlobal ? 0 : bed.timeSec;
    const chapterContentDurationSec = isGlobal
      ? introDur + bed.durationSec
      : bed.durationSec;

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
      elements.push({
        id: `bed-${bed.chapterId ?? "global"}-${segIndex++}`,
        type: "audio",
        track: music.creatomateTracks.bed,
        time: seg.timeSec,
        duration: seg.durationSec,
        source: bed.url,
        trim_start: bed.trimStartSec + seg.trimStartSec,
        volume: seg.volume,
        audio_fade_in: Math.max(seg.fadeInSec, music.chapterFadeInSec * 0.35),
        audio_fade_out: Math.max(seg.fadeOutSec, music.chapterFadeOutSec * 0.35),
      });
    }
  }

  // Phase 2 : émettre ghost (track 6) / foreground (track 7) ici.
  return elements;
}

/**
 * Source Creatomate complète (intro atome → médias TS → outro TS + ducking).
 */
export function buildCreatomateSource(
  plan: OdysseyRenderPlan,
): Record<string, unknown> {
  const intro = assembleIntroAtom(plan);
  const introDur = intro.durationSec;
  const outroDur = cinematicTheme.outro.durationSec;
  const contentEnd = introDur + Math.max(plan.clips.reduce(
    (max, c) => Math.max(max, c.timeSec + c.durationSec),
    0,
  ), 0);
  const outroStart = contentEnd;
  const totalDuration = outroStart + outroDur;

  const elements: CreatomateElement[] = [
    ...intro.elements,
    ...buildMediaElements(plan, introDur),
    ...buildMusicElements(plan, introDur),
    ...buildSignatureOutro(outroStart),
  ];

  return {
    output_format: cinematicTheme.outputFormat,
    frame_rate: cinematicTheme.frameRate,
    width: plan.resolution.width,
    height: plan.resolution.height,
    duration: totalDuration,
    snapshot_time: Math.min(8, introDur / 2),
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
