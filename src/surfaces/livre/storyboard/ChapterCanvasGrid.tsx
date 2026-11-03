"use client";

import {
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";

import {
  MontageMediaCard,
  type MontageMediaCardCopy,
} from "@/src/surfaces/livre/montage/MontageMediaCard";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import {
  STORYBOARD_CHAPTER_GRID_ATTR,
  STORYBOARD_CHAPTER_GRID_SURFACE_ATTR,
  STORYBOARD_MEDIA_DND_TYPE,
  type StoryboardMediaDragData,
} from "@/src/lib/wizard/storyboardDnd";
import type { MontageFocalPoint } from "@/src/lib/wizard/wizardState";

import { CanvasGhostSlot } from "@/src/surfaces/livre/storyboard/CanvasGhostSlot";
import { MediaInstantTile } from "@/src/surfaces/livre/storyboard/MediaInstantTile";

export type ChapterCanvasGridCopy = {
  emptyHint: string;
  /** Doit contenir `{count}`. */
  beyondRhythmHint: string;
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
  magicEntranceMediaIds: ReadonlySet<string>;
  magicEntranceStaggerByMediaId: ReadonlyMap<string, number>;
  copy: ChapterCanvasGridCopy;
  cardCopy: MontageMediaCardCopy;
  toggleSelectAria: string;
  onMediaClick: (assetId: string, event?: React.MouseEvent) => void;
  onToggleMediaSelect: (assetId: string) => void;
  onShiftMediaSelect: (assetId: string) => void;
  resolveChapterDragMediaIds: (assetId: string) => readonly string[];
  /** S5-K — clic / tap grille active le focus (sans bloquer onMediaClick). */
  onOrganicFocusActivate: () => void;
  onOrganicFocusDwellStart: () => void;
  onOrganicFocusDwellCancel: () => void;
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
  magicEntranceMediaIds,
  magicEntranceStaggerByMediaId,
  copy,
  cardCopy,
  toggleSelectAria,
  onMediaClick,
  onToggleMediaSelect,
  onShiftMediaSelect,
  resolveChapterDragMediaIds,
  onOrganicFocusActivate,
  onOrganicFocusDwellStart,
  onOrganicFocusDwellCancel,
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
    <div
      className="relative"
      onPointerEnter={onOrganicFocusDwellStart}
      onPointerLeave={onOrganicFocusDwellCancel}
      onPointerDown={onOrganicFocusDwellCancel}
      onClick={onOrganicFocusActivate}
    >
      {isEmpty ? (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 z-[1] -translate-y-1/2 text-center text-sm font-light text-zinc-400">
          {copy.emptyHint}
        </p>
      ) : null}

      <div
        {...{
          [STORYBOARD_CHAPTER_GRID_ATTR]: chapterId,
          [STORYBOARD_CHAPTER_GRID_SURFACE_ATTR]: "book",
        }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
        role="list"
        aria-label={`Médias du chapitre · ${assignedCount} placé(s)`}
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
                  magicEntrance={magicEntranceMediaIds.has(item.assetId)}
                  magicStaggerIndex={
                    magicEntranceStaggerByMediaId.get(item.assetId) ?? 0
                  }
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
                      // Garde la sélection multiple ; stopPropagation évite le
                      // onClick grille, donc on active le focus explicitement.
                      event.stopPropagation();
                      onOrganicFocusActivate();
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
