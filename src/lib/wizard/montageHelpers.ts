import type { HydratedMediaApiItem } from "@/src/lib/media/mediaTypes";
import {
  emptyMontageState,
  flattenActOrder,
  flattenMontageOrder,
  MONTAGE_ACT_IDS,
  type MontageActId,
  type WizardMontageState,
} from "@/src/lib/wizard/wizardState";

export const UNASSIGNED_CONTAINER_ID = "act-unassigned";

export type MontageMediaItem = {
  assetId: string;
  displayName: string;
  previewUrl: string | null;
  mimeType: string | null;
  sizeBytes: number;
  orderIndex: number;
  isVideo: boolean;
};

const REORDER_DEBOUNCE_MS = 300;

export function mediaApiToMontageItems(
  items: HydratedMediaApiItem[],
): MontageMediaItem[] {
  return [...items]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item) => ({
      assetId: item.assetId,
      displayName: item.displayName,
      previewUrl: item.previewUrl,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      orderIndex: item.orderIndex,
      isVideo:
        (item.mimeType ?? "").startsWith("video/") ||
        /\.(mp4|mov)$/i.test(item.displayName),
    }));
}

/**
 * Reconcile persisted acts with current media_assets list.
 * Unknown IDs are dropped; new assets append to Act I (spark).
 */
export function mergeMontageWithMedia(
  montage: WizardMontageState,
  mediaAssetIds: string[],
): WizardMontageState {
  const valid = new Set(mediaAssetIds);
  const unassignedSet = new Set(montage.unassignedIds ?? []);
  const acts = emptyMontageState().acts;
  const seen = new Set<string>();

  for (const actId of MONTAGE_ACT_IDS) {
    acts[actId] = (montage.acts[actId] ?? []).filter((id) => {
      if (!valid.has(id) || seen.has(id) || unassignedSet.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  const unassignedIds = (montage.unassignedIds ?? []).filter(
    (id) => valid.has(id) && !seen.has(id),
  );
  for (const id of unassignedIds) seen.add(id);

  const unassigned = mediaAssetIds.filter((id) => !seen.has(id));
  if (unassigned.length) {
    acts.spark = [...acts.spark, ...unassigned];
  }

  const totalAssigned = flattenActOrder(acts).length;
  if (totalAssigned === 0 && mediaAssetIds.length > 0 && !unassignedIds.length) {
    return {
      acts: {
        spark: [...mediaAssetIds],
        epic: [],
        legacy: [],
      },
      unassignedIds: [],
      excludedIds: montage.excludedIds.filter((id) => valid.has(id)),
      focalPoints: Object.fromEntries(
        Object.entries(montage.focalPoints).filter(([id]) => valid.has(id)),
      ),
    };
  }

  return {
    acts,
    unassignedIds,
    excludedIds: montage.excludedIds.filter((id) => valid.has(id)),
    focalPoints: Object.fromEntries(
      Object.entries(montage.focalPoints).filter(([id]) => valid.has(id)),
    ),
  };
}

/** Moves an asset into `targetAct`, removing it from any other act. */
export function assignAssetToAct(
  acts: Record<MontageActId, string[]>,
  assetId: string,
  targetAct: MontageActId,
): Record<MontageActId, string[]> {
  const next: Record<MontageActId, string[]> = {
    spark: acts.spark.filter((id) => id !== assetId),
    epic: acts.epic.filter((id) => id !== assetId),
    legacy: acts.legacy.filter((id) => id !== assetId),
  };
  next[targetAct] = [...next[targetAct], assetId];
  return next;
}

export function droppableActId(actId: MontageActId): string {
  return `act-${actId}`;
}

export function parseDroppableActId(id: string): MontageActId | null {
  if (id === "act-spark") return "spark";
  if (id === "act-epic") return "epic";
  if (id === "act-legacy") return "legacy";
  return null;
}

export function isUnassignedContainerId(id: string): boolean {
  return id === UNASSIGNED_CONTAINER_ID;
}

export function findContainerForAsset(
  montage: WizardMontageState,
  assetId: string,
): MontageActId | "unassigned" | null {
  const actId = findActForAsset(montage.acts, assetId);
  if (actId) return actId;
  if (montage.unassignedIds?.includes(assetId)) return "unassigned";
  return null;
}

export type MontageDropTarget =
  | { kind: "act"; actId: MontageActId }
  | { kind: "unassigned" };

export function resolveMontageDropTarget(
  overId: string,
  montage: WizardMontageState,
): MontageDropTarget | null {
  if (isUnassignedContainerId(overId)) return { kind: "unassigned" };
  const actFromContainer = parseDroppableActId(overId);
  if (actFromContainer) return { kind: "act", actId: actFromContainer };
  const actFromItem = findActForAsset(montage.acts, overId);
  if (actFromItem) return { kind: "act", actId: actFromItem };
  if (montage.unassignedIds?.includes(overId)) return { kind: "unassigned" };
  return null;
}

function stripIdsFromMontage(
  montage: WizardMontageState,
  ids: Set<string>,
): WizardMontageState {
  return {
    ...montage,
    acts: {
      spark: montage.acts.spark.filter((id) => !ids.has(id)),
      epic: montage.acts.epic.filter((id) => !ids.has(id)),
      legacy: montage.acts.legacy.filter((id) => !ids.has(id)),
    },
    unassignedIds: (montage.unassignedIds ?? []).filter((id) => !ids.has(id)),
  };
}

/** Retire des actes et place en zone non assignée (sans supprimer le fichier). */
export function removeMediaFromMontage(
  montage: WizardMontageState,
  assetIds: string | string[],
): WizardMontageState {
  const ids = Array.isArray(assetIds) ? assetIds : [assetIds];
  const idSet = new Set(ids);
  const stripped = stripIdsFromMontage(montage, idSet);
  const nextUnassigned = [...(stripped.unassignedIds ?? [])];
  for (const id of ids) {
    if (!nextUnassigned.includes(id)) nextUnassigned.push(id);
  }

  const nextExcluded = stripped.excludedIds.filter((id) => !idSet.has(id));
  const nextFocal = { ...stripped.focalPoints };
  for (const id of ids) delete nextFocal[id];

  return {
    ...stripped,
    unassignedIds: nextUnassigned,
    excludedIds: nextExcluded,
    focalPoints: nextFocal,
  };
}

/** Retire définitivement des IDs du montage (après suppression en base). */
export function purgeMediaFromMontage(
  montage: WizardMontageState,
  assetIds: string | string[],
): WizardMontageState {
  const idSet = new Set(Array.isArray(assetIds) ? assetIds : [assetIds]);
  const stripped = stripIdsFromMontage(montage, idSet);
  const nextFocal = { ...stripped.focalPoints };
  for (const id of idSet) delete nextFocal[id];

  return {
    ...stripped,
    excludedIds: stripped.excludedIds.filter((id) => !idSet.has(id)),
    focalPoints: nextFocal,
  };
}

/** Déplace un bloc d'IDs vers une cible (acte ou non assigné) en conservant l'ordre du bloc. */
export function moveMontageItems(
  montage: WizardMontageState,
  idsToMove: string[],
  target: MontageDropTarget,
  insertIndex: number,
): WizardMontageState {
  if (!idsToMove.length) return montage;

  const moveSet = new Set(idsToMove);
  const stripped = stripIdsFromMontage(montage, moveSet);

  if (target.kind === "unassigned") {
    const unassigned = [...(stripped.unassignedIds ?? [])];
    const clamped = Math.min(Math.max(insertIndex, 0), unassigned.length);
    unassigned.splice(clamped, 0, ...idsToMove);
    return { ...stripped, unassignedIds: unassigned };
  }

  const targetItems = [...stripped.acts[target.actId]];
  const clamped = Math.min(Math.max(insertIndex, 0), targetItems.length);
  targetItems.splice(clamped, 0, ...idsToMove);

  return {
    ...stripped,
    acts: {
      ...stripped.acts,
      [target.actId]: targetItems,
    },
  };
}

export function orderIdsForMultiDrag(
  montage: WizardMontageState,
  ids: string[],
): string[] {
  const idSet = new Set(ids);
  return flattenMontageOrder(montage).filter((id) => idSet.has(id));
}

/** Plage Shift+clic dans la même colonne (acte ou non assigné). */
export function getSelectionRangeIds(
  montage: WizardMontageState,
  anchorId: string,
  targetId: string,
): string[] {
  const lists = [
    ...MONTAGE_ACT_IDS.map((actId) => montage.acts[actId]),
    montage.unassignedIds ?? [],
  ];

  for (const list of lists) {
    const anchorIndex = list.indexOf(anchorId);
    const targetIndex = list.indexOf(targetId);
    if (anchorIndex === -1 || targetIndex === -1) continue;

    const start = Math.min(anchorIndex, targetIndex);
    const end = Math.max(anchorIndex, targetIndex);
    return list.slice(start, end + 1);
  }

  return [targetId];
}

export function findActForAsset(
  acts: Record<MontageActId, string[]>,
  assetId: string,
): MontageActId | null {
  for (const actId of MONTAGE_ACT_IDS) {
    if (acts[actId].includes(assetId)) return actId;
  }
  return null;
}

export function resolveDropTargetActId(
  overId: string,
  acts: Record<MontageActId, string[]>,
): MontageActId | null {
  const container = parseDroppableActId(overId);
  if (container) return container;
  return findActForAsset(acts, overId);
}

export async function persistMediaReorder(
  projectId: string,
  flatOrder: string[],
): Promise<void> {
  if (!flatOrder.length) return;

  const payload = flatOrder.map((id, order_index) => ({ id, order_index }));
  const res = await fetch(`/api/projects/${projectId}/media/reorder`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items: payload }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;
    throw new Error(body?.message ?? body?.error ?? `HTTP ${res.status}`);
  }
}

export { REORDER_DEBOUNCE_MS, flattenMontageOrder };
