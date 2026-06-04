"use client";

import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Film, GripVertical, Check, Image as ImageIcon, Trash2 } from "lucide-react";

import { getMontageActTheme } from "@/src/lib/wizard/montageActTheme";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import type { MontageActId } from "@/src/lib/wizard/wizardState";

export type MontageMediaCardCopy = {
  clickToEdit: string;
  dragHandle: string;
  remove: string;
  duplicateBadge: string;
  deleteDuplicate: string;
};

export const MONTAGE_CARD_DND_TYPE = "montage-card";

type SurfaceProps = {
  item: MontageMediaItem;
  actId: MontageActId;
  variant?: "act" | "unassigned";
  index: number;
  isSelected: boolean;
  isDuplicate?: boolean;
  isExcluded: boolean;
  hasFocalPoint: boolean;
  copy: MontageMediaCardCopy;
  isGhost?: boolean;
  isOverlay?: boolean;
  showDragHandle?: boolean;
  showRemove?: boolean;
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
  };
  onCardClick?: (assetId: string, event: React.MouseEvent) => void;
  onRemove?: (assetId: string) => void;
};

export const montageCardVariants = {
  hidden: {
    opacity: 0,
    y: 18,
    scale: 0.94,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

function formatSequenceIndex(index: number) {
  return String(index + 1).padStart(2, "0");
}

function MontageMediaCardSurface({
  item,
  actId,
  variant = "act",
  index,
  isSelected,
  isDuplicate = false,
  isExcluded,
  hasFocalPoint,
  copy,
  isGhost = false,
  isOverlay = false,
  showDragHandle = true,
  showRemove = false,
  dragHandleProps,
  onCardClick,
  onRemove,
}: SurfaceProps) {
  const theme =
    variant === "unassigned"
      ? {
          badgeBg: "bg-zinc-500/20",
          badgeText: "text-zinc-400",
          focalBg: "bg-zinc-400",
          focalGlow: [
            "0 0 8px rgba(161,161,170,0.45)",
            "0 0 16px rgba(161,161,170,0.75)",
            "0 0 8px rgba(161,161,170,0.45)",
          ] as [string, string, string],
          overlayShadow:
            "0 24px 80px rgba(0,0,0,0.65), 0 0 48px rgba(161,161,170,0.1)",
          focusRing: "focus-visible:ring-zinc-400/30",
        }
      : getMontageActTheme(actId);
  const sequence = formatSequenceIndex(index);
  const handleListeners = dragHandleProps?.listeners;
  const {
    onPointerDown: dndPointerDown,
    ...restHandleListeners
  } = handleListeners ?? {};

  return (
    <div
      className={`group/card relative aspect-video w-full overflow-hidden rounded-xl ring-1 ring-white/10 ${
        isDuplicate && !isGhost ? "ring-amber-500/35" : ""
      } ${
        isOverlay
          ? `scale-105 cursor-grabbing ring-white/20 ${theme.focusRing}`
          : ""
      } ${isGhost ? "opacity-30" : ""} ${
        isExcluded && !isGhost ? "opacity-40 grayscale" : ""
      }`}
      style={
        isOverlay ? { boxShadow: theme.overlayShadow } : undefined
      }
    >
      {onCardClick ? (
        <button
          type="button"
          className={`absolute inset-0 z-[1] block h-full w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020202] ${theme.focusRing}`}
          aria-label={`${copy.clickToEdit} — ${item.displayName}`}
          aria-pressed={isSelected}
          onClick={(event) => onCardClick(item.assetId, event)}
        >
          {item.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.previewUrl}
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
          )}
        </button>
      ) : item.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.previewUrl}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : item.isVideo ? (
        <div className="flex h-full w-full items-center justify-center bg-[#020202]">
          <Film className="h-7 w-7 text-zinc-600" strokeWidth={1.1} />
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#020202]">
          <ImageIcon className="h-7 w-7 text-zinc-600" strokeWidth={1.1} />
        </div>
      )}

      {variant === "act" ? (
        <span
          className={`pointer-events-none absolute left-2 top-2 z-[2] rounded-md px-2 py-1 font-mono text-xs font-semibold tabular-nums tracking-wider ${theme.badgeBg} ${theme.badgeText}`}
          aria-hidden
        >
          {sequence}
        </span>
      ) : null}

      {isDuplicate ? (
        <span
          className="pointer-events-none absolute right-2 top-11 z-[3] rounded-md bg-amber-500/95 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#020202] shadow-sm"
          aria-hidden
        >
          {copy.duplicateBadge}
        </span>
      ) : null}

      {showDragHandle && dragHandleProps ? (
        <button
          type="button"
          className={`absolute right-2 top-2 z-[20] flex h-8 w-8 cursor-grab touch-none items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/70 opacity-70 backdrop-blur-md transition-all duration-200 hover:border-white/25 hover:bg-black/60 hover:text-white active:cursor-grabbing group-hover/card:opacity-100 ${theme.badgeText} group-hover/card:opacity-100`}
          aria-label={copy.dragHandle}
          {...dragHandleProps.attributes}
          {...restHandleListeners}
          onPointerDown={(event) => {
            dndPointerDown?.(event);
            event.stopPropagation();
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      ) : null}

      {showRemove && onRemove ? (
        <button
          type="button"
          className="absolute bottom-2 left-2 z-[20] flex h-7 w-7 items-center justify-center rounded-full border border-red-500/15 bg-black/45 text-red-400/70 opacity-0 backdrop-blur-md transition-all duration-200 hover:border-red-500/30 hover:text-red-400/90 group-hover/card:opacity-100"
          aria-label={isDuplicate ? copy.deleteDuplicate : copy.remove}
          onClick={(event) => {
            event.stopPropagation();
            onRemove(item.assetId);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
        </button>
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-[#020202]/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />

      {hasFocalPoint && variant === "act" ? (
        <motion.span
          className={`pointer-events-none absolute bottom-2 z-[2] h-2 w-2 rounded-full ${theme.focalBg} ${
            isSelected ? "right-9" : "right-2"
          }`}
          aria-hidden
          animate={{ boxShadow: theme.focalGlow }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}

      {isSelected ? (
        <span
          className="pointer-events-none absolute bottom-2 right-2 z-[20] flex h-5 w-5 items-center justify-center rounded-full bg-teal-400 text-[#020202] shadow-[0_0_16px_rgba(45,212,191,0.55)]"
          aria-hidden
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      ) : null}
    </div>
  );
}

type Props = {
  item: MontageMediaItem;
  actId: MontageActId;
  variant?: "act" | "unassigned";
  index: number;
  isSelected: boolean;
  isDuplicate?: boolean;
  isGroupDragging: boolean;
  isExcluded: boolean;
  hasFocalPoint: boolean;
  copy: MontageMediaCardCopy;
  onCardClick: (assetId: string, event: React.MouseEvent) => void;
  onRemove?: (assetId: string) => void;
};

export function MontageMediaCard({
  item,
  actId,
  variant = "act",
  index,
  isSelected,
  isDuplicate = false,
  isGroupDragging,
  isExcluded,
  hasFocalPoint,
  copy,
  onCardClick,
  onRemove,
}: Props) {
  const theme = getMontageActTheme(actId);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.assetId,
    data: {
      type: MONTAGE_CARD_DND_TYPE,
      actId,
      variant,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const isGhost = isDragging || isGroupDragging;

  return (
    <div
      ref={setNodeRef}
      data-sortable-id={item.assetId}
      style={style}
      className={`relative w-full rounded-xl transition-[box-shadow,transform] duration-200 ${
        isSelected
          ? "ring-2 ring-teal-400 shadow-[0_0_24px_rgba(45,212,191,0.28)]"
          : ""
      }`}
    >
      <motion.div
        variants={montageCardVariants}
        initial="hidden"
        animate="visible"
        whileHover={
          isGhost
            ? undefined
            : {
                scale: 1.03,
                boxShadow: theme.cardHoverShadow,
              }
        }
        whileTap={isGhost ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <MontageMediaCardSurface
          item={item}
          actId={actId}
          variant={variant}
          index={index}
          isSelected={isSelected}
          isDuplicate={isDuplicate}
          isExcluded={isExcluded}
          hasFocalPoint={hasFocalPoint}
          copy={copy}
          isGhost={isGhost}
          showRemove={Boolean(onRemove)}
          onCardClick={onCardClick}
          onRemove={onRemove}
          dragHandleProps={{ attributes, listeners }}
        />
      </motion.div>
    </div>
  );
}

type OverlayProps = {
  item: MontageMediaItem;
  actId: MontageActId;
  index: number;
  isExcluded: boolean;
  hasFocalPoint: boolean;
  copy: MontageMediaCardCopy;
};

export function MontageMediaCardDragOverlay({
  item,
  actId,
  index,
  isExcluded,
  hasFocalPoint,
  copy,
}: OverlayProps) {
  return (
    <MontageMediaCardSurface
      item={item}
      actId={actId}
      index={index}
      isSelected={false}
      isExcluded={isExcluded}
      hasFocalPoint={hasFocalPoint}
      copy={copy}
      isOverlay
      showDragHandle={false}
    />
  );
}

type MultiOverlayProps = {
  count: number;
  label: string;
  items: MontageMediaItem[];
  actId: MontageActId;
  copy: MontageMediaCardCopy;
};

export function MontageMultiDragOverlay({
  count,
  label,
  items,
  actId,
  copy,
}: MultiOverlayProps) {
  const stack = items.slice(0, 3);

  return (
    <div className="relative w-[min(100%,11rem)] pb-9 sm:w-44">
      {stack.map((item, stackIndex) => (
        <div
          key={item.assetId}
          className="absolute left-0 top-0 w-full"
          style={{
            transform: `rotate(${(stackIndex - 1) * 5}deg) translate(${stackIndex * 5}px, ${stackIndex * -6}px) scale(${1 - stackIndex * 0.03})`,
            zIndex: stackIndex,
          }}
        >
          <MontageMediaCardSurface
            item={item}
            actId={actId}
            index={stackIndex}
            isSelected={false}
            isExcluded={false}
            hasFocalPoint={false}
            copy={copy}
            isOverlay
            showDragHandle={false}
          />
        </div>
      ))}
      <div className="aspect-video w-full opacity-0" aria-hidden />
      <div className="absolute -bottom-1 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border border-teal-400/25 bg-[#0a0a0a]/95 px-3 py-1 text-[11px] font-medium text-teal-300 shadow-lg backdrop-blur-md">
        {label.replace("{count}", String(count))}
      </div>
    </div>
  );
}
