/**
 * Mutations du storyboard liées aux médias (Étape 5 — table de montage).
 * Fonctions pures, sans dépendance React.
 */

import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

/** Réconcilie le storyboard persisté avec la liste courante des `media_assets`. */
export function mergeStoryboardWithMedia(
  storyboard: WizardStoryboardState,
  mediaAssetIds: string[],
): WizardStoryboardState {
  const valid = new Set(mediaAssetIds);
  const seen = new Set<string>();

  const chapters = storyboard.chapters.map((chapter) => ({
    ...chapter,
    mediaIds: chapter.mediaIds.filter((id) => {
      if (!valid.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
  }));

  const unassignedIds: string[] = [];
  for (const id of storyboard.unassignedIds) {
    if (valid.has(id) && !seen.has(id)) {
      seen.add(id);
      unassignedIds.push(id);
    }
  }

  for (const id of mediaAssetIds) {
    if (!seen.has(id)) {
      seen.add(id);
      unassignedIds.push(id);
    }
  }

  return {
    ...storyboard,
    chapters,
    unassignedIds,
    excludedIds: storyboard.excludedIds.filter((id) => valid.has(id)),
    focalPoints: Object.fromEntries(
      Object.entries(storyboard.focalPoints).filter(([id]) => valid.has(id)),
    ),
    videoTrims: Object.fromEntries(
      Object.entries(storyboard.videoTrims ?? {}).filter(([id]) => valid.has(id)),
    ),
  };
}

/** Assigne un média au chapitre cible (fin de liste par défaut). */
export function assignMediaToChapter(
  storyboard: WizardStoryboardState,
  chapterId: string,
  mediaId: string,
  index?: number,
): WizardStoryboardState {
  return assignManyMediaToChapter(storyboard, chapterId, [mediaId], index);
}

/**
 * Assigne plusieurs médias au chapitre cible en une seule mutation.
 * `mediaIds` définit l'ordre d'insertion (sélection utilisateur).
 */
export function assignManyMediaToChapter(
  storyboard: WizardStoryboardState,
  chapterId: string,
  mediaIds: readonly string[],
  insertIndex?: number,
): WizardStoryboardState {
  if (mediaIds.length === 0) return storyboard;

  const assignSet = new Set(mediaIds);
  const unassignedIds = storyboard.unassignedIds.filter((id) => !assignSet.has(id));

  const chapters = storyboard.chapters.map((chapter) => {
    const filtered = chapter.mediaIds.filter((id) => !assignSet.has(id));
    if (chapter.id !== chapterId) {
      return filtered.length === chapter.mediaIds.length
        ? chapter
        : { ...chapter, mediaIds: filtered };
    }

    const existing = new Set(filtered);
    const toAppend = mediaIds.filter((id) => !existing.has(id));
    const insertAt =
      typeof insertIndex === "number"
        ? Math.max(0, Math.min(insertIndex, filtered.length))
        : filtered.length;
    const nextIds = [...filtered];
    nextIds.splice(insertAt, 0, ...toAppend);
    return { ...chapter, mediaIds: nextIds };
  });

  return { ...storyboard, chapters, unassignedIds };
}

/** Retire un média d'un chapitre vers la banque non assignée. */
export function unassignMediaFromChapter(
  storyboard: WizardStoryboardState,
  mediaId: string,
): WizardStoryboardState {
  return unassignManyMediaFromChapters(storyboard, [mediaId]);
}

/** Retire plusieurs médias de leurs chapitres vers la banque non assignée. */
export function unassignManyMediaFromChapters(
  storyboard: WizardStoryboardState,
  mediaIds: readonly string[],
): WizardStoryboardState {
  if (mediaIds.length === 0) return storyboard;

  const removeSet = new Set(mediaIds);
  const chapters = storyboard.chapters.map((chapter) => ({
    ...chapter,
    mediaIds: chapter.mediaIds.filter((id) => !removeSet.has(id)),
  }));

  const unassignedIds = [...storyboard.unassignedIds];
  for (const id of mediaIds) {
    if (!unassignedIds.includes(id)) unassignedIds.push(id);
  }

  return { ...storyboard, chapters, unassignedIds };
}

/** Réordonne les médias d'un chapitre (gauche → droite sur la timeline). */
export function reorderChapterMedia(
  storyboard: WizardStoryboardState,
  chapterId: string,
  activeId: string,
  overId: string,
): WizardStoryboardState {
  const chapter = storyboard.chapters.find((c) => c.id === chapterId);
  if (!chapter) return storyboard;

  const oldIndex = chapter.mediaIds.indexOf(activeId);
  const newIndex = chapter.mediaIds.indexOf(overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return storyboard;

  const nextIds = [...chapter.mediaIds];
  nextIds.splice(oldIndex, 1);
  nextIds.splice(newIndex, 0, activeId);

  return {
    ...storyboard,
    chapters: storyboard.chapters.map((c) =>
      c.id === chapterId ? { ...c, mediaIds: nextIds } : c,
    ),
  };
}

export function toggleStoryboardMediaExclude(
  storyboard: WizardStoryboardState,
  mediaId: string,
): WizardStoryboardState {
  const excluded = new Set(storyboard.excludedIds);
  if (excluded.has(mediaId)) {
    excluded.delete(mediaId);
  } else {
    excluded.add(mediaId);
  }
  return { ...storyboard, excludedIds: [...excluded] };
}

export function setStoryboardFocalPoint(
  storyboard: WizardStoryboardState,
  mediaId: string,
  point: { x: number; y: number },
): WizardStoryboardState {
  return {
    ...storyboard,
    focalPoints: { ...storyboard.focalPoints, [mediaId]: point },
  };
}

export function clearStoryboardFocalPoint(
  storyboard: WizardStoryboardState,
  mediaId: string,
): WizardStoryboardState {
  const { [mediaId]: _, ...focalPoints } = storyboard.focalPoints;
  return { ...storyboard, focalPoints };
}
