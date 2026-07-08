"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Check, Film, Image as ImageIcon } from "lucide-react";

import { StoragePreviewImage } from "@/src/components/media/StoragePreviewImage";
import { getUnassignedCardTheme } from "@/src/lib/wizard/chapterTheme";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import {
  STORYBOARD_MEDIA_DND_TYPE,
  type StoryboardMediaDragData,
} from "@/src/lib/wizard/storyboardDnd";
import type { MontageMediaCardCopy } from "@/src/components/tribute/montage/MontageMediaCard";

type Props = {
  item: MontageMediaItem;
  isSelected: boolean;
  isGroupDragging: boolean;
  dragMediaIds: readonly string[];
  copy: MontageMediaCardCopy;
  toggleSelectAria: string;
  onToggleSelect: (assetId: string) => void;
  onOpenDirector: (assetId: string) => void;
  onShiftSelect: (assetId: string) => void;
};

export function BankDraggableMediaTile({
  item,
  isSelected,
  isGroupDragging,
  dragMediaIds,
  copy,
  toggleSelectAria,
  onToggleSelect,
  onOpenDirector,
  onShiftSelect,
}: Props) {
  const theme = getUnassignedCardTheme();

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.assetId,
      data: {
        type: STORYBOARD_MEDIA_DND_TYPE,
        source: { kind: "bank" },
        mediaIds: dragMediaIds.includes(item.assetId)
          ? [...dragMediaIds]
          : [item.assetId],
      } satisfies StoryboardMediaDragData,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const isGhost = isDragging || (isGroupDragging && isSelected);

  const preview = item.previewUrl ? (
    <StoragePreviewImage
      src={item.previewUrl}
      fallbackSrc={item.fullPreviewUrl}
      alt=""
      className="pointer-events-none h-full w-full object-cover"
      draggable={false}
    />
  ) : item.isVideo ? (
    <div className="pointer-events-none flex h-full w-full items-center justify-center bg-[#020202]">
      <Film className="h-7 w-7 text-zinc-600" strokeWidth={1.1} />
    </div>
  ) : (
    <div className="pointer-events-none flex h-full w-full items-center justify-center bg-[#020202]">
      <ImageIcon className="h-7 w-7 text-zinc-600" strokeWidth={1.1} />
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/tile relative aspect-video w-full touch-none ${
        isGhost ? "z-10 opacity-40" : ""
      }`}
      {...listeners}
      {...attributes}
    >
      <div
        className={`relative h-full w-full overflow-hidden rounded-xl ring-1 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 ${
          isSelected
            ? "ring-2 ring-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.12)]"
            : "ring-white/10 hover:ring-white/20"
        } ${isGhost ? "scale-[0.97]" : ""}`}
        style={{
          boxShadow: isSelected ? theme.cardHoverShadow : undefined,
        }}
      >
        <button
          type="button"
          className="absolute inset-0 z-[1] block h-full w-full cursor-grab active:cursor-grabbing"
          aria-label={`${copy.clickToEdit} — ${item.displayName}`}
          onClick={(event) => {
            if (event.shiftKey) {
              event.stopPropagation();
              onShiftSelect(item.assetId);
              return;
            }
            if (event.defaultPrevented) return;
            onOpenDirector(item.assetId);
          }}
        >
          {preview}
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelect(item.assetId);
          }}
          aria-pressed={isSelected}
          aria-label={toggleSelectAria}
          className={`absolute right-2 top-2 z-[20] flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-200 ${
            isSelected
              ? "border-amber-400/60 bg-amber-400 text-[#020202] opacity-100"
              : "border-white/20 bg-black/50 text-transparent opacity-0 group-hover/tile:opacity-100"
          }`}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        </button>

        <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-[#020202]/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/tile:opacity-100" />
      </div>
    </div>
  );
}
