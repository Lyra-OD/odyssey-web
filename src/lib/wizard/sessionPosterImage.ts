/**
 * URL du poster sas étape 6 (séance cinéma).
 *
 * Priorité figée :
 * 1. Portrait famille (essentiels)
 * 2. Dernière photo du film (scan fin → début, ignore les vidéos)
 * 3. Secours : thumb de la dernière vidéo si le film est 100 % vidéo
 */

import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

function resolvedUrl(item: MontageMediaItem | undefined): string | null {
  if (!item) return null;
  const url = (item.fullPreviewUrl ?? item.previewUrl)?.trim();
  return url || null;
}

/**
 * Parcourt les médias placés dans l’ordre Livre Ouvert (chapitres × mediaIds),
 * en ignorant `excludedIds`. Retourne l’URL du poster selon la priorité ci-dessus.
 */
export function resolveSessionPosterUrl(args: {
  openingPortraitUrl?: string | null;
  storyboard: WizardStoryboardState;
  mediaById: Map<string, MontageMediaItem>;
}): string | null {
  const portrait = args.openingPortraitUrl?.trim();
  if (portrait) return portrait;

  const excluded = new Set(args.storyboard.excludedIds);
  const ordered: MontageMediaItem[] = [];

  for (const chapter of args.storyboard.chapters) {
    for (const id of chapter.mediaIds) {
      if (excluded.has(id)) continue;
      const item = args.mediaById.get(id);
      if (!item) continue;
      if (!resolvedUrl(item)) continue;
      ordered.push(item);
    }
  }

  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    const item = ordered[i];
    if (!item.isVideo) {
      return resolvedUrl(item);
    }
  }

  for (let i = ordered.length - 1; i >= 0; i -= 1) {
    const item = ordered[i];
    if (item.isVideo) {
      return resolvedUrl(item);
    }
  }

  return null;
}
