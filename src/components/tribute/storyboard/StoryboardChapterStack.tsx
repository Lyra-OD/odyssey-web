"use client";

import type { MontageMediaCardCopy } from "@/src/components/tribute/montage/MontageMediaCard";
import {
  StoryboardChapterBlock,
} from "@/src/components/tribute/storyboard/StoryboardChapterBlock";
import type { ChapterCanvasGridCopy } from "@/src/components/tribute/storyboard/ChapterCanvasGrid";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import {
  chapterRecommendedCapacity,
  resolveTargetSecondsPerMedia,
} from "@/src/lib/wizard/storyboardPacing";
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
  capacityCopy: {
    recommended: string;
    pending: string;
  };
  gridCopy: ChapterCanvasGridCopy;
  cardCopy: MontageMediaCardCopy;
  titleEditAria: string;
  onMediaClick: (assetId: string) => void;
  onTitleChange: (chapterId: string, nextTitle: string) => void;
};

export function StoryboardChapterStack({
  chapters,
  packageId,
  excludedIds,
  focalPoints,
  capacityCopy,
  gridCopy,
  cardCopy,
  titleEditAria,
  onMediaClick,
  onTitleChange,
}: Props) {
  return (
    <div className="flex flex-col gap-8">
      {chapters.map(({ chapter, index, title, items }) => {
        const recommendedCapacity = chapterRecommendedCapacity(
          chapter.song?.durationSec,
          resolveTargetSecondsPerMedia(packageId, chapter.mood),
        );

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
            cardCopy={cardCopy}
            titleEditAria={titleEditAria}
            onMediaClick={onMediaClick}
            onTitleChange={(nextTitle) => onTitleChange(chapter.id, nextTitle)}
          />
        );
      })}
    </div>
  );
}
