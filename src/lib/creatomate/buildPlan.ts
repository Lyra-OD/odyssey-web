/**
 * Assemble un OdysseyRenderPlan à partir du wizard + médias hydratés.
 */

import { cinematicTheme } from "@/src/lib/creatomate/cinematicTheme";
import { resolveCreatomateResolution } from "@/src/lib/creatomate/resolveResolution";
import { buildTimelineClips } from "@/src/lib/creatomate/timeline";
import type {
  OdysseyRenderPlan,
  RenderEssentials,
  ResolvedMediaAsset,
} from "@/src/lib/creatomate/types";
import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";
import type {
  WizardStateV1,
  WizardStoryboardState,
} from "@/src/lib/wizard/wizardState";

function formatDatesLine(
  birthDate?: string,
  deathDate?: string,
): string | null {
  const b = birthDate?.trim();
  const d = deathDate?.trim();
  if (b && d) return `${b} — ${d}`;
  if (d) return d;
  if (b) return b;
  return null;
}

export function essentialsFromWizard(state: WizardStateV1): RenderEssentials {
  const first = state.essentials?.firstName?.trim() ?? "";
  const last = state.essentials?.lastName?.trim() ?? "";
  const displayName =
    [first, last].filter(Boolean).join(" ") || "Un être cher";
  return {
    displayName,
    datesLine: formatDatesLine(
      state.essentials?.birthDate,
      state.essentials?.deathDate,
    ),
  };
}

export function buildOdysseyRenderPlan(params: {
  jobId: string;
  webhookUrl: string;
  paidPackage: WizardBasePackage;
  storyboard: WizardStoryboardState;
  mediaById: Map<string, ResolvedMediaAsset>;
  essentials: RenderEssentials;
  chapterAudio: Array<{
    chapterId: string;
    url: string;
    contentStartSec: number;
    contentDurationSec: number;
  }>;
}): OdysseyRenderPlan {
  const { clips, duckIntervals, chapterSpans } = buildTimelineClips({
    storyboard: params.storyboard,
    mediaById: params.mediaById,
  });

  const audioByChapter = new Map(
    params.chapterAudio.map((a) => [a.chapterId, a] as const),
  );

  const chapterAudio = chapterSpans
    .map((span) => {
      const track = audioByChapter.get(span.chapterId);
      if (!track || span.contentDurationSec <= 0) return null;
      return {
        chapterId: span.chapterId,
        url: track.url,
        timeSec: span.contentStartSec,
        durationSec: span.contentDurationSec,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return {
    jobId: params.jobId,
    webhookUrl: params.webhookUrl,
    paidPackage: params.paidPackage,
    resolution: resolveCreatomateResolution(params.paidPackage),
    essentials: params.essentials,
    clips,
    duckIntervals,
    chapterAudio,
  };
}

export { cinematicTheme };
