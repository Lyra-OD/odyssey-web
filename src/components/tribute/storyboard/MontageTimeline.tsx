"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { motion } from "framer-motion";
import { useCallback, useState } from "react";

import {
  MontageMediaCard,
  MontageMediaCardDragOverlay,
  type MontageMediaCardCopy,
} from "@/src/components/tribute/montage/MontageMediaCard";
import { useMontageAutoScroll } from "@/src/hooks/useMontageAutoScroll";
import { EASE_OUT_LUXE } from "@/src/lib/motion/easing";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import type { MontageFocalPoint } from "@/src/lib/wizard/wizardState";

export type MontageTimelineCopy = {
  emptyTitle: string;
  emptyHint: string;
  sequenceAria: string;
};

type Props = {
  items: readonly MontageMediaItem[];
  chapterId: string;
  chapterIndex: number;
  excludedIds: readonly string[];
  focalPoints: Readonly<Record<string, MontageFocalPoint>>;
  recentlyAddedIds?: ReadonlySet<string>;
  copy: MontageTimelineCopy;
  cardCopy: MontageMediaCardCopy;
  onReorder: (activeId: string, overId: string) => void;
  onCardClick: (assetId: string) => void;
};

/**
 * Timeline horizontale du chapitre actif — réordonnancement dnd-kit (axe horizontal).
 */
export function MontageTimeline({
  items,
  chapterId,
  chapterIndex,
  excludedIds,
  focalPoints,
  recentlyAddedIds,
  copy,
  cardCopy,
  onReorder,
  onCardClick,
}: Props) {
  const autoScroll = useMontageAutoScroll();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sortableIds = items.map((item) => item.assetId);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      onReorder(String(active.id), String(over.id));
    },
    [onReorder],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const activeItem = activeDragId
    ? items.find((item) => item.assetId === activeDragId)
    : null;
  const activeIndex = activeItem
    ? items.findIndex((item) => item.assetId === activeDragId)
    : -1;

  if (items.length === 0) {
    return (
      <div className="flex min-h-[10rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
        <p className="text-sm font-light text-zinc-400">{copy.emptyTitle}</p>
        <p className="max-w-sm text-xs font-light leading-relaxed text-zinc-500">
          {copy.emptyHint}
        </p>
      </div>
    );
  }

  return (
    <DndContext
      id={`timeline-${chapterId}`}
      sensors={sensors}
      collisionDetection={closestCenter}
      autoScroll={autoScroll}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
        <div
          className="scrollbar-thin -mx-1 flex gap-3 overflow-x-auto px-1 pb-2 pt-1"
          role="list"
          aria-label={copy.sequenceAria}
        >
          {items.map((item, index) => {
            const isRecentlyAdded = recentlyAddedIds?.has(item.assetId) ?? false;
            const isExcluded = excludedIds.includes(item.assetId);
            const hasFocalPoint = Boolean(focalPoints[item.assetId]);

            return (
              <motion.div
                key={item.assetId}
                role="listitem"
                className="w-36 shrink-0 sm:w-44"
                initial={
                  isRecentlyAdded
                    ? { opacity: 0, scale: 0.88, y: 8 }
                    : false
                }
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE_OUT_LUXE }}
              >
                <MontageMediaCard
                  item={item}
                  chapterIndex={chapterIndex}
                  index={index}
                  isSelected={false}
                  isGroupDragging={false}
                  isExcluded={isExcluded}
                  hasFocalPoint={hasFocalPoint}
                  copy={cardCopy}
                  onCardClick={(_, event) => {
                    event.stopPropagation();
                    onCardClick(item.assetId);
                  }}
                />
              </motion.div>
            );
          })}
          <div
            className="flex w-28 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/8 bg-white/[0.01] sm:w-36"
            aria-hidden
          >
            <span className="text-[10px] font-light uppercase tracking-[0.2em] text-zinc-600">
              +
            </span>
          </div>
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 280, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
        {activeItem && activeIndex >= 0 ? (
          <MontageMediaCardDragOverlay
            item={activeItem}
            chapterIndex={chapterIndex}
            index={activeIndex}
            isExcluded={excludedIds.includes(activeItem.assetId)}
            hasFocalPoint={Boolean(focalPoints[activeItem.assetId])}
            copy={cardCopy}
            elevated
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
