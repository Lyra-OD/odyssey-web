import type { DragOverEvent } from "@dnd-kit/core";

import {
  UNASSIGNED_CONTAINER_ID,
  droppableActId,
  isUnassignedContainerId,
  moveMontageItems,
  parseDroppableActId,
  resolveMontageDropTarget,
  type MontageDropTarget,
} from "@/src/lib/wizard/montageHelpers";
import type { WizardMontageState } from "@/src/lib/wizard/wizardState";

export type MontageInsertionPreview = {
  target: MontageDropTarget;
  index: number;
};

function containerIdForTarget(target: MontageDropTarget): string {
  return target.kind === "unassigned"
    ? UNASSIGNED_CONTAINER_ID
    : droppableActId(target.actId);
}

function filteredTargetList(
  montage: WizardMontageState,
  target: MontageDropTarget,
  movingIds: Set<string>,
): string[] {
  const source =
    target.kind === "unassigned"
      ? (montage.unassignedIds ?? [])
      : montage.acts[target.actId];
  return source.filter((id) => !movingIds.has(id));
}

/** Index d'insertion basé sur la position du curseur dans la grille de la colonne. */
export function resolveSmartInsertIndex(
  event: DragOverEvent,
  filteredIds: string[],
  columnContainerId: string,
): number {
  if (filteredIds.length === 0) return 0;

  const translated = event.active.rect.current.translated;
  const pointerY = translated
    ? translated.top + translated.height / 2
    : (event.activatorEvent as PointerEvent | undefined)?.clientY;

  if (pointerY == null) return filteredIds.length;

  const container = document.querySelector(
    `[data-drop-column="${columnContainerId}"]`,
  );
  if (!container) return filteredIds.length;

  const slots = filteredIds
    .map((id) => {
      const el = container.querySelector(`[data-sortable-id="${id}"]`);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { id, rect, top: rect.top, left: rect.left };
    })
    .filter((slot): slot is NonNullable<typeof slot> => slot !== null)
    .sort((a, b) => {
      if (Math.abs(a.top - b.top) > 10) return a.top - b.top;
      return a.left - b.left;
    });

  if (!slots.length) return filteredIds.length;

  for (let i = 0; i < slots.length; i++) {
    const midY = slots[i].rect.top + slots[i].rect.height / 2;
    if (pointerY < midY) {
      return filteredIds.indexOf(slots[i].id);
    }
  }

  return filteredIds.length;
}

function resolveInsertIndexForItem(
  event: DragOverEvent,
  filteredIds: string[],
  overId: string,
): number {
  const overIndex = filteredIds.indexOf(overId);
  if (overIndex === -1) return filteredIds.length;

  const activeRect = event.active.rect.current.translated;
  const overRect = event.over?.rect;
  if (!activeRect || !overRect) return overIndex;

  const isBelow = activeRect.top > overRect.top + overRect.height / 2;
  return isBelow ? overIndex + 1 : overIndex;
}

export function computeMontageDropIntent(
  event: DragOverEvent,
  montage: WizardMontageState,
  idsToMove: string[],
): MontageInsertionPreview | null {
  const { over } = event;
  if (!over || !idsToMove.length) return null;

  const overId = String(over.id);
  const target = resolveMontageDropTarget(overId, montage);
  if (!target) return null;

  const moveSet = new Set(idsToMove);
  const filtered = filteredTargetList(montage, target, moveSet);
  const containerId = containerIdForTarget(target);

  const index =
    parseDroppableActId(overId) || isUnassignedContainerId(overId)
      ? resolveSmartInsertIndex(event, filtered, containerId)
      : resolveInsertIndexForItem(event, filtered, overId);

  return {
    target,
    index: Math.min(Math.max(index, 0), filtered.length),
  };
}

export function applyMontageDropIntent(
  montage: WizardMontageState,
  idsToMove: string[],
  intent: MontageInsertionPreview,
): WizardMontageState {
  return moveMontageItems(montage, idsToMove, intent.target, intent.index);
}
