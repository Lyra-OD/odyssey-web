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

export type GridInsertSlot = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type GridInsertLine = {
  left: number;
  top: number;
  height: number;
};

const GRID_ROW_TOLERANCE_PX = 12;
const INSERT_BAR_PX = 4;

export function orderGridSlots(
  slots: readonly GridInsertSlot[],
): GridInsertSlot[] {
  return [...slots].sort((a, b) => {
    if (Math.abs(a.top - b.top) > GRID_ROW_TOLERANCE_PX) return a.top - b.top;
    return a.left - b.left;
  });
}

/**
 * Index d'insertion dans une grille (lecture gauche→droite, haut→bas).
 * Moitié gauche d'une tuile = avant ; moitié droite = après.
 */
export function resolveGridInsertIndex(
  slots: readonly GridInsertSlot[],
  pointerX: number,
  pointerY: number,
): number {
  if (slots.length === 0) return 0;

  const ordered = orderGridSlots(slots);

  let closest = ordered[0];
  let closestDist = Number.POSITIVE_INFINITY;
  for (const slot of ordered) {
    const cx = slot.left + slot.width / 2;
    const cy = slot.top + slot.height / 2;
    const dist =
      (pointerX - cx) * (pointerX - cx) + (pointerY - cy) * (pointerY - cy);
    if (dist < closestDist) {
      closestDist = dist;
      closest = slot;
    }
  }

  const after = pointerX > closest.left + closest.width / 2;
  const visualIndex = ordered.indexOf(closest);
  const insertAt = after ? visualIndex + 1 : visualIndex;
  return Math.max(0, Math.min(insertAt, ordered.length));
}

/** Barre verticale dans le gap (coords viewport). */
export function resolveGridInsertLine(
  slots: readonly GridInsertSlot[],
  insertIndex: number,
): GridInsertLine | null {
  const ordered = orderGridSlots(slots);
  if (ordered.length === 0) return null;

  const clamped = Math.max(0, Math.min(insertIndex, ordered.length));
  const bar = INSERT_BAR_PX;

  if (clamped <= 0) {
    const first = ordered[0];
    return { left: first.left - bar, top: first.top, height: first.height };
  }

  if (clamped >= ordered.length) {
    const last = ordered[ordered.length - 1];
    return {
      left: last.left + last.width,
      top: last.top,
      height: last.height,
    };
  }

  const prev = ordered[clamped - 1];
  const next = ordered[clamped];
  const sameRow = Math.abs(prev.top - next.top) <= GRID_ROW_TOLERANCE_PX;
  if (sameRow) {
    const gapCenter = (prev.left + prev.width + next.left) / 2;
    return {
      left: gapCenter - bar / 2,
      top: Math.min(prev.top, next.top),
      height: Math.max(prev.height, next.height),
    };
  }

  return {
    left: prev.left + prev.width,
    top: prev.top,
    height: prev.height,
  };
}

export function pointerFromDndDelta(
  activatorEvent: Event,
  delta: { x: number; y: number },
): { x: number; y: number } | null {
  if (!("clientX" in activatorEvent) || !("clientY" in activatorEvent)) {
    return null;
  }
  const start = activatorEvent as PointerEvent;
  return {
    x: start.clientX + delta.x,
    y: start.clientY + delta.y,
  };
}

export const STORYBOARD_CHAPTER_GRID_ATTR = "data-chapter-grid";
export const STORYBOARD_CHAPTER_GRID_SURFACE_ATTR = "data-chapter-grid-surface";

function pickChapterGrid(chapterId: string): HTMLElement | null {
  const selector = `[${STORYBOARD_CHAPTER_GRID_ATTR}="${CSS.escape(chapterId)}"]`;
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (nodes.length === 0) return null;
  const composer = nodes.find(
    (node) => node.getAttribute(STORYBOARD_CHAPTER_GRID_SURFACE_ATTR) === "composer",
  );
  if (composer && composer.getClientRects().length > 0) return composer;
  return (
    nodes.find(
      (node) =>
        node.getAttribute(STORYBOARD_CHAPTER_GRID_SURFACE_ATTR) !== "composer",
    ) ?? nodes[0]
  );
}

export type ChapterGridInsertMeasure = {
  index: number;
  line: GridInsertLine | null;
};

/** Mesure l'index + la barre d'insertion sous le curseur (grille visible). */
export function measureChapterGridInsert(
  chapterId: string,
  pointer: { x: number; y: number },
  excludeIds: ReadonlySet<string>,
): ChapterGridInsertMeasure {
  const grid = pickChapterGrid(chapterId);
  if (!grid) return { index: 0, line: null };

  const slots: GridInsertSlot[] = [];
  grid.querySelectorAll<HTMLElement>("[data-sortable-id]").forEach((el) => {
    const id = el.dataset.sortableId;
    if (!id || excludeIds.has(id)) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;
    slots.push({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  });

  const index = resolveGridInsertIndex(slots, pointer.x, pointer.y);
  return { index, line: resolveGridInsertLine(slots, index) };
}

export type StoryboardInsertPreview = {
  chapterId: string;
  index: number;
  line: GridInsertLine | null;
};
