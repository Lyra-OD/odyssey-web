"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AnimatePresence } from "framer-motion";
import { Loader2, Copy } from "lucide-react";

import { MontageActColumn } from "@/src/components/tribute/montage/MontageActColumn";
import { MontageDirectorModal } from "@/src/components/tribute/montage/MontageDirectorModal";
import {
  MontageMediaCardDragOverlay,
  MontageMultiDragOverlay,
} from "@/src/components/tribute/montage/MontageMediaCard";
import { MontageSelectionBar } from "@/src/components/tribute/montage/MontageSelectionBar";
import { MontageUnassignedColumn } from "@/src/components/tribute/montage/MontageUnassignedColumn";
import { useMontageAutoScroll } from "@/src/hooks/useMontageAutoScroll";
import { fetchProjectMedia } from "@/src/hooks/useMassMediaUpload";
import {
  REORDER_DEBOUNCE_MS,
  assignAssetToAct,
  getSelectionRangeIds,
  mediaApiToMontageItems,
  mergeMontageWithMedia,
  orderIdsForMultiDrag,
  removeMediaFromMontage,
  persistMediaReorder,
  flattenMontageOrder,
  purgeMediaFromMontage,
  type MontageMediaItem,
} from "@/src/lib/wizard/montageHelpers";
import {
  analyzeMediaDuplicates,
  deleteProjectMediaAsset,
} from "@/src/lib/wizard/mediaDuplicates";
import { montageCollisionDetection } from "@/src/lib/wizard/montageCollisionDetection";
import {
  applyMontageDropIntent,
  computeMontageDropIntent,
  type MontageInsertionPreview,
} from "@/src/lib/wizard/montageDropIntent";
import {
  MONTAGE_ACT_IDS,
  type MontageActId,
  type MontageFocalPoint,
  type WizardMontageState,
} from "@/src/lib/wizard/wizardState";

export type MontageStepCopy = {
  loading: string;
  empty: string;
  instruction: string;
  shortcutSelect: string;
  shortcutSelectAll: string;
  shortcutDrag: string;
  focalHint: string;
  clickToEdit: string;
  dragHandle: string;
  remove: string;
  unassignedTitle: string;
  unassignedHint: string;
  multiDragLabel: string;
  clearSelection: string;
  selectAll: string;
  selectionCount: string;
  allSelected: string;
  shortcutEscape: string;
  selectionHint: string;
  duplicatesBanner: string;
  duplicatesHint: string;
  removeDuplicates: string;
  removingDuplicates: string;
  duplicateBadge: string;
  deleteDuplicate: string;
  actSparkLabel: string;
  actSparkSubtitle: string;
  actEpicLabel: string;
  actEpicSubtitle: string;
  actLegacyLabel: string;
  actLegacySubtitle: string;
  actEmptyHint: string;
  exclude: string;
  include: string;
  excludedBadge: string;
  directorClose: string;
  directorPrevious: string;
  directorNext: string;
  directorCounter: string;
};

type Props = {
  projectId: string;
  montage: WizardMontageState;
  onMontageChange: (next: WizardMontageState) => void;
  copy: MontageStepCopy;
};

const ACT_COPY_KEYS: Record<
  MontageActId,
  { label: keyof MontageStepCopy; subtitle: keyof MontageStepCopy }
> = {
  spark: { label: "actSparkLabel", subtitle: "actSparkSubtitle" },
  epic: { label: "actEpicLabel", subtitle: "actEpicSubtitle" },
  legacy: { label: "actLegacyLabel", subtitle: "actLegacySubtitle" },
};

export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;

  const uaData = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData;
  const platformHint = uaData?.platform;
  if (platformHint) {
    return platformHint.toLowerCase().includes("mac");
  }

  const platform = navigator.platform ?? "";
  return /Mac|iPhone|iPad|iPod/.test(platform);
}

export function MontageStep({
  projectId,
  montage,
  onMontageChange,
  copy,
}: Props) {
  const [mediaItems, setMediaItems] = useState<MontageMediaItem[]>([]);
  const [gridMontage, setGridMontage] = useState<WizardMontageState>(montage);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [draggingIds, setDraggingIds] = useState<Set<string>>(() => new Set());
  const [insertionPreview, setInsertionPreview] =
    useState<MontageInsertionPreview | null>(null);
  const [navigationOrder, setNavigationOrder] = useState<string[]>([]);
  const [isMacOs, setIsMacOs] = useState(false);
  const [isRemovingDuplicates, setIsRemovingDuplicates] = useState(false);
  const reorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const montageRef = useRef(gridMontage);
  const dragStartMontageRef = useRef<WizardMontageState | null>(null);
  const draggingIdsRef = useRef<string[]>([]);
  const insertionPreviewRef = useRef<MontageInsertionPreview | null>(null);
  const lastSelectedIdRef = useRef<string | null>(null);
  const selectedIdsRef = useRef(selectedIds);
  montageRef.current = gridMontage;
  selectedIdsRef.current = selectedIds;
  insertionPreviewRef.current = insertionPreview;

  const autoScroll = useMontageAutoScroll();
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    setIsMacOs(isMac());
  }, []);

  useEffect(() => {
    if (!activeDragId) {
      setGridMontage(montage);
      montageRef.current = montage;
    }
  }, [montage, activeDragId]);

  const mediaById = useMemo(
    () => new Map(mediaItems.map((item) => [item.assetId, item])),
    [mediaItems],
  );

  const selectedItem = selectedAssetId
    ? mediaById.get(selectedAssetId) ?? null
    : null;

  const unassignedIds = gridMontage.unassignedIds ?? [];

  const duplicateIds = useMemo(
    () => analyzeMediaDuplicates(mediaItems).duplicateIds,
    [mediaItems],
  );
  const duplicateCount = duplicateIds.size;

  const scheduleReorderPersist = useCallback(
    (next: WizardMontageState) => {
      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
      reorderTimerRef.current = setTimeout(() => {
        reorderTimerRef.current = null;
        void persistMediaReorder(projectId, flattenMontageOrder(next)).catch(
          () => {
            // silent
          },
        );
      }, REORDER_DEBOUNCE_MS);
    },
    [projectId],
  );

  const commitMontage = useCallback(
    (next: WizardMontageState, persistOrder = false) => {
      setGridMontage(next);
      montageRef.current = next;
      onMontageChange(next);
      if (persistOrder) scheduleReorderPersist(next);
    },
    [onMontageChange, scheduleReorderPersist],
  );

  useEffect(() => {
    let aborted = false;
    setIsLoading(true);
    setLoadError(null);

    void fetchProjectMedia(projectId)
      .then((apiItems) => {
        if (aborted) return;
        const items = mediaApiToMontageItems(apiItems);
        setMediaItems(items);
        const ids = items.map((item) => item.assetId);
        setNavigationOrder((prev) => {
          if (!prev.length) return ids;
          const seen = new Set(prev);
          const appended = ids.filter((id) => !seen.has(id));
          return appended.length ? [...prev, ...appended] : prev;
        });
        const merged = mergeMontageWithMedia(montageRef.current, ids);
        commitMontage(merged);
      })
      .catch((err) => {
        if (!aborted) {
          setLoadError(err instanceof Error ? err.message : "load_failed");
        }
      })
      .finally(() => {
        if (!aborted) setIsLoading(false);
      });

    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per project
  }, [projectId]);

  useEffect(() => {
    return () => {
      if (reorderTimerRef.current) clearTimeout(reorderTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedAssetId) return;
    if (!mediaById.has(selectedAssetId)) {
      setSelectedAssetId(null);
    }
  }, [mediaById, selectedAssetId]);

  const handleCardClick = useCallback(
    (assetId: string, event: MouseEvent) => {
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(assetId)) next.delete(assetId);
          else next.add(assetId);
          return next;
        });
        lastSelectedIdRef.current = assetId;
        return;
      }

      if (event.shiftKey && lastSelectedIdRef.current) {
        event.preventDefault();
        const range = getSelectionRangeIds(
          montageRef.current,
          lastSelectedIdRef.current,
          assetId,
        );
        setSelectedIds(new Set(range));
        return;
      }

      lastSelectedIdRef.current = assetId;
      setSelectedIds(new Set());
      setSelectedAssetId(assetId);
    },
    [],
  );

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedIdRef.current = null;
  }, []);

  const allMediaIds = useMemo(
    () => flattenMontageOrder(gridMontage),
    [gridMontage],
  );
  const totalMediaCount = allMediaIds.length;

  const handleSelectAll = useCallback(() => {
    if (!allMediaIds.length) return;
    setSelectedAssetId(null);
    setSelectedIds(new Set(allMediaIds));
    lastSelectedIdRef.current = allMediaIds[allMediaIds.length - 1] ?? null;
  }, [allMediaIds]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (!prev.size) return prev;
      const valid = new Set(allMediaIds);
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [allMediaIds]);

  useEffect(() => {
    if (selectedAssetId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const mod = isMacOs ? event.metaKey : event.ctrlKey;

      if (mod && event.key.toLowerCase() === "a") {
        event.preventDefault();
        handleSelectAll();
        return;
      }

      if (event.key === "Escape" && selectedIdsRef.current.size > 0) {
        event.preventDefault();
        handleClearSelection();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    selectedAssetId,
    isMacOs,
    handleSelectAll,
    handleClearSelection,
  ]);

  const handleCloseDirector = useCallback(() => {
    setSelectedAssetId(null);
  }, []);

  const handleDeleteAssets = useCallback(
    async (assetIds: string[]) => {
      if (!assetIds.length) return;

      setIsRemovingDuplicates(true);
      try {
        const results = await Promise.allSettled(
          assetIds.map((id) => deleteProjectMediaAsset(projectId, id)),
        );
        const deleted = assetIds.filter(
          (_, index) => results[index].status === "fulfilled",
        );
        if (!deleted.length) return;

        const deletedSet = new Set(deleted);
        setMediaItems((prev) =>
          prev.filter((item) => !deletedSet.has(item.assetId)),
        );
        setNavigationOrder((prev) => prev.filter((id) => !deletedSet.has(id)));

        const next = purgeMediaFromMontage(montageRef.current, deleted);
        commitMontage(next, true);

        setSelectedIds((prev) => {
          const nextSelection = new Set(prev);
          for (const id of deleted) nextSelection.delete(id);
          return nextSelection;
        });

        if (selectedAssetId && deletedSet.has(selectedAssetId)) {
          setSelectedAssetId(null);
        }
      } finally {
        setIsRemovingDuplicates(false);
      }
    },
    [projectId, commitMontage, selectedAssetId],
  );

  const handleRemoveAllDuplicates = useCallback(() => {
    void handleDeleteAssets(Array.from(duplicateIds));
  }, [duplicateIds, handleDeleteAssets]);

  const handleRemoveMedia = useCallback(
    (assetId: string) => {
      if (duplicateIds.has(assetId)) {
        const idsToDelete =
          selectedIdsRef.current.has(assetId) &&
          selectedIdsRef.current.size > 1
            ? Array.from(selectedIdsRef.current).filter((id) =>
                duplicateIds.has(id),
              )
            : [assetId];
        void handleDeleteAssets(idsToDelete);
        return;
      }

      const idsToRemove =
        selectedIdsRef.current.has(assetId) && selectedIdsRef.current.size > 1
          ? Array.from(selectedIdsRef.current)
          : [assetId];

      const next = removeMediaFromMontage(montageRef.current, idsToRemove);
      commitMontage(next, true);

      setSelectedIds((prev) => {
        const nextSelection = new Set(prev);
        for (const id of idsToRemove) nextSelection.delete(id);
        return nextSelection;
      });

      if (selectedAssetId && idsToRemove.includes(selectedAssetId)) {
        setSelectedAssetId(null);
      }
    },
    [commitMontage, duplicateIds, handleDeleteAssets, selectedAssetId],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeId = String(event.active.id);
    dragStartMontageRef.current = montageRef.current;
    setActiveDragId(activeId);
    setInsertionPreview(null);

    const selection = selectedIdsRef.current;
    const ids =
      selection.has(activeId) && selection.size > 1
        ? orderIdsForMultiDrag(montageRef.current, Array.from(selection))
        : [activeId];

    draggingIdsRef.current = ids;
    setDraggingIds(new Set(ids));
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
    draggingIdsRef.current = [];
    setDraggingIds(new Set());
    setInsertionPreview(null);

    if (dragStartMontageRef.current) {
      setGridMontage(dragStartMontageRef.current);
      montageRef.current = dragStartMontageRef.current;
    }
    dragStartMontageRef.current = null;
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (!event.over) {
      setInsertionPreview(null);
      return;
    }

    const base = dragStartMontageRef.current ?? montageRef.current;
    const idsToMove = draggingIdsRef.current;
    if (!idsToMove.length) return;

    setInsertionPreview(computeMontageDropIntent(event, base, idsToMove));
  }, []);

  const handleDragEnd = useCallback(
    (_event: DragEndEvent) => {
      const base = dragStartMontageRef.current ?? montageRef.current;
      const idsToMove = draggingIdsRef.current;
      const intent = insertionPreviewRef.current;

      if (intent && idsToMove.length) {
        const next = applyMontageDropIntent(base, idsToMove, intent);
        commitMontage(next, true);
        setSelectedIds(new Set(idsToMove));
        lastSelectedIdRef.current = idsToMove[idsToMove.length - 1] ?? null;
      }

      setActiveDragId(null);
      draggingIdsRef.current = [];
      setDraggingIds(new Set());
      setInsertionPreview(null);
      dragStartMontageRef.current = null;
    },
    [commitMontage],
  );

  const activeDragMeta = useMemo(() => {
    if (!activeDragId) return null;
    const item = mediaById.get(activeDragId);
    if (!item) return null;

    for (const actId of MONTAGE_ACT_IDS) {
      const index = gridMontage.acts[actId].indexOf(activeDragId);
      if (index !== -1) {
        return {
          actId,
          item,
          index,
          isExcluded: gridMontage.excludedIds.includes(activeDragId),
          hasFocalPoint: Boolean(gridMontage.focalPoints[activeDragId]),
        };
      }
    }

    const unassignedIndex = unassignedIds.indexOf(activeDragId);
    if (unassignedIndex !== -1) {
      return {
        actId: "spark" as MontageActId,
        item,
        index: unassignedIndex,
        isExcluded: false,
        hasFocalPoint: false,
      };
    }

    return null;
  }, [activeDragId, mediaById, gridMontage, unassignedIds]);

  const handleAssignAct = useCallback(
    (assetId: string, targetAct: MontageActId) => {
      const current = montageRef.current;
      const nextActs = assignAssetToAct(current.acts, assetId, targetAct);
      const nextUnassigned = (current.unassignedIds ?? []).filter(
        (id) => id !== assetId,
      );
      commitMontage(
        { ...current, acts: nextActs, unassignedIds: nextUnassigned },
        true,
      );
    },
    [commitMontage],
  );

  const handleToggleExclude = useCallback(
    (assetId: string) => {
      const current = montageRef.current;
      const excluded = new Set(current.excludedIds);
      if (excluded.has(assetId)) excluded.delete(assetId);
      else excluded.add(assetId);
      commitMontage({
        ...current,
        excludedIds: Array.from(excluded),
      });
    },
    [commitMontage],
  );

  const handleSetFocalPoint = useCallback(
    (assetId: string, point: MontageFocalPoint) => {
      const current = montageRef.current;
      commitMontage({
        ...current,
        focalPoints: { ...current.focalPoints, [assetId]: point },
      });
    },
    [commitMontage],
  );

  const handleClearFocalPoint = useCallback(
    (assetId: string) => {
      const current = montageRef.current;
      const { [assetId]: _, ...rest } = current.focalPoints;
      commitMontage({ ...current, focalPoints: rest });
    },
    [commitMontage],
  );

  const cardCopy = {
    clickToEdit: copy.clickToEdit,
    dragHandle: copy.dragHandle,
    remove: copy.remove,
    duplicateBadge: copy.duplicateBadge,
    deleteDuplicate: copy.deleteDuplicate,
  };

  const multiDragCount = draggingIds.size;
  const multiDragItems = useMemo(() => {
    if (!activeDragId || draggingIds.size <= 1) return [];
    return Array.from(draggingIds)
      .map((id) => mediaById.get(id))
      .filter((item): item is MontageMediaItem => Boolean(item));
  }, [activeDragId, draggingIds, mediaById]);

  const isDragging = Boolean(activeDragId);
  const selectShortcut = copy.shortcutSelect.replace(
    "{modifier}",
    isMacOs ? "⌘" : "Ctrl",
  );
  const selectAllShortcut = copy.shortcutSelectAll.replace(
    "{modifier}",
    isMacOs ? "⌘" : "Ctrl",
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-teal-400/70" />
        <p className="text-sm font-light">{copy.loading}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <p className="rounded-xl border border-fuchsia-500/40 bg-fuchsia-950/10 px-4 py-6 text-sm text-fuchsia-200/90">
        {loadError}
      </p>
    );
  }

  if (!mediaItems.length) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm font-light text-zinc-500">
        {copy.empty}
      </p>
    );
  }

  return (
    <>
      <div
        className="mb-8 border-b border-white/[0.06] pb-5"
        role="region"
        aria-label={copy.instruction}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <p className="max-w-2xl text-sm font-light leading-relaxed text-zinc-400 md:text-base">
            {copy.instruction}
          </p>
          <p className="shrink-0 text-right text-xs text-zinc-500">
            <span>{selectAllShortcut}</span>
            <span className="mx-2 text-zinc-700" aria-hidden>
              ·
            </span>
            <span>{selectShortcut}</span>
            <span className="mx-2 text-zinc-700" aria-hidden>
              ·
            </span>
            <span>{copy.shortcutDrag}</span>
          </p>
        </div>
      </div>

      <MontageSelectionBar
        totalCount={totalMediaCount}
        selectedCount={selectedIds.size}
        copy={{
          selectAll: copy.selectAll,
          clearSelection: copy.clearSelection,
          selectionCount: copy.selectionCount,
          allSelected: copy.allSelected,
          selectionHint: copy.selectionHint,
          shortcutEscape: copy.shortcutEscape,
        }}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
      />

      {duplicateCount > 0 ? (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Copy
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
              strokeWidth={1.8}
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium text-amber-200/95">
                {copy.duplicatesBanner.replace(
                  "{count}",
                  String(duplicateCount),
                )}
              </p>
              <p className="mt-0.5 text-xs font-light text-zinc-500">
                {copy.duplicatesHint}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveAllDuplicates}
            disabled={isRemovingDuplicates}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRemovingDuplicates ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                {copy.removingDuplicates}
              </>
            ) : (
              copy.removeDuplicates
            )}
          </button>
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        autoScroll={autoScroll}
        collisionDetection={montageCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-10 xl:grid-cols-3 xl:gap-6">
          {MONTAGE_ACT_IDS.map((actId, index) => {
            const keys = ACT_COPY_KEYS[actId];
            return (
              <MontageActColumn
                key={actId}
                actId={actId}
                columnIndex={index}
                assetIds={gridMontage.acts[actId]}
                mediaById={mediaById}
                montage={gridMontage}
                selectedIds={selectedIds}
                draggingIds={draggingIds}
                insertionPreview={insertionPreview}
                isDragging={isDragging}
                duplicateIds={duplicateIds}
                copy={{
                  ...cardCopy,
                  actLabel: copy[keys.label],
                  actSubtitle: copy[keys.subtitle],
                  emptyHint: copy.actEmptyHint,
                }}
                onCardClick={handleCardClick}
                onRemoveMedia={handleRemoveMedia}
              />
            );
          })}
        </div>

        <MontageUnassignedColumn
          assetIds={unassignedIds}
          mediaById={mediaById}
          montage={gridMontage}
          selectedIds={selectedIds}
          draggingIds={draggingIds}
          insertionPreview={insertionPreview}
          isDragging={isDragging}
          duplicateIds={duplicateIds}
          copy={{
            ...cardCopy,
            title: copy.unassignedTitle,
            emptyHint: copy.unassignedHint,
          }}
          onCardClick={handleCardClick}
          onRemoveMedia={handleRemoveMedia}
        />

        <DragOverlay
          dropAnimation={{
            duration: 220,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {multiDragCount > 1 && multiDragItems.length ? (
            <MontageMultiDragOverlay
              count={multiDragCount}
              label={copy.multiDragLabel}
              items={multiDragItems}
              actId={activeDragMeta?.actId ?? "spark"}
              copy={cardCopy}
            />
          ) : activeDragMeta ? (
            <div className="w-[min(100%,11rem)] sm:w-44">
              <MontageMediaCardDragOverlay
                actId={activeDragMeta.actId}
                item={activeDragMeta.item}
                index={activeDragMeta.index}
                isExcluded={activeDragMeta.isExcluded}
                hasFocalPoint={activeDragMeta.hasFocalPoint}
                copy={cardCopy}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <AnimatePresence
        onExitComplete={() => {
          document.body.style.overflow = "";
        }}
      >
        {selectedAssetId && selectedItem ? (
          <MontageDirectorModal
            key={selectedAssetId}
            item={selectedItem}
            montage={gridMontage}
            navigationOrder={navigationOrder}
            copy={{
              close: copy.directorClose,
              focalHint: copy.focalHint,
              exclude: copy.exclude,
              include: copy.include,
              remove: copy.remove,
              previous: copy.directorPrevious,
              next: copy.directorNext,
              actSpark: copy.actSparkSubtitle,
              actEpic: copy.actEpicSubtitle,
              actLegacy: copy.actLegacySubtitle,
              counter: copy.directorCounter,
            }}
            onClose={handleCloseDirector}
            onNavigate={setSelectedAssetId}
            onAssignAct={handleAssignAct}
            onToggleExclude={handleToggleExclude}
            onSetFocalPoint={handleSetFocalPoint}
            onClearFocalPoint={handleClearFocalPoint}
            onRemoveMedia={handleRemoveMedia}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
