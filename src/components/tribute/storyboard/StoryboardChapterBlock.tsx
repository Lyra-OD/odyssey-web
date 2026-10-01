"use client";

import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { MontageMediaCardCopy } from "@/src/components/tribute/montage/MontageMediaCard";
import {
  ChapterActionCluster,
  type ChapterActionClusterCopy,
} from "@/src/components/tribute/storyboard/ChapterActionCluster";
import {
  ChapterCanvasGrid,
  type ChapterCanvasGridCopy,
} from "@/src/components/tribute/storyboard/ChapterCanvasGrid";
import { ChapterNarrativeHeader } from "@/src/components/tribute/storyboard/ChapterNarrativeHeader";
import type { ChapterNarrativeHeaderCreditCopy } from "@/src/components/tribute/storyboard/ChapterNarrativeHeader";
import {
  chapterGlowShadow,
  chapterShellClass,
  getChapterTheme,
} from "@/src/lib/wizard/chapterTheme";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import { MAGIC_SCROLL_MARGIN_TOP_PX } from "@/src/lib/wizard/magicTimelinePlayer";
import {
  STORYBOARD_CHAPTER_BLOCK_DND_TYPE,
  storyboardChapterDroppableId,
  storyboardChapterSortableId,
} from "@/src/lib/wizard/storyboardDnd";
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
  actionsCopy: ChapterActionClusterCopy;
  cardCopy: MontageMediaCardCopy;
  titleEditAria: string;
  chapterReorderAria: string;
  creditCopy?: ChapterNarrativeHeaderCreditCopy;
  toggleSelectAria: string;
  activeDragIds: readonly string[];
  selectedMediaIds: readonly string[];
  sortableEnabled: boolean;
  chapterSortableEnabled: boolean;
  isDropHighlighted: boolean;
  isMagicHighlighted: boolean;
  magicEntranceMediaIds: ReadonlySet<string>;
  magicEntranceStaggerByMediaId: ReadonlyMap<string, number>;
  hasUnassignedMedia: boolean;
  onMediaClick: (assetId: string, event?: React.MouseEvent) => void;
  onToggleMediaSelect: (assetId: string) => void;
  onShiftMediaSelect: (assetId: string) => void;
  onTitleChange: (nextTitle: string) => void;
  onCreditLabelChange?: (nextLabel: string) => void;
  onShowCreditInSessionChange?: (show: boolean) => void;
  onAutoFill: () => void;
  onClear: () => void;
  onManage: () => void;
  resolveChapterDragMediaIds: (assetId: string) => readonly string[];
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
  actionsCopy,
  cardCopy,
  titleEditAria,
  chapterReorderAria,
  creditCopy,
  toggleSelectAria,
  activeDragIds,
  selectedMediaIds,
  sortableEnabled,
  chapterSortableEnabled,
  isDropHighlighted,
  isMagicHighlighted,
  magicEntranceMediaIds,
  magicEntranceStaggerByMediaId,
  hasUnassignedMedia,
  onMediaClick,
  onToggleMediaSelect,
  onShiftMediaSelect,
  onTitleChange,
  onCreditLabelChange,
  onShowCreditInSessionChange,
  onAutoFill,
  onClear,
  onManage,
  resolveChapterDragMediaIds,
}: Props) {
  const theme = getChapterTheme(chapter.paletteIndex ?? chapterIndex);

  const {
    attributes: chapterSortAttributes,
    listeners: chapterSortListeners,
    setNodeRef: setChapterSortRef,
    transform: chapterTransform,
    transition: chapterTransition,
    isDragging: isChapterDragging,
  } = useSortable({
    id: storyboardChapterSortableId(chapter.id),
    data: {
      type: STORYBOARD_CHAPTER_BLOCK_DND_TYPE,
      chapterId: chapter.id,
    },
    disabled: !chapterSortableEnabled,
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: storyboardChapterDroppableId(chapter.id),
    disabled: !sortableEnabled,
  });

  const glowIntensity = isMagicHighlighted
    ? "magic"
    : isDropHighlighted
      ? "drop"
      : "idle";
  const chapterStyle = {
    transform: CSS.Transform.toString(chapterTransform),
    transition: chapterTransition,
    scrollMarginTop: MAGIC_SCROLL_MARGIN_TOP_PX,
    boxShadow: chapterGlowShadow(theme.glowRgb, glowIntensity),
  };

  const setRefs = (node: HTMLElement | null) => {
    setChapterSortRef(node);
    setDropRef(node);
  };

  const inCapacityItems =
    recommendedCapacity === null
      ? items
      : items.slice(0, Math.max(recommendedCapacity, 0));
  const beyondCapacityCount =
    recommendedCapacity === null
      ? 0
      : Math.max(0, items.length - recommendedCapacity);

  return (
    <article
      ref={setRefs}
      id={storyboardChapterDomId(chapter.id)}
      style={chapterStyle}
      className={`rounded-2xl border p-6 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:p-8 ${chapterShellClass(
        theme,
        isMagicHighlighted || isDropHighlighted ? "drop" : "rest",
      )} ${isChapterDragging ? "opacity-50" : ""}`}
    >
      <div className="space-y-6">
        <ChapterNarrativeHeader
          chapterIndex={chapter.paletteIndex ?? chapterIndex}
          title={title}
          songTitle={chapter.song?.title}
          songArtist={chapter.song?.artist}
          creditLabel={chapter.song?.creditLabel}
          showCreditInSession={chapter.song?.showCreditInSession}
          capacity={recommendedCapacity}
          assignedCount={chapter.mediaIds.length}
          titleEditAria={titleEditAria}
          chapterReorderAria={chapterReorderAria}
          creditCopy={creditCopy}
          chapterDragHandle={
            chapterSortableEnabled
              ? {
                  attributes: chapterSortAttributes as DraggableAttributes,
                  listeners: chapterSortListeners as SyntheticListenerMap,
                }
              : undefined
          }
          capacityCopy={capacityCopy}
          onTitleChange={onTitleChange}
          onCreditLabelChange={onCreditLabelChange}
          onShowCreditInSessionChange={onShowCreditInSessionChange}
        />

        <ChapterActionCluster
          hasMedia={chapter.mediaIds.length > 0}
          hasUnassigned={hasUnassignedMedia}
          copy={actionsCopy}
          onAutoFill={onAutoFill}
          onClear={onClear}
          onManage={onManage}
        />

        {beyondCapacityCount > 0 && sortableEnabled ? (
          <button
            type="button"
            onClick={onManage}
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left text-sm font-light text-zinc-400 transition-colors hover:border-white/10 hover:text-zinc-300"
          >
            {gridCopy.beyondRhythmHint.replace(
              "{count}",
              String(beyondCapacityCount),
            )}
          </button>
        ) : null}

        <ChapterCanvasGrid
          chapterId={chapter.id}
          items={inCapacityItems}
          chapterIndex={chapter.paletteIndex ?? chapterIndex}
          recommendedCapacity={recommendedCapacity}
          excludedIds={excludedIds}
          focalPoints={focalPoints}
          activeDragIds={activeDragIds}
          selectedMediaIds={selectedMediaIds}
          sortableEnabled={sortableEnabled}
          magicEntranceMediaIds={magicEntranceMediaIds}
          magicEntranceStaggerByMediaId={magicEntranceStaggerByMediaId}
          copy={gridCopy}
          cardCopy={cardCopy}
          toggleSelectAria={toggleSelectAria}
          onMediaClick={(assetId, event) => onMediaClick(assetId, event)}
          onToggleMediaSelect={onToggleMediaSelect}
          onShiftMediaSelect={onShiftMediaSelect}
          resolveChapterDragMediaIds={resolveChapterDragMediaIds}
        />
      </div>
    </article>
  );
}
