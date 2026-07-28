/**
 * Assemble le RenderScript Creatomate (source JSON dynamique).
 * Unités esthétiques : vmin / % uniquement (voir cinematicTheme).
 */

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

function buildSignatureIntro(plan: OdysseyRenderPlan): CreatomateElement[] {
  const t = cinematicTheme.intro;
  const typo = cinematicTheme.typography;
  const colors = cinematicTheme.colors;
  const elements: CreatomateElement[] = [];

  // Acte A — void + grain + soft light
  elements.push({
    id: "intro-void",
    type: "shape",
    track: 1,
    time: 0,
    duration: t.durationSec,
    width: "100%",
    height: "100%",
    fill_color: colors.void,
  });

  elements.push({
    id: "intro-soft-light",
    type: "shape",
    track: 2,
    time: 0.15,
    duration: t.durationSec - 0.3,
    width: "70%",
    height: "55%",
    x: "50%",
    y: "42%",
    fill_color: colors.softLight,
    border_radius: "50%",
    animations: [
      {
        time: 0,
        duration: t.softLightFadeSec,
        easing: "quadratic-out",
        type: "fade",
      },
    ],
  });

  // Acte B — nom (scale 104→100 + fade)
  elements.push({
    id: "intro-name",
    type: "text",
    track: 3,
    time: t.nameStartDelaySec,
    duration: t.durationSec - t.nameStartDelaySec - 0.15,
    text: plan.essentials.displayName,
    font_family: typo.name.fontFamily,
    font_weight: typo.name.fontWeight,
    font_size: typo.name.fontSizeVmin,
    fill_color: colors.name,
    width: typo.name.width,
    height: "30%",
    x: "50%",
    y: t.nameY,
    x_alignment: "50%",
    y_alignment: "50%",
    animations: [
      {
        time: 0,
        duration: t.nameFadeSec,
        easing: "quadratic-out",
        type: "fade",
      },
      {
        easing: "linear",
        type: "scale",
        fade: false,
        scope: "element",
        start_scale: t.startScale,
        duration: t.scaleDurationSec,
      },
    ],
  });

  if (plan.essentials.datesLine) {
    elements.push({
      id: "intro-dates",
      type: "text",
      track: 3,
      time: t.nameStartDelaySec + t.datesDelayAfterNameSec,
      duration:
        t.durationSec -
        t.nameStartDelaySec -
        t.datesDelayAfterNameSec -
        0.15,
      text: plan.essentials.datesLine,
      font_family: typo.dates.fontFamily,
      font_weight: typo.dates.fontWeight,
      font_size: typo.dates.fontSizeVmin,
      fill_color: colors.dates,
      width: typo.dates.width,
      height: "12%",
      x: "50%",
      y: t.datesY,
      x_alignment: "50%",
      y_alignment: "50%",
      animations: [
        {
          time: 0,
          duration: t.datesFadeSec,
          easing: "quadratic-out",
          type: "fade",
        },
      ],
    });
  }

  // Acte C — fondu de sortie vers le contenu
  elements.push({
    id: "intro-exit-veil",
    type: "shape",
    track: 4,
    time: t.durationSec - t.exitFadeSec,
    duration: t.exitFadeSec,
    width: "100%",
    height: "100%",
    fill_color: colors.void,
    animations: [
      {
        time: 0,
        duration: t.exitFadeSec,
        easing: "quadratic-in",
        type: "fade",
        reversed: true,
      },
    ],
  });

  return elements;
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
  const elements: CreatomateElement[] = [];

  plan.clips.forEach((clip, index) => {
    const time = introDur + clip.timeSec;
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
      animations: [
        {
          time: 0,
          duration: Math.min(fade, clip.durationSec / 3),
          easing: "quadratic-out",
          type: "fade",
          transition: index > 0,
        },
      ],
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
  chapterAudio: OdysseyRenderPlan["chapterAudio"],
): CreatomateElement[] {
  const music = cinematicTheme.music;
  const elements: CreatomateElement[] = [];
  let segIndex = 0;

  for (const track of chapterAudio) {
    const segments: MusicSegment[] = buildDuckedMusicSegments({
      contentOffsetSec: introDur,
      chapterContentStartSec: track.timeSec,
      chapterContentDurationSec: track.durationSec,
      duckIntervals: plan.duckIntervals,
      bedVolume: music.bedVolume,
      duckVolume: music.duckVolume,
      attackSec: music.duckAttackSec,
      releaseSec: music.duckReleaseSec,
    });

    for (const seg of segments) {
      elements.push({
        id: `music-${track.chapterId}-${segIndex++}`,
        type: "audio",
        track: 5,
        time: seg.timeSec,
        duration: seg.durationSec,
        source: track.url,
        trim_start: seg.trimStartSec,
        volume: seg.volume,
        audio_fade_in: seg.fadeInSec,
        audio_fade_out: seg.fadeOutSec,
      });
    }
  }

  return elements;
}

/**
 * Source Creatomate complète (intro → médias → outro + ducking).
 */
export function buildCreatomateSource(
  plan: OdysseyRenderPlan,
): Record<string, unknown> {
  const introDur = cinematicTheme.intro.durationSec;
  const outroDur = cinematicTheme.outro.durationSec;
  const contentEnd = introDur + Math.max(plan.clips.reduce(
    (max, c) => Math.max(max, c.timeSec + c.durationSec),
    0,
  ), 0);
  const outroStart = contentEnd;
  const totalDuration = outroStart + outroDur;

  const elements: CreatomateElement[] = [
    ...buildSignatureIntro(plan),
    ...buildMediaElements(plan, introDur),
    ...buildMusicElements(plan, introDur, plan.chapterAudio),
    ...buildSignatureOutro(outroStart),
  ];

  return {
    output_format: cinematicTheme.outputFormat,
    frame_rate: cinematicTheme.frameRate,
    width: plan.resolution.width,
    height: plan.resolution.height,
    duration: totalDuration,
    snapshot_time: Math.min(1.2, introDur / 2),
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
