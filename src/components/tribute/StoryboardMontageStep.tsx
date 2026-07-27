"use client";

import { DndContext, DragOverlay } from "@dnd-kit/core";
import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchProjectMedia } from "@/src/hooks/useMassMediaUpload";
import { useMagicComposition } from "@/src/hooks/useMagicComposition";
import { useMontageChapterActions } from "@/src/hooks/useMontageChapterActions";
import { useMontageDnd } from "@/src/hooks/useMontageDnd";
import { useMontageMediaSelection } from "@/src/hooks/useMontageMediaSelection";
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
import {
  MagicCinematicOverlay,
  type MagicCinematicOverlayCopy,
} from "@/src/components/tribute/storyboard/MagicCinematicOverlay";
import {
  MontageOnboardingGate,
  type MontageOnboardingGateCopy,
} from "@/src/components/tribute/storyboard/MontageOnboardingGate";
import { findChapterForMedia } from "@/src/lib/wizard/storyboardHelpers";
import { storyboardCollisionDetection } from "@/src/lib/wizard/storyboardDnd";
import {
  assignManyMediaToChapter,
  assignMediaToChapter,
  clearStoryboardFocalPoint,
  mergeStoryboardWithMedia,
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
  onboarding: MontageOnboardingGateCopy;
  magicComposition: MagicCinematicOverlayCopy;
};

type Props = {
  packageId: PackageId;
  projectId: string | null;
  storyboard: WizardStoryboardState;
  onStoryboardChange: (next: WizardStoryboardState) => void;
  onMagicPerformingChange?: (performing: boolean) => void;
  onMagicSequenceComplete?: () => void;
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
  onMagicPerformingChange,
  onMagicSequenceComplete,
  copy,
}: Props) {
  const [mediaItems, setMediaItems] = useState<MontageMediaItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [directorAssetId, setDirectorAssetId] = useState<string | null>(null);
  const [refinementChapterId, setRefinementChapterId] = useState<string | null>(
    null,
  );
  const storyboardRef = useRef(storyboard);
  storyboardRef.current = storyboard;

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

  const chapterCapacities = useMemo(
    () =>
      storyboard.chapters.map((chapter) =>
        chapterRecommendedCapacity(
          chapter.song?.durationSec,
          resolveTargetSecondsPerMedia(packageId, chapter.mood),
        ),
      ),
    [packageId, storyboard.chapters],
  );

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

  const {
    selectedMediaIds,
    selectionScope,
    clearMediaSelection,
    handleToggleMediaSelect,
    handleShiftMediaSelect,
    handleSelectAllBank,
    handleDeselectAll,
    resolveBankDragMediaIds,
    resolveChapterDragMediaIds,
    visibleBankSelection,
  } = useMontageMediaSelection({ storyboard });

  const {
    sensors,
    autoScroll,
    activeDragIds,
    dropTargetChapterId,
    dropTargetBank,
    dragOverChapterIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useMontageDnd({
    storyboard,
    onStoryboardChange,
    selectedMediaIds,
    selectionScope,
    clearMediaSelection,
  });

  const overlayItems = useMemo(
    () =>
      activeDragIds
        .map((id) => mediaById.get(id))
        .filter((item): item is MontageMediaItem => Boolean(item)),
    [activeDragIds, mediaById],
  );

  const handleMediaClick = useCallback((assetId: string) => {
    setDirectorAssetId(assetId);
  }, []);

  const {
    isMagicRunning,
    magicPhase,
    magicHighlightChapterId,
    magicEntranceMediaIdsRef,
    magicEntranceStaggerRef,
    showOnboardingGate,
    handleChooseMagic,
    handleChooseManual,
  } = useMagicComposition({
    storyboard,
    onStoryboardChange,
    chapterCapacities,
    clearMediaSelection,
    isLoadingMedia,
    onMagicPerformingChange,
    onMagicSequenceComplete,
  });

  const { handleTitleChange, handleAutoFill, handleClear, handleManage } =
    useMontageChapterActions({
      storyboard,
      onStoryboardChange,
      packageId,
      setRefinementChapterId,
    });

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
          <div
            className={
              isMagicRunning ? "pointer-events-none select-none" : undefined
            }
            aria-hidden={isMagicRunning}
          >
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
            isMagicRunning={isMagicRunning}
            hasUnassignedMedia={storyboard.unassignedIds.length > 0}
            onMagicComposition={handleChooseMagic}
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
              magicHighlightChapterId={magicHighlightChapterId}
              magicEntranceMediaIds={magicEntranceMediaIdsRef.current}
              magicEntranceStaggerByMediaId={magicEntranceStaggerRef.current}
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
          </div>
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

      <MagicCinematicOverlay
        phase={magicPhase}
        message={copy.magicComposition.message}
      />

      <AnimatePresence>
        {showOnboardingGate ? (
          <MontageOnboardingGate
            key="montage-onboarding"
            copy={copy.onboarding}
            onChooseMagic={handleChooseMagic}
            onChooseManual={handleChooseManual}
          />
        ) : null}
      </AnimatePresence>

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
