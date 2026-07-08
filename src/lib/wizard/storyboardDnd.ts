/**
 * Identifiants et helpers dnd-kit pour l'Étape 5 — Livre Ouvert.
 */

import {
  closestCenter,
  pointerWithin,
  type CollisionDetection,
} from "@dnd-kit/core";

import { findChapterForMedia } from "@/src/lib/wizard/storyboardHelpers";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

export const STORYBOARD_MEDIA_DND_TYPE = "storyboard-media";
export const STORYBOARD_CHAPTER_BLOCK_DND_TYPE = "storyboard-chapter-block";

export const STORYBOARD_BANK_DROPPABLE_ID = "storyboard-bank";

export function storyboardChapterDroppableId(chapterId: string): string {
  return `storyboard-chapter-${chapterId}`;
}

export function storyboardChapterSortableId(chapterId: string): string {
  return `storyboard-chapter-sortable-${chapterId}`;
}

export function parseStoryboardChapterDroppableId(
  droppableId: string,
): string | null {
  const prefix = "storyboard-chapter-";
  if (!droppableId.startsWith(prefix)) return null;
  const rest = droppableId.slice(prefix.length);
  if (rest.startsWith("sortable-")) return null;
  return rest;
}

export function parseStoryboardChapterSortableId(
  sortableId: string,
): string | null {
  const prefix = "storyboard-chapter-sortable-";
  return sortableId.startsWith(prefix)
    ? sortableId.slice(prefix.length)
    : null;
}

export type StoryboardDragSource =
  | { kind: "bank" }
  | { kind: "chapter"; chapterId: string };

export type StoryboardMediaDragData = {
  type: typeof STORYBOARD_MEDIA_DND_TYPE;
  source: StoryboardDragSource;
  mediaIds: string[];
};

export type StoryboardChapterBlockDragData = {
  type: typeof STORYBOARD_CHAPTER_BLOCK_DND_TYPE;
  chapterId: string;
};

export type MediaSelectionScope =
  | { kind: "bank" }
  | { kind: "chapter"; chapterId: string };

export function orderBankSelection(
  unassignedIds: readonly string[],
  selectedIds: readonly string[],
): string[] {
  const selected = new Set(selectedIds);
  return unassignedIds.filter((id) => selected.has(id));
}

export function orderChapterSelection(
  chapterMediaIds: readonly string[],
  selectedIds: readonly string[],
): string[] {
  const selected = new Set(selectedIds);
  return chapterMediaIds.filter((id) => selected.has(id));
}

/** Plage Shift+clic dans la banque non assignée. */
export function getBankSelectionRangeIds(
  unassignedIds: readonly string[],
  anchorId: string,
  targetId: string,
): string[] {
  const anchorIndex = unassignedIds.indexOf(anchorId);
  const targetIndex = unassignedIds.indexOf(targetId);
  if (anchorIndex === -1 || targetIndex === -1) return [targetId];

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return unassignedIds.slice(start, end + 1);
}

/** Plage Shift+clic dans un chapitre. */
export function getChapterSelectionRangeIds(
  chapterMediaIds: readonly string[],
  anchorId: string,
  targetId: string,
): string[] {
  const anchorIndex = chapterMediaIds.indexOf(anchorId);
  const targetIndex = chapterMediaIds.indexOf(targetId);
  if (anchorIndex === -1 || targetIndex === -1) return [targetId];

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  return chapterMediaIds.slice(start, end + 1);
}

export function isStoryboardContainerId(overId: string): boolean {
  return (
    overId === STORYBOARD_BANK_DROPPABLE_ID ||
    parseStoryboardChapterDroppableId(overId) !== null
  );
}

/**
 * Priorise les zones de dépôt (banque / chapitre) sur les vignettes sortables
 * pour éviter les drops fantômes vers le mauvais chapitre.
 */
export const storyboardCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  const containerHits = pointerHits.filter((collision) =>
    isStoryboardContainerId(String(collision.id)),
  );
  if (containerHits.length > 0) return containerHits;
  return closestCenter(args);
};

export function resolveStoryboardDropChapterId(
  overId: string,
  storyboard: WizardStoryboardState,
): string | null {
  const fromContainer = parseStoryboardChapterDroppableId(overId);
  if (fromContainer) return fromContainer;
  return findChapterForMedia(storyboard.chapters, overId);
}

export type ResolvedDropTarget =
  | { kind: "bank" }
  | { kind: "chapter"; chapterId: string; overMediaId: string | null };

export function resolveDropTarget(
  overId: string | null | undefined,
  storyboard: WizardStoryboardState,
): ResolvedDropTarget | null {
  if (!overId) return null;
  if (overId === STORYBOARD_BANK_DROPPABLE_ID) return { kind: "bank" };

  const fromContainer = parseStoryboardChapterDroppableId(overId);
  if (fromContainer) {
    return { kind: "chapter", chapterId: fromContainer, overMediaId: null };
  }

  const chapterId = findChapterForMedia(storyboard.chapters, overId);
  if (chapterId) {
    return { kind: "chapter", chapterId, overMediaId: overId };
  }

  const fromSortable = parseStoryboardChapterSortableId(overId);
  if (fromSortable) {
    return { kind: "chapter", chapterId: fromSortable, overMediaId: null };
  }

  return null;
}

export function resolveInsertIndex(
  chapterMediaIds: readonly string[],
  overMediaId: string | null,
): number {
  if (!overMediaId) return chapterMediaIds.length;
  const overIndex = chapterMediaIds.indexOf(overMediaId);
  return overIndex === -1 ? chapterMediaIds.length : overIndex;
}
