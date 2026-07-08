"use client";

import {
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import {
  MontageMediaCard,
  type MontageMediaCardCopy,
} from "@/src/components/tribute/montage/MontageMediaCard";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import {
  STORYBOARD_MEDIA_DND_TYPE,
  type StoryboardMediaDragData,
} from "@/src/lib/wizard/storyboardDnd";
import type { MontageFocalPoint } from "@/src/lib/wizard/wizardState";

import { CanvasGhostSlot } from "@/src/components/tribute/storyboard/CanvasGhostSlot";
import { MediaInstantTile } from "@/src/components/tribute/storyboard/MediaInstantTile";

export type ChapterCanvasGridCopy = {
  emptyHint: string;
};

type Props = {
  chapterId: string;
  items: readonly MontageMediaItem[];
  chapterIndex: number;
  recommendedCapacity: number | null;
  excludedIds: readonly string[];
  focalPoints: Readonly<Record<string, MontageFocalPoint>>;
  activeDragIds: readonly string[];
  selectedMediaIds: readonly string[];
  sortableEnabled: boolean;
  copy: ChapterCanvasGridCopy;
  cardCopy: MontageMediaCardCopy;
  toggleSelectAria: string;
  onMediaClick: (assetId: string, event?: React.MouseEvent) => void;
  onToggleMediaSelect: (assetId: string) => void;
  onShiftMediaSelect: (assetId: string) => void;
  resolveChapterDragMediaIds: (assetId: string) => readonly string[];
};

const MAX_VISIBLE_GHOSTS = 6;

export function ChapterCanvasGrid({
  chapterId,
  items,
  chapterIndex,
  recommendedCapacity,
  excludedIds,
  focalPoints,
  activeDragIds,
  selectedMediaIds,
  sortableEnabled,
  copy,
  cardCopy,
  toggleSelectAria,
  onMediaClick,
  onToggleMediaSelect,
  onShiftMediaSelect,
  resolveChapterDragMediaIds,
}: Props) {
  const assignedCount = items.length;
  const ghostCount =
    recommendedCapacity === null
      ? assignedCount === 0
        ? 3
        : 0
      : Math.min(
          Math.max(0, recommendedCapacity - assignedCount),
          MAX_VISIBLE_GHOSTS,
        );

  const isEmpty = assignedCount === 0;
  const activeDragSet = new Set(activeDragIds);
  const selectedSet = new Set(selectedMediaIds);
  const sortableIds = items.map((item) => item.assetId);

  const storyboardDragBase = {
    type: STORYBOARD_MEDIA_DND_TYPE,
    source: { kind: "chapter" as const, chapterId },
  } satisfies Partial<StoryboardMediaDragData>;

  return (
    <div className="relative">
      {isEmpty ? (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 z-[1] -translate-y-1/2 text-center text-sm font-light text-zinc-600">
          {copy.emptyHint}
        </p>
      ) : null}

      <div
        className="grid grid-cols-3 gap-3 lg:grid-cols-6"
        role="list"
        aria-label={`Médias du chapitre — ${assignedCount} placé(s)`}
      >
        {sortableEnabled ? (
          <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
            {items.map((item, index) => (
              <div key={item.assetId} role="listitem">
                <MontageMediaCard
                  item={item}
                  chapterIndex={chapterIndex}
                  index={index}
                  isSelected={selectedSet.has(item.assetId)}
                  isGroupDragging={activeDragSet.has(item.assetId)}
                  isExcluded={excludedIds.includes(item.assetId)}
                  hasFocalPoint={Boolean(focalPoints[item.assetId])}
                  copy={cardCopy}
                  selectable
                  toggleSelectAria={toggleSelectAria}
                  onToggleSelect={() => onToggleMediaSelect(item.assetId)}
                  sortableData={{
                    ...storyboardDragBase,
                    mediaIds: [...resolveChapterDragMediaIds(item.assetId)],
                  }}
                  onCardClick={(assetId, event) => {
                    if (event.shiftKey) {
                      event.stopPropagation();
                      onShiftMediaSelect(assetId);
                      return;
                    }
                    onMediaClick(assetId, event);
                  }}
                />
              </div>
            ))}
          </SortableContext>
        ) : (
          items.map((item, index) => (
            <div key={item.assetId} role="listitem">
              <MediaInstantTile
                item={item}
                chapterIndex={chapterIndex}
                sequenceIndex={index}
                variant="chapter"
                isExcluded={excludedIds.includes(item.assetId)}
                hasFocalPoint={Boolean(focalPoints[item.assetId])}
                copy={cardCopy}
                onClick={(assetId) => onMediaClick(assetId)}
              />
            </div>
          ))
        )}

        {Array.from({ length: ghostCount }, (_, index) => (
          <CanvasGhostSlot key={`ghost-${index}`} />
        ))}
      </div>
    </div>
  );
}
