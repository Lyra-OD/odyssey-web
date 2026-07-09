/**
 * Partition cinématographique — Composition Magique (Étape 5).
 * Pur domaine : aucune dépendance React.
 */

import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

/** Délai CSS entre vignettes d'un même lot chapitre. */
export const MAGIC_MEDIA_STAGGER_STEP_MS = 45;
/** Durée d'entrée CSS par vignette (sync avec `.magic-media-enter`). */
export const MAGIC_MEDIA_ENTRANCE_MS = 160;
/** Fade-out capsule + scrim après le dernier lot. */
export const MAGIC_OVERLAY_EXIT_MS = 300;
/** Entrée capsule (fade + translateY). */
export const MAGIC_CAPSULE_ENTER_MS = 300;
/** Cycle respiration bordure + texte (sync). */
export const MAGIC_CAPSULE_BREATHE_MS = 1600;
/** Fade-in scrim profondeur (vignette + blur périphérique). */
export const MAGIC_DEPTH_SCRIM_ENTER_MS = 280;
/** Pause courte entre lots chapitre — la cascade CSS continue pendant le scroll. */
export const MAGIC_BATCH_INTER_CHAPTER_MS = 100;

export type MagicTimelineEvent =
  | {
      kind: "scrollToChapter";
      chapterId: string;
      chapterIndex: number;
    }
  | {
      kind: "assignChapterBatch";
      chapterId: string;
      chapterIndex: number;
      mediaIds: readonly string[];
    }
  | { kind: "complete" };

export type MagicMediaAssignment = {
  chapterId: string;
  chapterIndex: number;
  mediaId: string;
};

export type MagicChapterBatch = {
  chapterId: string;
  chapterIndex: number;
  mediaIds: string[];
};

/** Durée visuelle d'un lot — cascade CSS complète avant chapitre suivant. */
export function computeBatchCascadeMs(mediaCount: number): number {
  if (mediaCount <= 0) return 0;
  return (
    (mediaCount - 1) * MAGIC_MEDIA_STAGGER_STEP_MS + MAGIC_MEDIA_ENTRANCE_MS
  );
}

/** Fisher-Yates — mélange une copie sans muter la source. */
export function shuffleMediaIds(
  ids: readonly string[],
  random: () => number = Math.random,
): string[] {
  const pool = [...ids];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool;
}

/** Round-robin sur pool mélangé — respecte les capacités restantes par chapitre. */
export function planMagicMediaAssignments(
  storyboard: WizardStoryboardState,
  recommendedCapacities: readonly (number | null)[],
  random: () => number = Math.random,
): MagicMediaAssignment[] {
  if (storyboard.unassignedIds.length === 0) return [];
  if (storyboard.chapters.length === 0) return [];

  const pool = shuffleMediaIds(storyboard.unassignedIds, random);
  const remainingSlots = storyboard.chapters.map((chapter, index) => {
    const capacity = recommendedCapacities[index];
    if (capacity === null) return Number.POSITIVE_INFINITY;
    return Math.max(0, capacity - chapter.mediaIds.length);
  });

  const assignments: MagicMediaAssignment[] = [];
  let chapterCursor = 0;
  let guard = pool.length * storyboard.chapters.length + 1;

  while (pool.length > 0 && guard-- > 0) {
    let assigned = false;

    for (let offset = 0; offset < storyboard.chapters.length; offset += 1) {
      const index = (chapterCursor + offset) % storyboard.chapters.length;
      if (remainingSlots[index] <= 0) continue;

      const mediaId = pool.shift();
      if (!mediaId) break;

      assignments.push({
        chapterId: storyboard.chapters[index].id,
        chapterIndex: index,
        mediaId,
      });

      remainingSlots[index] =
        remainingSlots[index] === Number.POSITIVE_INFINITY
          ? Number.POSITIVE_INFINITY
          : remainingSlots[index] - 1;
      chapterCursor = (index + 1) % storyboard.chapters.length;
      assigned = true;
      break;
    }

    if (!assigned) break;
  }

  return assignments;
}

/** Regroupe les assignations round-robin en lots par chapitre (ordre de première apparition). */
export function groupAssignmentsIntoChapterBatches(
  assignments: readonly MagicMediaAssignment[],
): MagicChapterBatch[] {
  const batchByChapterId = new Map<string, MagicChapterBatch>();
  const chapterOrder: string[] = [];

  for (const assignment of assignments) {
    let batch = batchByChapterId.get(assignment.chapterId);
    if (!batch) {
      batch = {
        chapterId: assignment.chapterId,
        chapterIndex: assignment.chapterIndex,
        mediaIds: [],
      };
      batchByChapterId.set(assignment.chapterId, batch);
      chapterOrder.push(assignment.chapterId);
    }
    batch.mediaIds.push(assignment.mediaId);
  }

  return chapterOrder
    .map((chapterId) => batchByChapterId.get(chapterId))
    .filter((batch): batch is MagicChapterBatch => Boolean(batch));
}

/** Construit la partition (lots chapitre → fade-out). */
export function buildMagicTimeline(
  storyboard: WizardStoryboardState,
  recommendedCapacities: readonly (number | null)[],
  random: () => number = Math.random,
): MagicTimelineEvent[] {
  const assignments = planMagicMediaAssignments(
    storyboard,
    recommendedCapacities,
    random,
  );

  const batches = groupAssignmentsIntoChapterBatches(assignments);

  if (batches.length === 0) {
    return [{ kind: "complete" }];
  }

  const events: MagicTimelineEvent[] = [];

  for (const batch of batches) {
    events.push({
      kind: "scrollToChapter",
      chapterId: batch.chapterId,
      chapterIndex: batch.chapterIndex,
    });
    events.push({
      kind: "assignChapterBatch",
      chapterId: batch.chapterId,
      chapterIndex: batch.chapterIndex,
      mediaIds: batch.mediaIds,
    });
  }

  events.push({ kind: "complete" });
  return events;
}
