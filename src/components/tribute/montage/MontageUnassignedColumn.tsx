"use client";

import type { MouseEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";

import { MontageInsertionIndicator } from "@/src/components/tribute/montage/MontageInsertionIndicator";
import {
  MontageMediaCard,
  type MontageMediaCardCopy,
} from "@/src/components/tribute/montage/MontageMediaCard";
import { UNASSIGNED_CONTAINER_ID } from "@/src/lib/wizard/montageHelpers";
import type { MontageInsertionPreview } from "@/src/lib/wizard/montageDropIntent";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import type { WizardMontageState } from "@/src/lib/wizard/wizardState";

export type MontageUnassignedColumnCopy = {
  title: string;
  emptyHint: string;
} & MontageMediaCardCopy;

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

type Props = {
  assetIds: string[];
  mediaById: Map<string, MontageMediaItem>;
  montage: WizardMontageState;
  selectedIds: Set<string>;
  draggingIds: Set<string>;
  insertionPreview: MontageInsertionPreview | null;
  isDragging: boolean;
  duplicateIds: Set<string>;
  copy: MontageUnassignedColumnCopy;
  onCardClick: (assetId: string, event: MouseEvent) => void;
  onRemoveMedia: (assetId: string) => void;
};

export function MontageUnassignedColumn({
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
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: UNASSIGNED_CONTAINER_ID,
    data: { type: "montage-unassigned" },
  });

  const showInsertion = insertionPreview?.target.kind === "unassigned";
  const insertionAt = showInsertion
    ? insertionRenderIndex(assetIds, draggingIds, insertionPreview.index)
    : -1;
  const columnActive = isOver || showInsertion;

  return (
    <section
      ref={setNodeRef}
      data-drop-column={UNASSIGNED_CONTAINER_ID}
      className={`mt-10 flex min-h-[min(28vh,20rem)] flex-col rounded-2xl border border-dashed p-4 transition-all duration-200 ${
        columnActive
          ? "border-zinc-400/40 bg-white/[0.05]"
          : "border-white/10 bg-white/[0.015]"
      }`}
    >
      <header className="pointer-events-none mb-4 px-1">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
          {copy.title}
        </h3>
        <p className="mt-1 text-xs font-light text-zinc-600">{copy.emptyHint}</p>
      </header>

      <SortableContext
        id={UNASSIGNED_CONTAINER_ID}
        items={assetIds}
        strategy={rectSortingStrategy}
      >
        <div
          className={`relative flex min-h-[12rem] flex-1 ${
            assetIds.length === 0 ? "items-center justify-center" : ""
          }`}
        >
          {assetIds.length === 0 ? (
            <div className="flex w-full flex-col items-center justify-center">
              {showInsertion && insertionPreview.index === 0 ? (
                <div className="mb-4 w-full max-w-md px-4">
                  <MontageInsertionIndicator variant="unassigned" />
                </div>
              ) : null}
              <p
                className={`text-center text-sm font-light ${
                  columnActive ? "text-zinc-400" : "text-zinc-600"
                }`}
              >
                —
              </p>
            </div>
          ) : (
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-2.5 lg:grid-cols-6">
              {assetIds.map((assetId, index) => {
                const item = mediaById.get(assetId);
                if (!item) return null;
                return (
                  <div key={assetId} className="contents">
                    {showInsertion && insertionAt === index ? (
                      <MontageInsertionIndicator
                        variant="unassigned"
                        spanClassName="col-span-full"
                      />
                    ) : null}
                    <MontageMediaCard
                      actId="spark"
                      variant="unassigned"
                      item={item}
                      index={index}
                      isSelected={selectedIds.has(assetId)}
                      isDuplicate={duplicateIds.has(assetId)}
                      isGroupDragging={isDragging && draggingIds.has(assetId)}
                      isExcluded={false}
                      hasFocalPoint={false}
                      copy={copy}
                      onCardClick={onCardClick}
                      onRemove={onRemoveMedia}
                    />
                  </div>
                );
              })}
              {showInsertion && insertionAt === assetIds.length ? (
                <MontageInsertionIndicator
                  variant="unassigned"
                  spanClassName="col-span-full"
                />
              ) : null}
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
