"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { X } from "lucide-react";

import {
  MontageMediaCard,
  type MontageMediaCardCopy,
} from "@/src/components/tribute/montage/MontageMediaCard";
import { StoryboardCapacityBadge } from "@/src/components/tribute/storyboard/StoryboardCapacityBadge";
import { EASE_OUT_LUXE } from "@/src/lib/motion/easing";
import { getChapterTheme } from "@/src/lib/wizard/chapterTheme";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import {
  STORYBOARD_MEDIA_DND_TYPE,
  storyboardChapterDroppableId,
  type StoryboardMediaDragData,
} from "@/src/lib/wizard/storyboardDnd";
import type { MontageFocalPoint } from "@/src/lib/wizard/wizardState";

export type ChapterRefinementDrawerCopy = {
  title: string;
  closeAria: string;
  inCapacity: string;
  beyondCapacity: string;
  capacityDivider: string;
  returnToBank: string;
  moveToNextChapter: string;
  capacityRecommended: string;
  capacityPending: string;
};

type Props = {
  isOpen: boolean;
  chapterId: string;
  chapterIndex: number;
  chapterTitle: string;
  songLine?: string;
  recommendedCapacity: number | null;
  inCapacityItems: readonly MontageMediaItem[];
  beyondCapacityItems: readonly MontageMediaItem[];
  excludedIds: readonly string[];
  focalPoints: Readonly<Record<string, MontageFocalPoint>>;
  activeDragIds: readonly string[];
  cardCopy: MontageMediaCardCopy;
  copy: ChapterRefinementDrawerCopy;
  onClose: () => void;
  onMediaClick: (assetId: string) => void;
  onReturnToBank: (mediaIds: readonly string[]) => void;
  onMoveToNextChapter: (mediaIds: readonly string[]) => void;
};

export function ChapterRefinementDrawer({
  isOpen,
  chapterId,
  chapterIndex,
  chapterTitle,
  songLine,
  recommendedCapacity,
  inCapacityItems,
  beyondCapacityItems,
  excludedIds,
  focalPoints,
  activeDragIds,
  cardCopy,
  copy,
  onClose,
  onMediaClick,
  onReturnToBank,
  onMoveToNextChapter,
}: Props) {
  const theme = getChapterTheme(chapterIndex);
  const { setNodeRef, isOver } = useDroppable({
    id: storyboardChapterDroppableId(chapterId),
    disabled: !isOpen,
  });

  const activeDragSet = new Set(activeDragIds);
  const sortableIds = inCapacityItems.map((item) => item.assetId);
  const storyboardDragBase = {
    type: STORYBOARD_MEDIA_DND_TYPE,
    source: { kind: "chapter" as const, chapterId },
  } satisfies Partial<StoryboardMediaDragData>;

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            key="refine-backdrop"
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT_LUXE }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            key="refine-panel"
            role="dialog"
            aria-modal="true"
            aria-label={copy.title}
            className="fixed z-[61] flex flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#020202]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl inset-x-0 bottom-0 top-[5vh] md:inset-4 md:rounded-2xl"
            initial={{ y: 24, opacity: 0.6, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0.6, scale: 0.98 }}
            transition={{ duration: 0.4, ease: EASE_OUT_LUXE }}
          >
            <div
              className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"
              aria-hidden
            />

            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] px-5 pb-4 pt-5 md:px-8 md:pt-6">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${theme.dot}`}
                    aria-hidden
                  />
                  <h3 className="font-[family-name:var(--font-label)] text-lg font-semibold tracking-tight text-white">
                    {copy.title.replace("{chapter}", chapterTitle)}
                  </h3>
                  <StoryboardCapacityBadge
                    capacity={recommendedCapacity}
                    assignedCount={
                      inCapacityItems.length + beyondCapacityItems.length
                    }
                    showAssigned
                    copy={{
                      recommended: copy.capacityRecommended,
                      pending: copy.capacityPending,
                    }}
                  />
                </div>
                {songLine ? (
                  <p className="truncate text-sm font-light text-zinc-500">
                    {songLine}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={copy.closeAria}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>
            </div>

            <div
              ref={setNodeRef}
              className={`min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8 ${
                isOver ? "ring-1 ring-inset ring-amber-400/20" : ""
              }`}
            >
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                {copy.inCapacity}
              </p>
              <SortableContext
                items={sortableIds}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {inCapacityItems.map((item, index) => (
                    <MontageMediaCard
                      key={item.assetId}
                      item={item}
                      chapterIndex={chapterIndex}
                      index={index}
                      isSelected={false}
                      isGroupDragging={activeDragSet.has(item.assetId)}
                      isExcluded={excludedIds.includes(item.assetId)}
                      hasFocalPoint={Boolean(focalPoints[item.assetId])}
                      copy={cardCopy}
                      sortableData={{
                        ...storyboardDragBase,
                        mediaIds: [item.assetId],
                      }}
                      onCardClick={(_, event) => {
                        event.stopPropagation();
                        onMediaClick(item.assetId);
                      }}
                    />
                  ))}
                </div>
              </SortableContext>

              {beyondCapacityItems.length > 0 ? (
                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/[0.06]" />
                    <p className="shrink-0 text-xs font-light text-zinc-500">
                      {copy.capacityDivider.replace(
                        "{count}",
                        recommendedCapacity === null
                          ? "—"
                          : String(recommendedCapacity),
                      )}
                    </p>
                    <div className="h-px flex-1 bg-white/[0.06]" />
                  </div>

                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                    {copy.beyondCapacity}
                  </p>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {beyondCapacityItems.map((item, index) => (
                      <div
                        key={item.assetId}
                        className="opacity-40 saturate-50 grayscale transition-opacity hover:opacity-55"
                      >
                        <MontageMediaCard
                          item={item}
                          chapterIndex={chapterIndex}
                          index={index}
                          isSelected={false}
                          isGroupDragging={false}
                          isExcluded={excludedIds.includes(item.assetId)}
                          hasFocalPoint={Boolean(focalPoints[item.assetId])}
                          copy={cardCopy}
                          onCardClick={(_, event) => {
                            event.stopPropagation();
                            onMediaClick(item.assetId);
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/10 px-3 text-xs font-light text-zinc-300 hover:border-white/20"
                      onClick={() =>
                        onReturnToBank(beyondCapacityItems.map((i) => i.assetId))
                      }
                    >
                      {copy.returnToBank}
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/10 px-3 text-xs font-light text-zinc-300 hover:border-white/20"
                      onClick={() =>
                        onMoveToNextChapter(
                          beyondCapacityItems.map((i) => i.assetId),
                        )
                      }
                    >
                      {copy.moveToNextChapter}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
