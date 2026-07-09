"use client";

import { useDroppable } from "@dnd-kit/core";

import type { MontageMediaCardCopy } from "@/src/components/tribute/montage/MontageMediaCard";
import { BankDraggableMediaTile } from "@/src/components/tribute/storyboard/BankDraggableMediaTile";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import { STORYBOARD_BANK_DROPPABLE_ID } from "@/src/lib/wizard/storyboardDnd";

export type MediaBankColumnCopy = {
  title: string;
  /** Doit contenir `{count}`. */
  count: string;
  empty: string;
  selectAll: string;
  deselectAll: string;
  /** Doit contenir `{count}`. */
  selectedCount: string;
  toggleSelectAria: string;
  magicComposition: string;
};

type Props = {
  items: readonly MontageMediaItem[];
  selectedMediaIds: readonly string[];
  activeDragIds: readonly string[];
  isDropHighlighted: boolean;
  copy: MediaBankColumnCopy;
  cardCopy: MontageMediaCardCopy;
  resolveBankDragMediaIds: (assetId: string) => readonly string[];
  onMediaClick: (assetId: string) => void;
  onToggleMediaSelect: (assetId: string) => void;
  onShiftMediaSelect: (assetId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  isMagicRunning: boolean;
  hasUnassignedMedia: boolean;
  onMagicComposition: () => void;
};

export function MediaBankColumn({
  items,
  selectedMediaIds,
  activeDragIds,
  isDropHighlighted,
  copy,
  cardCopy,
  resolveBankDragMediaIds,
  onMediaClick,
  onToggleMediaSelect,
  onShiftMediaSelect,
  onSelectAll,
  onDeselectAll,
  isMagicRunning,
  hasUnassignedMedia,
  onMagicComposition,
}: Props) {
  const { setNodeRef } = useDroppable({
    id: STORYBOARD_BANK_DROPPABLE_ID,
  });

  const selectedSet = new Set(selectedMediaIds);
  const activeDragSet = new Set(activeDragIds);
  const allSelected = items.length > 0 && selectedMediaIds.length === items.length;

  return (
    <aside
      className={`flex min-h-0 flex-col rounded-2xl border bg-white/[0.02] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] ${
        isDropHighlighted
          ? "border-amber-400/30 ring-2 ring-amber-400/20 shadow-[0_0_32px_rgba(251,191,36,0.08)]"
          : "border-white/[0.06]"
      }`}
      aria-label={copy.title}
    >
      <div className="shrink-0 space-y-2 border-b border-white/[0.06] px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-[family-name:var(--font-label)] text-sm font-semibold tracking-wide text-zinc-200">
            {copy.title}
          </h3>
          {items.length > 0 ? (
            <button
              type="button"
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="text-[11px] font-light text-zinc-500 underline decoration-white/15 underline-offset-4 transition-colors hover:text-zinc-300"
            >
              {allSelected ? copy.deselectAll : copy.selectAll}
            </button>
          ) : null}
        </div>
        <p className="text-xs font-light text-zinc-500">
          {selectedMediaIds.length > 0
            ? copy.selectedCount.replace(
                "{count}",
                String(selectedMediaIds.length),
              )
            : items.length > 0
              ? copy.count.replace("{count}", String(items.length))
              : copy.empty}
        </p>
        <button
          type="button"
          disabled={!hasUnassignedMedia || isMagicRunning}
          onClick={onMagicComposition}
          className="w-full rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2.5 text-left text-xs font-light text-amber-100/90 transition-all duration-300 hover:border-amber-400/35 hover:bg-amber-400/[0.1] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copy.magicComposition}
        </button>
      </div>

      <div ref={setNodeRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm font-light text-zinc-600">
            {copy.empty}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <BankDraggableMediaTile
                key={item.assetId}
                item={item}
                isSelected={selectedSet.has(item.assetId)}
                isGroupDragging={activeDragSet.has(item.assetId)}
                dragMediaIds={resolveBankDragMediaIds(item.assetId)}
                copy={cardCopy}
                toggleSelectAria={copy.toggleSelectAria}
                onToggleSelect={onToggleMediaSelect}
                onOpenDirector={onMediaClick}
                onShiftSelect={onShiftMediaSelect}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
