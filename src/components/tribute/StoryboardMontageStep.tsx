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
  resolveMontageChapterTabLabel,
  type MontageChapterTabsCopy,
} from "@/src/components/tribute/storyboard/MontageChapterTabs";
import type { MediaBankColumnCopy } from "@/src/components/tribute/storyboard/MediaBankColumn";
import type { ChapterCanvasGridCopy } from "@/src/components/tribute/storyboard/ChapterCanvasGrid";
import {
  StoryboardFilmMap,
  type StoryboardFilmMapCopy,
  type StoryboardFilmMapSegment,
} from "@/src/components/tribute/storyboard/StoryboardFilmMap";
import { StoryboardOpenBookLayout } from "@/src/components/tribute/storyboard/StoryboardOpenBookLayout";
import { StoryboardChapterStack } from "@/src/components/tribute/storyboard/StoryboardChapterStack";
import {
  findChapterForMedia,
  setChapterLabel,
} from "@/src/lib/wizard/storyboardHelpers";
import {
  assignMediaToChapter,
  clearStoryboardFocalPoint,
  mergeStoryboardWithMedia,
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
  chapterTabs: MontageChapterTabsCopy;
  card: MontageMediaCardCopy;
  director: MontageDirectorModalCopy;
  capacityRecommended: string;
  capacityPending: string;
  bankColumn: MediaBankColumnCopy;
  chapterGrid: ChapterCanvasGridCopy;
  chapterTitleEditAria: string;
  filmMap: StoryboardFilmMapCopy;
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

  const handleMediaClick = useCallback((assetId: string) => {
    setDirectorAssetId(assetId);
  }, []);

  const handleTitleChange = useCallback(
    (chapterId: string, nextTitle: string) => {
      onStoryboardChange(setChapterLabel(storyboard, chapterId, nextTitle));
    },
    [onStoryboardChange, storyboard],
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

      {storyboard.chapters.length > 0 ? (
        <StoryboardOpenBookLayout
          bankItems={unassignedItems}
          bankCopy={copy.bankColumn}
          cardCopy={copy.card}
          onBankMediaClick={handleMediaClick}
          filmMap={
            <StoryboardFilmMap segments={filmMapSegments} copy={copy.filmMap} />
          }
        >
          <StoryboardChapterStack
            chapters={chapterViewModels}
            packageId={packageId}
            excludedIds={storyboard.excludedIds}
            focalPoints={storyboard.focalPoints}
            capacityCopy={{
              recommended: copy.capacityRecommended,
              pending: copy.capacityPending,
            }}
            gridCopy={copy.chapterGrid}
            cardCopy={copy.card}
            titleEditAria={copy.chapterTitleEditAria}
            onMediaClick={handleMediaClick}
            onTitleChange={handleTitleChange}
          />
        </StoryboardOpenBookLayout>
      ) : null}

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
