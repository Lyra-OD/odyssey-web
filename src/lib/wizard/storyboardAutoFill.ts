/**
 * Remplissage automatique et vidage de chapitre — Étape 5.
 */

import { assignManyMediaToChapter } from "@/src/lib/wizard/storyboardMedia";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

/** Vide un chapitre — tous les médias retournent dans la banque non assignée. */
export function clearChapterMedia(
  storyboard: WizardStoryboardState,
  chapterId: string,
): WizardStoryboardState {
  const chapter = storyboard.chapters.find((c) => c.id === chapterId);
  if (!chapter || chapter.mediaIds.length === 0) return storyboard;

  const removed = new Set(chapter.mediaIds);
  const chapters = storyboard.chapters.map((c) =>
    c.id === chapterId ? { ...c, mediaIds: [] } : c,
  );

  const unassignedIds = [...storyboard.unassignedIds];
  for (const id of chapter.mediaIds) {
    if (!unassignedIds.includes(id)) unassignedIds.push(id);
  }

  return { ...storyboard, chapters, unassignedIds };
}

/**
 * Remplit un chapitre depuis la banque jusqu'à la capacité recommandée (soft).
 * L'ordre de la banque est préservé.
 */
export function autoFillChapter(
  storyboard: WizardStoryboardState,
  chapterId: string,
  recommendedCapacity: number | null,
): WizardStoryboardState {
  if (storyboard.unassignedIds.length === 0) return storyboard;

  const limit =
    recommendedCapacity === null
      ? storyboard.unassignedIds.length
      : Math.max(0, recommendedCapacity);

  const chapter = storyboard.chapters.find((c) => c.id === chapterId);
  if (!chapter) return storyboard;

  const slotsLeft = Math.max(0, limit - chapter.mediaIds.length);
  if (slotsLeft === 0) return storyboard;

  const toAssign = storyboard.unassignedIds.slice(0, slotsLeft);
  return assignManyMediaToChapter(storyboard, chapterId, toAssign);
}
