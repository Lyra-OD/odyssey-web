"use client";

import type { MouseEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";

import { MontageInsertionIndicator } from "@/src/components/tribute/montage/MontageInsertionIndicator";
import {
  MontageMediaCard,
  type MontageMediaCardCopy,
} from "@/src/components/tribute/montage/MontageMediaCard";
import { getMontageActTheme } from "@/src/lib/wizard/montageActTheme";
import { droppableActId } from "@/src/lib/wizard/montageHelpers";
import type { MontageInsertionPreview } from "@/src/lib/wizard/montageDropIntent";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import type { MontageActId, WizardMontageState } from "@/src/lib/wizard/wizardState";

export type MontageActColumnCopy = {
  actLabel: string;
  actSubtitle: string;
  emptyHint: string;
} & MontageMediaCardCopy;

const gridStagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

function insertionRenderIndex(
  assetIds: string[],
  movingIds: Set<string>,
  filteredInsertIndex: number,
): number {
  let filteredCount = 0;
  for (let i = 0; i <= assetIds.length; i++) {
    if (filteredCount === filteredInsertIndex) return i;
    if (i < assetIds.length && !movingIds.has(assetIds[i])) {
      filteredCount += 1;
    }
  }
  return assetIds.length;
}

function isInsertionTarget(
  preview: MontageInsertionPreview | null,
  actId: MontageActId,
): preview is MontageInsertionPreview {
  return Boolean(
    preview &&
      preview.target.kind === "act" &&
      preview.target.actId === actId,
  );
}

type Props = {
  actId: MontageActId;
  assetIds: string[];
  mediaById: Map<string, MontageMediaItem>;
  montage: WizardMontageState;
  selectedIds: Set<string>;
  draggingIds: Set<string>;
  insertionPreview: MontageInsertionPreview | null;
  isDragging: boolean;
  duplicateIds: Set<string>;
  copy: MontageActColumnCopy;
  onCardClick: (assetId: string, event: MouseEvent) => void;
  onRemoveMedia: (assetId: string) => void;
  columnIndex?: number;
};

export function MontageActColumn({
  actId,
  assetIds,
  mediaById,
  montage,
  selectedIds,
  draggingIds,
  insertionPreview,
  isDragging,
  duplicateIds,
  copy,
  onCardClick,
  onRemoveMedia,
  columnIndex = 0,
}: Props) {
  const theme = getMontageActTheme(actId);
  const excluded = new Set(montage.excludedIds);
  const containerId = droppableActId(actId);

  const { setNodeRef, isOver } = useDroppable({
    id: containerId,
    data: { type: "montage-act", actId },
  });

  const showInsertion = isInsertionTarget(insertionPreview, actId);
  const insertionAt = showInsertion
    ? insertionRenderIndex(assetIds, draggingIds, insertionPreview.index)
    : -1;

  const columnActive = isOver || showInsertion;

  return (
    <section
      ref={setNodeRef}
      data-drop-column={containerId}
      className={`relative flex min-h-[min(72vh,42rem)] flex-col rounded-2xl bg-zinc-900/50 p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),inset_0_0_32px_rgba(0,0,0,0.22)] ring-1 transition-all duration-200 ${
        columnActive
          ? `${theme.columnDropRing} bg-zinc-900/70`
          : theme.columnRing
      }`}
    >
      <motion.header
        className="pointer-events-none mb-5 shrink-0 px-0.5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          delay: columnIndex * 0.1,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        <h3
          className={`text-[11px] font-semibold uppercase tracking-widest ${theme.headerText}`}
        >
          {copy.actSubtitle} : {copy.actLabel}
        </h3>
        <hr
          className={`mt-3 h-px w-full border-0 ${theme.headerDivider}`}
          aria-hidden
        />
      </motion.header>

      <SortableContext
        id={containerId}
        items={assetIds}
        strategy={rectSortingStrategy}
      >
        <div
          className={`relative flex min-h-0 flex-1 flex-col px-1 pb-2 ${
            assetIds.length === 0 ? "justify-center" : ""
          }`}
        >
          {assetIds.length === 0 ? (
            <div className="flex min-h-[20rem] flex-1 flex-col items-center justify-center">
              {showInsertion && insertionPreview.index === 0 ? (
                <div className="mb-4 w-full max-w-xs px-4">
                  <MontageInsertionIndicator actId={actId} />
                </div>
              ) : null}
              <p
                className={`text-center text-sm font-light ${
                  columnActive ? theme.headerText : "text-zinc-600"
                }`}
              >
                {copy.emptyHint}
              </p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 gap-2 md:gap-2.5"
              variants={gridStagger}
              initial="hidden"
              animate="visible"
            >
              {assetIds.map((assetId, index) => {
                const item = mediaById.get(assetId);
                if (!item) return null;
                return (
                  <div key={assetId} className="contents">
                    {showInsertion && insertionAt === index ? (
                      <MontageInsertionIndicator actId={actId} />
                    ) : null}
                    <MontageMediaCard
                      actId={actId}
                      item={item}
                      index={index}
                      isSelected={selectedIds.has(assetId)}
                      isDuplicate={duplicateIds.has(assetId)}
                      isGroupDragging={isDragging && draggingIds.has(assetId)}
                      isExcluded={excluded.has(assetId)}
                      hasFocalPoint={Boolean(montage.focalPoints[assetId])}
                      copy={copy}
                      onCardClick={onCardClick}
                      onRemove={onRemoveMedia}
                    />
                  </div>
                );
              })}
              {showInsertion && insertionAt === assetIds.length ? (
                <MontageInsertionIndicator actId={actId} />
              ) : null}
            </motion.div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
