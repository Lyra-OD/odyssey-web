/**
 * Assemble un OdysseyRenderPlan à partir du wizard + médias + stems audio.
 */

import { resolveCreatomateResolution } from "@/src/lib/creatomate/resolveResolution";
import { compileDuckEnvelopes } from "@/src/lib/creatomate/mixBus";
import { buildTimelineClips } from "@/src/lib/creatomate/timeline";
import type {
  OdysseyRenderPlan,
  RenderEssentials,
  ResolvedAudioStem,
  ResolvedMediaAsset,
} from "@/src/lib/creatomate/types";
import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";
import type {
  WizardStateV1,
  WizardStoryboardState,
} from "@/src/lib/wizard/wizardState";
import { cinematicTheme } from "@/src/lib/creatomate/cinematicTheme";

function formatDatesLine(
  birthDate?: string,
  deathDate?: string,
): string | null {
  const b = birthDate?.trim();
  const d = deathDate?.trim();
  if (b && d) return `${b} · ${d}`;
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
  /** Graphe audio déjà résolu (One Bed Law + sync). */
  audioStems: ResolvedAudioStem[];
}): OdysseyRenderPlan {
  const { clips } = buildTimelineClips({
    storyboard: params.storyboard,
    mediaById: params.mediaById,
  });

  const duckIntervals = compileDuckEnvelopes(params.audioStems);

  return {
    jobId: params.jobId,
    webhookUrl: params.webhookUrl,
    paidPackage: params.paidPackage,
    resolution: resolveCreatomateResolution(params.paidPackage),
    essentials: params.essentials,
    clips,
    audioStems: params.audioStems,
    duckIntervals,
  };
}

export { cinematicTheme };
