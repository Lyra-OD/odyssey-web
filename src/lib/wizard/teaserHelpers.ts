import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import {
  countIncludedMedia,
  MONTAGE_ACT_IDS,
  type MontageActId,
  type WizardMontageState,
} from "@/src/lib/wizard/wizardState";
import type { WizardActTrackKey } from "@/src/lib/wizard/stingrayCatalog";

export type TeaserSlide = {
  imageUrl: string;
  actId: MontageActId;
  actKey: WizardActTrackKey;
  label: string;
};

const ACT_TO_TRACK: Record<MontageActId, WizardActTrackKey> = {
  spark: "acte1",
  epic: "acte2",
  legacy: "acte3",
};

const ACT_LABELS: Record<MontageActId, string> = {
  spark: "Étincelle",
  epic: "Épopée",
  legacy: "Héritage",
};

/** 2 premières photos incluses par acte (I → III). */
export function buildTeaserSlides(
  montage: WizardMontageState,
  mediaById: Map<string, MontageMediaItem>,
): TeaserSlide[] {
  const excluded = new Set(montage.excludedIds);
  const slides: TeaserSlide[] = [];

  for (const actId of MONTAGE_ACT_IDS) {
    const ids = (montage.acts[actId] ?? [])
      .filter((id) => !excluded.has(id))
      .slice(0, 2);

    for (const id of ids) {
      const item = mediaById.get(id);
      if (!item?.previewUrl || item.isVideo) continue;
      slides.push({
        imageUrl: item.previewUrl,
        actId,
        actKey: ACT_TO_TRACK[actId],
        label: ACT_LABELS[actId],
      });
    }
  }

  return slides;
}

/** Estimation front-end — durée du film complet (minutes). */
export function estimateFilmDurationMinutes(montage: WizardMontageState): number {
  const included = countIncludedMedia(montage);
  const seconds = 90 + included * 6;
  return Math.max(3, Math.round(seconds / 60));
}

export function slidesForAct(
  slides: TeaserSlide[],
  actKey: WizardActTrackKey,
): TeaserSlide[] {
  return slides.filter((slide) => slide.actKey === actKey);
}

export function groupSlidesByAct(
  slides: TeaserSlide[],
): { actKey: WizardActTrackKey; slides: TeaserSlide[] }[] {
  const order: WizardActTrackKey[] = ["acte1", "acte2", "acte3"];
  return order
    .map((actKey) => ({
      actKey,
      slides: slides.filter((s) => s.actKey === actKey),
    }))
    .filter((group) => group.slides.length > 0);
}

export const TEASER_FADE_MS = 900;
export const TEASER_DEFAULT_SLIDE_MS = 4200;
