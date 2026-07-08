"use client";

import { AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchProjectMedia } from "@/src/hooks/useMassMediaUpload";
import {
  MontageDirectorModal,
  type MontageDirectorModalCopy,
} from "@/src/components/tribute/montage/MontageDirectorModal";
import type { MontageMediaCardCopy } from "@/src/components/tribute/montage/MontageMediaCard";
import {
  MediaBankPanel,
  type MediaBankPanelCopy,
} from "@/src/components/tribute/storyboard/MediaBankPanel";
import {
  MediaBankTrigger,
  type MediaBankTriggerCopy,
} from "@/src/components/tribute/storyboard/MediaBankTrigger";
import {
  MontageChapterTabs,
  resolveMontageChapterTabLabel,
  type MontageChapterTabsCopy,
} from "@/src/components/tribute/storyboard/MontageChapterTabs";
import {
  MontageTimeline,
  type MontageTimelineCopy,
} from "@/src/components/tribute/storyboard/MontageTimeline";
import { StoryboardCapacityBadge } from "@/src/components/tribute/storyboard/StoryboardCapacityBadge";
import {
  chapterIndexById,
  findChapterForMedia,
} from "@/src/lib/wizard/storyboardHelpers";
import {
  assignManyMediaToChapter,
  assignMediaToChapter,
  clearStoryboardFocalPoint,
  mergeStoryboardWithMedia,
  reorderChapterMedia,
  setStoryboardFocalPoint,
  toggleStoryboardMediaExclude,
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
  bankTrigger: MediaBankTriggerCopy;
  bankPanel: MediaBankPanelCopy;
  chapterTabs: MontageChapterTabsCopy;
  timeline: MontageTimelineCopy;
  card: MontageMediaCardCopy;
  director: MontageDirectorModalCopy;
  capacityRecommended: string;
  capacityPending: string;
};

type Props = {
  packageId: PackageId;
  projectId: string | null;
  storyboard: WizardStoryboardState;
  onStoryboardChange: (next: WizardStoryboardState) => void;
  isMediaBankOpen: boolean;
  onMediaBankOpen: () => void;
  onMediaBankClose: () => void;
  copy: StoryboardMontageStepCopy;
};

export function StoryboardMontageStep({
  packageId,
  projectId,
  storyboard,
  onStoryboardChange,
  isMediaBankOpen,
  onMediaBankOpen,
  onMediaBankClose,
  copy,
}: Props) {
  const [mediaItems, setMediaItems] = useState<MontageMediaItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [directorAssetId, setDirectorAssetId] = useState<string | null>(null);
  const [recentlyAddedIds, setRecentlyAddedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  /** Snapshot du chapitre cible à l'ouverture de la banque — ne suit pas les onglets tant que le panneau est ouvert. */
  const [bankTargetChapterId, setBankTargetChapterId] = useState<string | null>(
    null,
  );
  const storyboardRef = useRef(storyboard);
  const wasBankOpenRef = useRef(false);
  storyboardRef.current = storyboard;

  useEffect(() => {
    if (!storyboard.chapters.length) {
      setActiveChapterId(null);
      return;
    }
    if (
      activeChapterId &&
      storyboard.chapters.some((chapter) => chapter.id === activeChapterId)
    ) {
      return;
    }
    setActiveChapterId(storyboard.chapters[0]?.id ?? null);
  }, [storyboard.chapters, activeChapterId]);

  useEffect(() => {
    if (isMediaBankOpen && !wasBankOpenRef.current && activeChapterId) {
      setBankTargetChapterId(activeChapterId);
    }
    wasBankOpenRef.current = isMediaBankOpen;
  }, [isMediaBankOpen, activeChapterId]);

  useEffect(() => {
    if (recentlyAddedIds.size === 0) return;
    const timer = window.setTimeout(() => setRecentlyAddedIds(new Set()), 500);
    return () => window.clearTimeout(timer);
  }, [recentlyAddedIds]);

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
        // Best-effort — la timeline reste vide si le fetch échoue.
      })
      .finally(() => {
        if (!aborted) setIsLoadingMedia(false);
      });
    return () => {
      aborted = true;
    };
    // Recharge à l'entrée dans l'étape uniquement — pas à chaque mutation storyboard.
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

  const activeChapter = useMemo(
    () => storyboard.chapters.find((chapter) => chapter.id === activeChapterId) ?? null,
    [storyboard.chapters, activeChapterId],
  );

  const bankTargetChapterIndex = useMemo(() => {
    if (!bankTargetChapterId) return 0;
    return chapterIndexById(storyboard.chapters, bankTargetChapterId);
  }, [bankTargetChapterId, storyboard.chapters]);

  const bankTargetChapterLabel = useMemo(
    () =>
      resolveMontageChapterTabLabel(bankTargetChapterIndex, copy.chapterTabs),
    [bankTargetChapterIndex, copy.chapterTabs],
  );

  const activeChapterIndex = activeChapter
    ? chapterIndexById(storyboard.chapters, activeChapter.id)
    : 0;

  const timelineItems = useMemo(() => {
    if (!activeChapter) return [];
    return activeChapter.mediaIds
      .map((id) => mediaById.get(id))
      .filter((item): item is MontageMediaItem => Boolean(item));
  }, [activeChapter, mediaById]);

  const directorChapters = useMemo(
    () =>
      storyboard.chapters.map((chapter, index) => ({
        id: chapter.id,
        label: resolveMontageChapterTabLabel(index, copy.chapterTabs),
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

  const chapterCapacity = useMemo(() => {
    if (!activeChapter) return null;
    return chapterRecommendedCapacity(
      activeChapter.song?.durationSec,
      resolveTargetSecondsPerMedia(packageId, activeChapter.mood),
    );
  }, [activeChapter, packageId]);

  const handleAssignBatch = useCallback(
    (mediaIds: string[]) => {
      if (!bankTargetChapterId || mediaIds.length === 0) return;
      onStoryboardChange(
        assignManyMediaToChapter(storyboard, bankTargetChapterId, mediaIds),
      );
      setRecentlyAddedIds(new Set(mediaIds));
      onMediaBankClose();
    },
    [bankTargetChapterId, onMediaBankClose, onStoryboardChange, storyboard],
  );

  const handleTimelineReorder = useCallback(
    (activeId: string, overId: string) => {
      if (!activeChapterId) return;
      onStoryboardChange(
        reorderChapterMedia(storyboard, activeChapterId, activeId, overId),
      );
    },
    [activeChapterId, onStoryboardChange, storyboard],
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

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <h2 className="font-[family-name:var(--font-label)] text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {copy.title}
          </h2>
          <p className="max-w-2xl text-sm font-light leading-relaxed text-zinc-400 md:text-base">
            {copy.description}
          </p>
        </div>
        <MediaBankTrigger
          count={unassignedItems.length}
          onOpen={onMediaBankOpen}
          copy={copy.bankTrigger}
          className="shrink-0"
        />
      </header>

      {isLoadingMedia ? (
        <p className="text-sm font-light text-zinc-500" role="status">
          {copy.loading}
        </p>
      ) : null}

      {storyboard.chapters.length > 0 ? (
        <div className="space-y-6">
          <MontageChapterTabs
            chapters={storyboard.chapters}
            activeChapterId={activeChapterId ?? storyboard.chapters[0].id}
            onSelect={setActiveChapterId}
            copy={copy.chapterTabs}
          />

          {activeChapter ? (
            <div className="flex items-center justify-between gap-4">
              <p className="truncate text-sm font-light text-zinc-400">
                {activeChapter.song?.title ?? activeChapter.song?.artist ?? ""}
              </p>
              <StoryboardCapacityBadge
                capacity={chapterCapacity}
                assignedCount={activeChapter.mediaIds.length}
                showAssigned
                copy={{
                  recommended: copy.capacityRecommended,
                  pending: copy.capacityPending,
                }}
              />
            </div>
          ) : null}

          {activeChapter ? (
            <MontageTimeline
              items={timelineItems}
              chapterId={activeChapter.id}
              chapterIndex={activeChapterIndex}
              excludedIds={storyboard.excludedIds}
              focalPoints={storyboard.focalPoints}
              recentlyAddedIds={recentlyAddedIds}
              copy={copy.timeline}
              cardCopy={copy.card}
              onReorder={handleTimelineReorder}
              onCardClick={setDirectorAssetId}
            />
          ) : null}
        </div>
      ) : null}

      <MediaBankPanel
        isOpen={isMediaBankOpen}
        onClose={onMediaBankClose}
        items={unassignedItems}
        targetChapterLabel={bankTargetChapterLabel}
        onAssignBatch={handleAssignBatch}
        copy={copy.bankPanel}
      />

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
