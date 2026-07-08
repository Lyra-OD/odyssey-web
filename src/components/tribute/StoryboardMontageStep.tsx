"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchProjectMedia } from "@/src/hooks/useMassMediaUpload";
import { useMontageAutoScroll } from "@/src/hooks/useMontageAutoScroll";
import {
  MontageDirectorModal,
  type MontageDirectorModalCopy,
} from "@/src/components/tribute/montage/MontageDirectorModal";
import {
  MontageMediaCardDragOverlay,
  MontageMultiDragOverlay,
  type MontageMediaCardCopy,
} from "@/src/components/tribute/montage/MontageMediaCard";
import type { ChapterActionClusterCopy } from "@/src/components/tribute/storyboard/ChapterActionCluster";
import {
  ChapterRefinementDrawer,
  type ChapterRefinementDrawerCopy,
} from "@/src/components/tribute/storyboard/ChapterRefinementDrawer";
import type { ChapterCanvasGridCopy } from "@/src/components/tribute/storyboard/ChapterCanvasGrid";
import type { MediaBankColumnCopy } from "@/src/components/tribute/storyboard/MediaBankColumn";
import {
  resolveMontageChapterTabLabel,
  type MontageChapterTabsCopy,
} from "@/src/components/tribute/storyboard/MontageChapterTabs";
import {
  StoryboardFilmMap,
  type StoryboardFilmMapCopy,
  type StoryboardFilmMapSegment,
} from "@/src/components/tribute/storyboard/StoryboardFilmMap";
import { StoryboardOpenBookLayout } from "@/src/components/tribute/storyboard/StoryboardOpenBookLayout";
import { StoryboardChapterStack } from "@/src/components/tribute/storyboard/StoryboardChapterStack";
import { autoFillChapter, clearChapterMedia } from "@/src/lib/wizard/storyboardAutoFill";
import {
  findChapterForMedia,
  reorderStoryboardChapters,
  setChapterLabel,
} from "@/src/lib/wizard/storyboardHelpers";
import {
  STORYBOARD_BANK_DROPPABLE_ID,
  STORYBOARD_CHAPTER_BLOCK_DND_TYPE,
  STORYBOARD_MEDIA_DND_TYPE,
  getBankSelectionRangeIds,
  getChapterSelectionRangeIds,
  orderBankSelection,
  orderChapterSelection,
  parseStoryboardChapterSortableId,
  parseStoryboardChapterDroppableId,
  resolveDropTarget,
  resolveInsertIndex,
  storyboardCollisionDetection,
  type MediaSelectionScope,
  type StoryboardChapterBlockDragData,
  type StoryboardDragSource,
  type StoryboardMediaDragData,
} from "@/src/lib/wizard/storyboardDnd";
import {
  assignManyMediaToChapter,
  assignMediaToChapter,
  clearStoryboardFocalPoint,
  mergeStoryboardWithMedia,
  reorderChapterMedia,
  setStoryboardFocalPoint,
  toggleStoryboardMediaExclude,
  unassignManyMediaFromChapters,
  unassignMediaFromChapter,
} from "@/src/lib/wizard/storyboardMedia";
import {
  chapterRecommendedCapacity,
  resolveTargetSecondsPerMedia,
} from "@/src/lib/wizard/storyboardPacing";
import {
  mediaApiToMontageItems,
  type MontageMediaItem,
} from "@/src/lib/wizard/montageHelpers";
import type { PackageId } from "@/src/lib/wizard/wizardDeliverables";
import type {
  MontageFocalPoint,
  WizardStoryboardState,
} from "@/src/lib/wizard/wizardState";

export type StoryboardMontageStepCopy = {
  title: string;
  description: string;
  loading: string;
  chapterTabs: MontageChapterTabsCopy;
  card: MontageMediaCardCopy;
  director: MontageDirectorModalCopy;
  capacityRecommended: string;
  capacityPending: string;
  bankColumn: MediaBankColumnCopy;
  chapterGrid: ChapterCanvasGridCopy;
  chapterActions: ChapterActionClusterCopy;
  chapterTitleEditAria: string;
  chapterReorderAria: string;
  toggleSelectAria: string;
  filmMap: StoryboardFilmMapCopy;
  refinement: ChapterRefinementDrawerCopy;
  multiDragLabel: string;
};

type Props = {
  packageId: PackageId;
  projectId: string | null;
  storyboard: WizardStoryboardState;
  onStoryboardChange: (next: WizardStoryboardState) => void;
  copy: StoryboardMontageStepCopy;
};

function resolveChapterTitle(
  chapter: WizardStoryboardState["chapters"][number],
  index: number,
  chapterTabsCopy: MontageChapterTabsCopy,
): string {
  return (
    chapter.label?.trim() ||
    resolveMontageChapterTabLabel(index, chapterTabsCopy)
  );
}

export function StoryboardMontageStep({
  packageId,
  projectId,
  storyboard,
  onStoryboardChange,
  copy,
}: Props) {
  const [mediaItems, setMediaItems] = useState<MontageMediaItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [directorAssetId, setDirectorAssetId] = useState<string | null>(null);
  const [activeDragIds, setActiveDragIds] = useState<string[]>([]);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [selectionScope, setSelectionScope] =
    useState<MediaSelectionScope | null>(null);
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(
    null,
  );
  const [dropTargetChapterId, setDropTargetChapterId] = useState<string | null>(
    null,
  );
  const [dropTargetBank, setDropTargetBank] = useState(false);
  const [dragOverChapterIndex, setDragOverChapterIndex] = useState<
    number | null
  >(null);
  const [refinementChapterId, setRefinementChapterId] = useState<string | null>(
    null,
  );
  const storyboardRef = useRef(storyboard);
  const dragPayloadRef = useRef<{
    mediaIds: string[];
    source: StoryboardDragSource;
  } | null>(null);
  storyboardRef.current = storyboard;

  const autoScroll = useMontageAutoScroll();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (!projectId) return;
    let aborted = false;
    setIsLoadingMedia(true);
    void fetchProjectMedia(projectId)
      .then((items) => {
        if (aborted) return;
        const montageItems = mediaApiToMontageItems(items);
        setMediaItems(montageItems);
        onStoryboardChange(
          mergeStoryboardWithMedia(
            storyboardRef.current,
            montageItems.map((item) => item.assetId),
          ),
        );
      })
      .catch(() => {
        // Best-effort — les grilles restent vides si le fetch échoue.
      })
      .finally(() => {
        if (!aborted) setIsLoadingMedia(false);
      });
    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const mediaById = useMemo(
    () => new Map(mediaItems.map((item) => [item.assetId, item])),
    [mediaItems],
  );

  const unassignedItems = useMemo(
    () =>
      storyboard.unassignedIds
        .map((id) => mediaById.get(id))
        .filter((item): item is MontageMediaItem => Boolean(item)),
    [storyboard.unassignedIds, mediaById],
  );

  const chapterViewModels = useMemo(
    () =>
      storyboard.chapters.map((chapter, index) => ({
        chapter,
        index,
        title: resolveChapterTitle(chapter, index, copy.chapterTabs),
        items: chapter.mediaIds
          .map((id) => mediaById.get(id))
          .filter((item): item is MontageMediaItem => Boolean(item)),
      })),
    [storyboard.chapters, mediaById, copy.chapterTabs],
  );

  const filmMapSegments = useMemo((): StoryboardFilmMapSegment[] => {
    return storyboard.chapters.map((chapter, index) => ({
      chapterId: chapter.id,
      index,
      label: resolveChapterTitle(chapter, index, copy.chapterTabs),
      assignedCount: chapter.mediaIds.length,
      recommendedCapacity: chapterRecommendedCapacity(
        chapter.song?.durationSec,
        resolveTargetSecondsPerMedia(packageId, chapter.mood),
      ),
    }));
  }, [storyboard.chapters, copy.chapterTabs, packageId]);

  const refinementChapter = useMemo(() => {
    if (!refinementChapterId) return null;
    const index = storyboard.chapters.findIndex(
      (c) => c.id === refinementChapterId,
    );
    if (index < 0) return null;
    const chapter = storyboard.chapters[index];
    const capacity = chapterRecommendedCapacity(
      chapter.song?.durationSec,
      resolveTargetSecondsPerMedia(packageId, chapter.mood),
    );
    const items = chapter.mediaIds
      .map((id) => mediaById.get(id))
      .filter((item): item is MontageMediaItem => Boolean(item));
    const inCapacity =
      capacity === null ? items : items.slice(0, Math.max(capacity, 0));
    const beyondCapacity =
      capacity === null ? [] : items.slice(Math.max(capacity, 0));

    return {
      chapter,
      index,
      title: resolveChapterTitle(chapter, index, copy.chapterTabs),
      capacity,
      inCapacity,
      beyondCapacity,
      songLine: [chapter.song?.title, chapter.song?.artist]
        .filter(Boolean)
        .join(" — "),
    };
  }, [
    refinementChapterId,
    storyboard.chapters,
    mediaById,
    packageId,
    copy.chapterTabs,
  ]);

  const directorChapters = useMemo(
    () =>
      storyboard.chapters.map((chapter, index) => ({
        id: chapter.id,
        label: resolveChapterTitle(chapter, index, copy.chapterTabs),
      })),
    [storyboard.chapters, copy.chapterTabs],
  );

  const directorNavigationOrder = useMemo(() => {
    if (!directorAssetId) return [];
    const chapterId = findChapterForMedia(storyboard.chapters, directorAssetId);
    const chapter = storyboard.chapters.find((c) => c.id === chapterId);
    return chapter?.mediaIds ?? [];
  }, [directorAssetId, storyboard.chapters]);

  const directorItem = directorAssetId
    ? (mediaById.get(directorAssetId) ?? null)
    : null;

  const overlayItems = useMemo(
    () =>
      activeDragIds
        .map((id) => mediaById.get(id))
        .filter((item): item is MontageMediaItem => Boolean(item)),
    [activeDragIds, mediaById],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeData = event.active.data.current as
        | StoryboardChapterBlockDragData
        | StoryboardMediaDragData
        | undefined;

      if (activeData?.type === STORYBOARD_CHAPTER_BLOCK_DND_TYPE) {
        dragPayloadRef.current = null;
        setActiveDragIds([]);
        return;
      }

      const activeId = String(event.active.id);
      const source = activeData?.source ?? null;
      if (!source || activeData?.type !== STORYBOARD_MEDIA_DND_TYPE) {
        dragPayloadRef.current = null;
        setActiveDragIds([activeId]);
        return;
      }

      let mediaIds: string[] = [activeId];
      if (source.kind === "bank") {
        const inBankSelection =
          selectionScope?.kind === "bank" &&
          selectedMediaIds.includes(activeId);
        mediaIds = inBankSelection
          ? orderBankSelection(storyboard.unassignedIds, selectedMediaIds)
          : [activeId];
      } else {
        const chapter = storyboard.chapters.find(
          (c) => c.id === source.chapterId,
        );
        const inChapterSelection =
          selectionScope?.kind === "chapter" &&
          selectionScope.chapterId === source.chapterId &&
          selectedMediaIds.includes(activeId);
        mediaIds = inChapterSelection
          ? orderChapterSelection(chapter?.mediaIds ?? [], selectedMediaIds)
          : [activeId];
      }

      dragPayloadRef.current = { mediaIds, source };
      setActiveDragIds(mediaIds);
    },
    [selectedMediaIds, selectionScope, storyboard],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) {
        setDropTargetChapterId(null);
        setDropTargetBank(false);
        setDragOverChapterIndex(null);
        return;
      }

      const target = resolveDropTarget(String(over.id), storyboard);
      if (!target) return;

      if (target.kind === "bank") {
        setDropTargetBank(true);
        setDropTargetChapterId(null);
        setDragOverChapterIndex(null);
        return;
      }

      setDropTargetBank(false);
      setDropTargetChapterId(target.chapterId);
      const index = storyboard.chapters.findIndex(
        (chapter) => chapter.id === target.chapterId,
      );
      setDragOverChapterIndex(index >= 0 ? index : null);
    },
    [storyboard],
  );

  const clearDropTargets = useCallback(() => {
    setDropTargetChapterId(null);
    setDropTargetBank(false);
    setDragOverChapterIndex(null);
    dragPayloadRef.current = null;
  }, []);

  const clearMediaSelection = useCallback(() => {
    setSelectedMediaIds([]);
    setSelectionScope(null);
    setSelectionAnchorId(null);
  }, []);

  const pruneInvalidSelection = useCallback(() => {
    setSelectedMediaIds((prev) => {
      if (prev.length === 0) return prev;

      let validIds: readonly string[];
      if (selectionScope?.kind === "bank") {
        validIds = storyboard.unassignedIds;
      } else if (selectionScope?.kind === "chapter") {
        const chapter = storyboard.chapters.find(
          (c) => c.id === selectionScope.chapterId,
        );
        validIds = chapter?.mediaIds ?? [];
      } else {
        return [];
      }

      const validSet = new Set(validIds);
      const pruned = prev.filter((id) => validSet.has(id));
      return pruned.length === prev.length ? prev : pruned;
    });
  }, [selectionScope, storyboard.chapters, storyboard.unassignedIds]);

  useEffect(() => {
    pruneInvalidSelection();
  }, [pruneInvalidSelection]);

  const handleDragCancel = useCallback(() => {
    setActiveDragIds([]);
    clearDropTargets();
  }, [clearDropTargets]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragIds([]);

      const chapterBlockData = active.data.current as
        | StoryboardChapterBlockDragData
        | undefined;
      if (chapterBlockData?.type === STORYBOARD_CHAPTER_BLOCK_DND_TYPE) {
        if (over) {
          const overChapterId =
            parseStoryboardChapterSortableId(String(over.id)) ??
            parseStoryboardChapterDroppableId(String(over.id));
          if (
            overChapterId &&
            overChapterId !== chapterBlockData.chapterId
          ) {
            onStoryboardChange(
              reorderStoryboardChapters(
                storyboard,
                chapterBlockData.chapterId,
                overChapterId,
              ),
            );
          }
        }
        clearDropTargets();
        return;
      }

      const payload = dragPayloadRef.current;
      if (!payload || payload.mediaIds.length === 0) {
        clearDropTargets();
        return;
      }

      const { mediaIds, source } = payload;

      const resolvedTarget =
        dropTargetBank
          ? ({ kind: "bank" as const })
          : dropTargetChapterId
            ? {
                kind: "chapter" as const,
                chapterId: dropTargetChapterId,
                overMediaId:
                  over &&
                  !String(over.id).startsWith("storyboard-chapter-") &&
                  over.id !== STORYBOARD_BANK_DROPPABLE_ID
                    ? String(over.id)
                    : null,
              }
            : over
              ? resolveDropTarget(String(over.id), storyboard)
              : null;

      if (!resolvedTarget) {
        clearDropTargets();
        return;
      }

      if (resolvedTarget.kind === "bank") {
        if (source.kind === "chapter") {
          onStoryboardChange(
            unassignManyMediaFromChapters(storyboard, mediaIds),
          );
        }
        clearMediaSelection();
        clearDropTargets();
        return;
      }

      const targetChapterId = resolvedTarget.chapterId;
      const targetChapter = storyboard.chapters.find(
        (c) => c.id === targetChapterId,
      );
      if (!targetChapter) {
        clearDropTargets();
        return;
      }

      if (
        source.kind === "chapter" &&
        source.chapterId === targetChapterId &&
        mediaIds.length === 1 &&
        resolvedTarget.overMediaId &&
        targetChapter.mediaIds.includes(resolvedTarget.overMediaId) &&
        resolvedTarget.overMediaId !== mediaIds[0]
      ) {
        onStoryboardChange(
          reorderChapterMedia(
            storyboard,
            targetChapterId,
            mediaIds[0],
            resolvedTarget.overMediaId,
          ),
        );
        clearMediaSelection();
        clearDropTargets();
        return;
      }

      const movingSet = new Set(mediaIds);
      const baseIds = targetChapter.mediaIds.filter((id) => !movingSet.has(id));
      const insertIndex = resolveInsertIndex(
        baseIds,
        resolvedTarget.overMediaId &&
          baseIds.includes(resolvedTarget.overMediaId)
          ? resolvedTarget.overMediaId
          : null,
      );

      onStoryboardChange(
        assignManyMediaToChapter(
          storyboard,
          targetChapterId,
          mediaIds,
          insertIndex,
        ),
      );
      clearMediaSelection();
      clearDropTargets();
    },
    [
      clearDropTargets,
      clearMediaSelection,
      dropTargetBank,
      dropTargetChapterId,
      onStoryboardChange,
      storyboard,
    ],
  );

  const handleMediaClick = useCallback((assetId: string) => {
    setDirectorAssetId(assetId);
  }, []);

  const handleToggleMediaSelect = useCallback(
    (assetId: string, chapterId?: string) => {
      const nextScope: MediaSelectionScope = chapterId
        ? { kind: "chapter", chapterId }
        : { kind: "bank" };

      setSelectionScope((prevScope) => {
        const scopeChanged =
          !prevScope ||
          prevScope.kind !== nextScope.kind ||
          (nextScope.kind === "chapter" &&
            prevScope.kind === "chapter" &&
            prevScope.chapterId !== nextScope.chapterId);

        if (scopeChanged) {
          setSelectedMediaIds([assetId]);
          setSelectionAnchorId(assetId);
          return nextScope;
        }

        setSelectedMediaIds((prev) => {
          const next = new Set(prev);
          if (next.has(assetId)) next.delete(assetId);
          else next.add(assetId);
          return [...next];
        });
        setSelectionAnchorId(assetId);
        return prevScope;
      });
    },
    [],
  );

  const handleShiftMediaSelect = useCallback(
    (assetId: string, chapterId?: string) => {
      const nextScope: MediaSelectionScope = chapterId
        ? { kind: "chapter", chapterId }
        : { kind: "bank" };

      setSelectionScope((prevScope) => {
        const scopeChanged =
          !prevScope ||
          prevScope.kind !== nextScope.kind ||
          (nextScope.kind === "chapter" &&
            prevScope.kind === "chapter" &&
            prevScope.chapterId !== nextScope.chapterId);

        const anchor =
          !scopeChanged && selectionAnchorId ? selectionAnchorId : assetId;

        if (chapterId) {
          const chapter = storyboard.chapters.find((c) => c.id === chapterId);
          setSelectedMediaIds(
            getChapterSelectionRangeIds(
              chapter?.mediaIds ?? [],
              anchor,
              assetId,
            ),
          );
        } else {
          setSelectedMediaIds(
            getBankSelectionRangeIds(
              storyboard.unassignedIds,
              anchor,
              assetId,
            ),
          );
        }

        setSelectionAnchorId(anchor);
        return nextScope;
      });
    },
    [selectionAnchorId, storyboard.chapters, storyboard.unassignedIds],
  );

  const handleSelectAllBank = useCallback(() => {
    setSelectionScope({ kind: "bank" });
    setSelectedMediaIds([...storyboard.unassignedIds]);
    setSelectionAnchorId(storyboard.unassignedIds[0] ?? null);
  }, [storyboard.unassignedIds]);

  const handleDeselectAll = useCallback(() => {
    setSelectedMediaIds([]);
    setSelectionScope(null);
    setSelectionAnchorId(null);
  }, []);

  const resolveBankDragMediaIds = useCallback(
    (assetId: string) => {
      if (
        selectionScope?.kind === "bank" &&
        selectedMediaIds.includes(assetId)
      ) {
        return orderBankSelection(storyboard.unassignedIds, selectedMediaIds);
      }
      return [assetId];
    },
    [selectedMediaIds, selectionScope, storyboard.unassignedIds],
  );

  const resolveChapterDragMediaIds = useCallback(
    (assetId: string, chapterId: string) => {
      if (
        selectionScope?.kind === "chapter" &&
        selectionScope.chapterId === chapterId &&
        selectedMediaIds.includes(assetId)
      ) {
        const chapter = storyboard.chapters.find((c) => c.id === chapterId);
        return orderChapterSelection(chapter?.mediaIds ?? [], selectedMediaIds);
      }
      return [assetId];
    },
    [selectedMediaIds, selectionScope, storyboard.chapters],
  );

  const visibleBankSelection =
    selectionScope?.kind === "bank" ? selectedMediaIds : [];

  const handleTitleChange = useCallback(
    (chapterId: string, nextTitle: string) => {
      onStoryboardChange(setChapterLabel(storyboard, chapterId, nextTitle));
    },
    [onStoryboardChange, storyboard],
  );

  const handleAutoFill = useCallback(
    (chapterId: string) => {
      const chapter = storyboard.chapters.find((c) => c.id === chapterId);
      if (!chapter) return;
      const capacity = chapterRecommendedCapacity(
        chapter.song?.durationSec,
        resolveTargetSecondsPerMedia(packageId, chapter.mood),
      );
      const next = autoFillChapter(storyboard, chapterId, capacity);
      onStoryboardChange(next);
    },
    [onStoryboardChange, packageId, storyboard],
  );

  const handleClear = useCallback(
    (chapterId: string) => {
      onStoryboardChange(clearChapterMedia(storyboard, chapterId));
    },
    [onStoryboardChange, storyboard],
  );

  const handleManage = useCallback((chapterId: string) => {
    setRefinementChapterId(chapterId);
  }, []);

  const handleReturnToBank = useCallback(
    (mediaIds: readonly string[]) => {
      onStoryboardChange(unassignManyMediaFromChapters(storyboard, mediaIds));
    },
    [onStoryboardChange, storyboard],
  );

  const handleMoveToNextChapter = useCallback(
    (mediaIds: readonly string[]) => {
      if (!refinementChapterId) return;
      const index = storyboard.chapters.findIndex(
        (c) => c.id === refinementChapterId,
      );
      const nextChapter = storyboard.chapters[index + 1];
      if (!nextChapter) return;
      onStoryboardChange(
        assignManyMediaToChapter(storyboard, nextChapter.id, mediaIds),
      );
    },
    [onStoryboardChange, refinementChapterId, storyboard],
  );

  const handleDirectorAssignChapter = useCallback(
    (assetId: string, chapterId: string) => {
      onStoryboardChange(assignMediaToChapter(storyboard, chapterId, assetId));
    },
    [onStoryboardChange, storyboard],
  );

  const handleDirectorRemove = useCallback(
    (assetId: string) => {
      onStoryboardChange(unassignMediaFromChapter(storyboard, assetId));
      setDirectorAssetId(null);
    },
    [onStoryboardChange, storyboard],
  );

  const handleDirectorSetFocal = useCallback(
    (assetId: string, point: MontageFocalPoint) => {
      onStoryboardChange(setStoryboardFocalPoint(storyboard, assetId, point));
    },
    [onStoryboardChange, storyboard],
  );

  const handleDirectorClearFocal = useCallback(
    (assetId: string) => {
      onStoryboardChange(clearStoryboardFocalPoint(storyboard, assetId));
    },
    [onStoryboardChange, storyboard],
  );

  const handleDirectorToggleExclude = useCallback(
    (assetId: string) => {
      onStoryboardChange(toggleStoryboardMediaExclude(storyboard, assetId));
    },
    [onStoryboardChange, storyboard],
  );

  const overlaySourceChapterIndex =
    activeDragIds.length > 0
      ? (() => {
          const chapterId = findChapterForMedia(
            storyboard.chapters,
            activeDragIds[0],
          );
          if (!chapterId) return 0;
          const index = storyboard.chapters.findIndex((c) => c.id === chapterId);
          return index >= 0 ? index : 0;
        })()
      : 0;

  const overlayAccentChapterIndex =
    dragOverChapterIndex ?? overlaySourceChapterIndex;

  return (
    <div className="space-y-8 pb-10">
      <header className="space-y-3">
        <h2 className="font-[family-name:var(--font-label)] text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {copy.title}
        </h2>
        <p className="max-w-2xl text-sm font-light leading-relaxed text-zinc-400 md:text-base">
          {copy.description}
        </p>
      </header>

      {isLoadingMedia ? (
        <p className="text-sm font-light text-zinc-500" role="status">
          {copy.loading}
        </p>
      ) : null}

      <DndContext
        id="storyboard-montage"
        sensors={sensors}
        collisionDetection={storyboardCollisionDetection}
        autoScroll={autoScroll}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {storyboard.chapters.length > 0 ? (
          <StoryboardOpenBookLayout
            bankItems={unassignedItems}
            selectedMediaIds={visibleBankSelection}
            activeDragIds={activeDragIds}
            isBankDropHighlighted={dropTargetBank}
            bankCopy={copy.bankColumn}
            cardCopy={copy.card}
            resolveBankDragMediaIds={resolveBankDragMediaIds}
            onBankMediaClick={handleMediaClick}
            onToggleMediaSelect={(assetId) => handleToggleMediaSelect(assetId)}
            onShiftMediaSelect={(assetId) => handleShiftMediaSelect(assetId)}
            onSelectAllBank={handleSelectAllBank}
            onDeselectAllBank={handleDeselectAll}
            filmMap={
              <StoryboardFilmMap
                segments={filmMapSegments}
                copy={copy.filmMap}
              />
            }
          >
            <StoryboardChapterStack
              chapters={chapterViewModels}
              packageId={packageId}
              excludedIds={storyboard.excludedIds}
              focalPoints={storyboard.focalPoints}
              activeDragIds={activeDragIds}
              selectedMediaIds={selectedMediaIds}
              selectionScope={selectionScope}
              dropTargetChapterId={dropTargetChapterId}
              refinementChapterId={refinementChapterId}
              hasUnassignedMedia={storyboard.unassignedIds.length > 0}
              capacityCopy={{
                recommended: copy.capacityRecommended,
                pending: copy.capacityPending,
              }}
              gridCopy={copy.chapterGrid}
              actionsCopy={copy.chapterActions}
              cardCopy={copy.card}
              titleEditAria={copy.chapterTitleEditAria}
              chapterReorderAria={copy.chapterReorderAria}
              toggleSelectAria={copy.toggleSelectAria}
              onMediaClick={handleMediaClick}
              onToggleMediaSelect={handleToggleMediaSelect}
              onShiftMediaSelect={handleShiftMediaSelect}
              onTitleChange={handleTitleChange}
              onAutoFill={handleAutoFill}
              onClear={handleClear}
              onManage={handleManage}
              resolveChapterDragMediaIds={resolveChapterDragMediaIds}
            />
          </StoryboardOpenBookLayout>
        ) : null}

        <DragOverlay
          dropAnimation={{
            duration: 280,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {overlayItems.length > 1 ? (
            <MontageMultiDragOverlay
              count={overlayItems.length}
              label={copy.multiDragLabel}
              items={overlayItems}
              chapterIndex={overlaySourceChapterIndex}
              accentChapterIndex={overlayAccentChapterIndex}
              copy={copy.card}
            />
          ) : overlayItems[0] ? (
            <MontageMediaCardDragOverlay
              item={overlayItems[0]}
              chapterIndex={overlaySourceChapterIndex}
              accentChapterIndex={overlayAccentChapterIndex}
              index={0}
              isExcluded={storyboard.excludedIds.includes(
                overlayItems[0].assetId,
              )}
              hasFocalPoint={Boolean(
                storyboard.focalPoints[overlayItems[0].assetId],
              )}
              copy={copy.card}
              elevated
            />
          ) : null}
        </DragOverlay>

        {refinementChapter ? (
          <ChapterRefinementDrawer
            isOpen
            chapterId={refinementChapter.chapter.id}
            chapterIndex={refinementChapter.index}
            chapterTitle={refinementChapter.title}
            songLine={refinementChapter.songLine || undefined}
            recommendedCapacity={refinementChapter.capacity}
            inCapacityItems={refinementChapter.inCapacity}
            beyondCapacityItems={refinementChapter.beyondCapacity}
            excludedIds={storyboard.excludedIds}
            focalPoints={storyboard.focalPoints}
            activeDragIds={activeDragIds}
            cardCopy={copy.card}
            copy={copy.refinement}
            onClose={() => setRefinementChapterId(null)}
            onMediaClick={handleMediaClick}
            onReturnToBank={handleReturnToBank}
            onMoveToNextChapter={handleMoveToNextChapter}
          />
        ) : null}
      </DndContext>

      <AnimatePresence>
        {directorItem ? (
          <MontageDirectorModal
            key={directorItem.assetId}
            item={directorItem}
            chapters={directorChapters}
            currentChapterId={findChapterForMedia(
              storyboard.chapters,
              directorItem.assetId,
            )}
            excludedIds={storyboard.excludedIds}
            focalPoints={storyboard.focalPoints}
            navigationOrder={directorNavigationOrder}
            copy={copy.director}
            onClose={() => setDirectorAssetId(null)}
            onNavigate={setDirectorAssetId}
            onAssignChapter={handleDirectorAssignChapter}
            onToggleExclude={handleDirectorToggleExclude}
            onSetFocalPoint={handleDirectorSetFocal}
            onClearFocalPoint={handleDirectorClearFocal}
            onRemoveMedia={handleDirectorRemove}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
