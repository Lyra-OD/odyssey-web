"use client";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import type { MontageMediaCardCopy } from "@/src/components/tribute/montage/MontageMediaCard";
import {
  StoryboardChapterBlock,
} from "@/src/components/tribute/storyboard/StoryboardChapterBlock";
import type { ChapterActionClusterCopy } from "@/src/components/tribute/storyboard/ChapterActionCluster";
import type { ChapterCanvasGridCopy } from "@/src/components/tribute/storyboard/ChapterCanvasGrid";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import {
  chapterRecommendedCapacity,
  resolveTargetSecondsPerMedia,
} from "@/src/lib/wizard/storyboardPacing";
import { storyboardChapterSortableId } from "@/src/lib/wizard/storyboardDnd";
import type { MediaSelectionScope } from "@/src/lib/wizard/storyboardDnd";
import type { PackageId } from "@/src/lib/wizard/wizardDeliverables";
import type {
  MontageFocalPoint,
  WizardStoryboardChapter,
} from "@/src/lib/wizard/wizardState";

type ChapterViewModel = {
  chapter: WizardStoryboardChapter;
  index: number;
  title: string;
  items: readonly MontageMediaItem[];
};

type Props = {
  chapters: readonly ChapterViewModel[];
  packageId: PackageId;
  excludedIds: readonly string[];
  focalPoints: Readonly<Record<string, MontageFocalPoint>>;
  activeDragIds: readonly string[];
  selectedMediaIds: readonly string[];
  selectionScope: MediaSelectionScope | null;
  dropTargetChapterId: string | null;
  magicHighlightChapterId: string | null;
  magicEntranceMediaIds: ReadonlySet<string>;
  magicEntranceStaggerByMediaId: ReadonlyMap<string, number>;
  refinementChapterId: string | null;
  hasUnassignedMedia: boolean;
  capacityCopy: {
    recommended: string;
    pending: string;
  };
  gridCopy: ChapterCanvasGridCopy;
  actionsCopy: ChapterActionClusterCopy;
  cardCopy: MontageMediaCardCopy;
  titleEditAria: string;
  chapterReorderAria: string;
  toggleSelectAria: string;
  onMediaClick: (assetId: string, event?: React.MouseEvent) => void;
  onToggleMediaSelect: (assetId: string, chapterId?: string) => void;
  onShiftMediaSelect: (assetId: string, chapterId?: string) => void;
  onTitleChange: (chapterId: string, nextTitle: string) => void;
  onAutoFill: (chapterId: string) => void;
  onClear: (chapterId: string) => void;
  onManage: (chapterId: string) => void;
  resolveChapterDragMediaIds: (
    assetId: string,
    chapterId: string,
  ) => readonly string[];
};

export function StoryboardChapterStack({
  chapters,
  packageId,
  excludedIds,
  focalPoints,
  activeDragIds,
  selectedMediaIds,
  selectionScope,
  dropTargetChapterId,
  magicHighlightChapterId,
  magicEntranceMediaIds,
  magicEntranceStaggerByMediaId,
  refinementChapterId,
  hasUnassignedMedia,
  capacityCopy,
  gridCopy,
  actionsCopy,
  cardCopy,
  titleEditAria,
  chapterReorderAria,
  toggleSelectAria,
  onMediaClick,
  onToggleMediaSelect,
  onShiftMediaSelect,
  onTitleChange,
  onAutoFill,
  onClear,
  onManage,
  resolveChapterDragMediaIds,
}: Props) {
  const chapterSortableIds = chapters.map((c) =>
    storyboardChapterSortableId(c.chapter.id),
  );

  return (
    <SortableContext
      items={chapterSortableIds}
      strategy={verticalListSortingStrategy}
    >
      <div className="flex flex-col gap-8">
        {chapters.map(({ chapter, index, title, items }) => {
          const recommendedCapacity = chapterRecommendedCapacity(
            chapter.song?.durationSec,
            resolveTargetSecondsPerMedia(packageId, chapter.mood),
          );

          const chapterSelection =
            selectionScope?.kind === "chapter" &&
            selectionScope.chapterId === chapter.id
              ? selectedMediaIds
              : [];

          return (
            <StoryboardChapterBlock
              key={chapter.id}
              chapter={chapter}
              chapterIndex={index}
              title={title}
              items={items}
              recommendedCapacity={recommendedCapacity}
              excludedIds={excludedIds}
              focalPoints={focalPoints}
              capacityCopy={capacityCopy}
              gridCopy={gridCopy}
              actionsCopy={actionsCopy}
              cardCopy={cardCopy}
              titleEditAria={titleEditAria}
              chapterReorderAria={chapterReorderAria}
              toggleSelectAria={toggleSelectAria}
              activeDragIds={activeDragIds}
              selectedMediaIds={chapterSelection}
              sortableEnabled={refinementChapterId !== chapter.id}
              chapterSortableEnabled={refinementChapterId === null}
              isDropHighlighted={dropTargetChapterId === chapter.id}
              isMagicHighlighted={magicHighlightChapterId === chapter.id}
              magicEntranceMediaIds={magicEntranceMediaIds}
              magicEntranceStaggerByMediaId={magicEntranceStaggerByMediaId}
              hasUnassignedMedia={hasUnassignedMedia}
              onMediaClick={(assetId, event) => onMediaClick(assetId, event)}
              onToggleMediaSelect={(assetId) =>
                onToggleMediaSelect(assetId, chapter.id)
              }
              onShiftMediaSelect={(assetId) =>
                onShiftMediaSelect(assetId, chapter.id)
              }
              onTitleChange={(nextTitle) => onTitleChange(chapter.id, nextTitle)}
              onAutoFill={() => onAutoFill(chapter.id)}
              onClear={() => onClear(chapter.id)}
              onManage={() => onManage(chapter.id)}
              resolveChapterDragMediaIds={(assetId) =>
                resolveChapterDragMediaIds(assetId, chapter.id)
              }
            />
          );
        })}
      </div>
    </SortableContext>
  );
}
