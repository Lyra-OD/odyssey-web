"use client";

import type { MontageMediaCardCopy } from "@/src/components/tribute/montage/MontageMediaCard";
import {
  ChapterCanvasGrid,
  type ChapterCanvasGridCopy,
} from "@/src/components/tribute/storyboard/ChapterCanvasGrid";
import { ChapterNarrativeHeader } from "@/src/components/tribute/storyboard/ChapterNarrativeHeader";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import type {
  MontageFocalPoint,
  WizardStoryboardChapter,
} from "@/src/lib/wizard/wizardState";

export const storyboardChapterDomId = (chapterId: string) =>
  `storyboard-chapter-${chapterId}`;

type Props = {
  chapter: WizardStoryboardChapter;
  chapterIndex: number;
  title: string;
  items: readonly MontageMediaItem[];
  recommendedCapacity: number | null;
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
  onTitleChange: (nextTitle: string) => void;
};

export function StoryboardChapterBlock({
  chapter,
  chapterIndex,
  title,
  items,
  recommendedCapacity,
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
    <article
      id={storyboardChapterDomId(chapter.id)}
      className="scroll-mt-24 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-8"
    >
      <div className="space-y-6">
        <ChapterNarrativeHeader
          chapterIndex={chapterIndex}
          title={title}
          songTitle={chapter.song?.title}
          songArtist={chapter.song?.artist}
          capacity={recommendedCapacity}
          assignedCount={chapter.mediaIds.length}
          titleEditAria={titleEditAria}
          capacityCopy={capacityCopy}
          onTitleChange={onTitleChange}
        />

        <ChapterCanvasGrid
          items={items}
          chapterIndex={chapterIndex}
          recommendedCapacity={recommendedCapacity}
          excludedIds={excludedIds}
          focalPoints={focalPoints}
          copy={gridCopy}
          cardCopy={cardCopy}
          onMediaClick={onMediaClick}
        />
      </div>
    </article>
  );
}
