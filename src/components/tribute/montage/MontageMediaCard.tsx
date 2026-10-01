"use client";

import type { DraggableAttributes } from "@dnd-kit/core";
import type { CSSProperties } from "react";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical, Check, Trash2 } from "lucide-react";

import { MediaAssetThumb } from "@/src/components/media/MediaAssetThumb";
import { useFinePointer } from "@/src/hooks/useFinePointer";
import {
  getChapterCardTheme,
  getUnassignedCardTheme,
  type ChapterCardTheme,
} from "@/src/lib/wizard/chapterTheme";
import { EASE_OUT_LUXE } from "@/src/lib/motion/easing";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";

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
  theme: ChapterCardTheme;
  variant?: "chapter" | "unassigned";
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
  selectable?: boolean;
  onToggleSelect?: (event: React.MouseEvent) => void;
  toggleSelectAria?: string;
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
  };
  /** Desktop : PointerSensor sur le bouton aperçu (évite le conflit parent/bouton). */
  wholeCardDrag?: {
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
      ease: EASE_OUT_LUXE,
    },
  },
};

function formatSequenceIndex(index: number) {
  return String(index + 1).padStart(2, "0");
}

function MontageMediaCardSurface({
  item,
  theme,
  variant = "chapter",
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
  selectable = false,
  onToggleSelect,
  toggleSelectAria = "",
  dragHandleProps,
  wholeCardDrag,
  onCardClick,
  onRemove,
}: SurfaceProps) {
  const sequence = formatSequenceIndex(index);
  const handleListeners = dragHandleProps?.listeners;
  const {
    onPointerDown: dndPointerDown,
    ...restHandleListeners
  } = handleListeners ?? {};
  // dnd-kit pose déjà role/tabIndex/aria-pressed — ne pas les dupliquer (TS2783 / build).
  const {
    role: _dragRole,
    tabIndex: _dragTabIndex,
    ["aria-pressed"]: _dragAriaPressed,
    ...safeWholeCardAttributes
  } = wholeCardDrag?.attributes ?? {};

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
        <div
          role="button"
          tabIndex={0}
          className={`absolute inset-0 z-[1] block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020202] ${theme.focusRing} ${
            wholeCardDrag
              ? "cursor-grab touch-none active:cursor-grabbing"
              : "cursor-pointer"
          }`}
          aria-label={`${copy.clickToEdit} · ${item.displayName}`}
          aria-pressed={isSelected}
          {...safeWholeCardAttributes}
          {...(wholeCardDrag?.listeners ?? {})}
          onClick={(event) => {
            if (event.defaultPrevented) return;
            onCardClick(item.assetId, event);
          }}
          onKeyDown={(event) => {
            if (wholeCardDrag) return;
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onCardClick(item.assetId, event as unknown as React.MouseEvent);
          }}
        >
          <MediaAssetThumb
            isVideo={item.isVideo}
            src={item.previewUrl}
            fallbackSrc={item.fullPreviewUrl}
          />
        </div>
      ) : (
        <MediaAssetThumb
          isVideo={item.isVideo}
          src={item.previewUrl}
          fallbackSrc={item.fullPreviewUrl}
        />
      )}

      {variant === "chapter" ? (
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

      {selectable && onToggleSelect && !isOverlay ? (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelect(event);
          }}
          aria-pressed={isSelected}
          aria-label={toggleSelectAria}
          className={`absolute right-2 top-2 z-[20] flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-200 ${
            isSelected
              ? "border-teal-400/60 bg-teal-400 text-[#020202] opacity-100"
              : "border-white/20 bg-black/50 text-transparent opacity-0 group-hover/card:opacity-100"
          }`}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        </button>
      ) : null}

      {showDragHandle && dragHandleProps ? (
        <button
          type="button"
          className={`absolute right-2 top-2 z-[20] flex h-10 w-10 cursor-grab touch-none items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/80 opacity-100 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md transition-all duration-200 hover:border-white/25 hover:bg-black/70 hover:text-white active:cursor-grabbing sm:h-8 sm:w-8 sm:opacity-70 ${theme.badgeText} sm:group-hover/card:opacity-100`}
          aria-label={copy.dragHandle}
          {...dragHandleProps.attributes}
          {...restHandleListeners}
          onPointerDown={(event) => {
            dndPointerDown?.(event);
            event.stopPropagation();
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <GripVertical className="h-[18px] w-[18px] sm:h-4 sm:w-4" strokeWidth={2} aria-hidden />
        </button>
      ) : null}

      {showRemove && onRemove ? (
        <button
          type="button"
          className="absolute bottom-2 left-2 z-[20] flex h-7 w-7 items-center justify-center rounded-full border border-red-500/15 bg-black/45 text-red-400/70 opacity-0 backdrop-blur-md transition-all duration-200 hover:border-red-500/30 hover:text-red-400/90 group-hover/card:opacity-100"
          aria-label={isDuplicate ? copy.deleteDuplicate : copy.remove}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onRemove(item.assetId);
          }}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
        </button>
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-[#020202]/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />

      {hasFocalPoint && variant === "chapter" ? (
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
  /** Index du chapitre dans `storyboard.chapters` (palette de couleurs). */
  chapterIndex: number;
  variant?: "chapter" | "unassigned";
  index: number;
  isSelected: boolean;
  isDuplicate?: boolean;
  isGroupDragging: boolean;
  isExcluded: boolean;
  hasFocalPoint: boolean;
  copy: MontageMediaCardCopy;
  onCardClick: (assetId: string, event: React.MouseEvent) => void;
  onRemove?: (assetId: string) => void;
  /** Données dnd-kit additionnelles (Étape 5 storyboard). */
  sortableData?: Record<string, unknown>;
  selectable?: boolean;
  onToggleSelect?: (event: React.MouseEvent) => void;
  toggleSelectAria?: string;
  /** Entrée cascade CSS pendant la Composition Magique. */
  magicEntrance?: boolean;
  magicStaggerIndex?: number;
  /** Teinte de l'overlay drag (connexion visuelle au chapitre cible). */
  accentChapterIndex?: number;
};

export function MontageMediaCard({
  item,
  chapterIndex,
  variant = "chapter",
  index,
  isSelected,
  isDuplicate = false,
  isGroupDragging,
  isExcluded,
  hasFocalPoint,
  copy,
  onCardClick,
  onRemove,
  sortableData,
  selectable = false,
  onToggleSelect,
  toggleSelectAria,
  magicEntrance = false,
  magicStaggerIndex = 0,
}: Props) {
  const theme =
    variant === "unassigned"
      ? getUnassignedCardTheme()
      : getChapterCardTheme(chapterIndex);
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
      chapterIndex,
      variant,
      ...sortableData,
    },
  });

  const style = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  };
  const isGhost = isDragging || isGroupDragging;
  const finePointer = useFinePointer();
  const dragFromWholeCard = finePointer;

  const handleDragProps = dragFromWholeCard
    ? undefined
    : { attributes, listeners };
  const wholeCardDrag = dragFromWholeCard
    ? { attributes, listeners }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      data-sortable-id={item.assetId}
      style={style}
      className={`relative w-full rounded-xl transition-[box-shadow,transform] duration-200 ${
        isSelected
          ? selectable
            ? "ring-2 ring-teal-400/70 shadow-[0_0_20px_rgba(45,212,191,0.14)]"
            : "ring-2 ring-teal-400 shadow-[0_0_24px_rgba(45,212,191,0.28)]"
          : ""
      }`}
    >
      {magicEntrance ? (
        <div
          className="magic-media-enter"
          style={
            {
              "--magic-stagger-index": magicStaggerIndex,
            } as CSSProperties
          }
          onAnimationEnd={(event) => {
            if (event.animationName !== "magic-media-enter") return;
            event.currentTarget.classList.add("magic-media-enter-done");
          }}
        >
          <MontageMediaCardSurface
            item={item}
            theme={theme}
            variant={variant}
            index={index}
            isSelected={isSelected}
            isDuplicate={isDuplicate}
            isExcluded={isExcluded}
            hasFocalPoint={hasFocalPoint}
            copy={copy}
            isGhost={isGhost}
            showRemove={Boolean(onRemove)}
            selectable={selectable}
            onToggleSelect={onToggleSelect}
            toggleSelectAria={toggleSelectAria}
            onCardClick={onCardClick}
            onRemove={onRemove}
            showDragHandle={!dragFromWholeCard}
            dragHandleProps={handleDragProps}
            wholeCardDrag={wholeCardDrag}
          />
        </div>
      ) : (
      <motion.div
        layout={!dragFromWholeCard}
        variants={montageCardVariants}
        initial="hidden"
        animate="visible"
        whileHover={
          isGhost || dragFromWholeCard
            ? undefined
            : {
                scale: 1.03,
                boxShadow: theme.cardHoverShadow,
              }
        }
        whileTap={
          isGhost || dragFromWholeCard ? undefined : { scale: 0.98 }
        }
        transition={{ duration: 0.3, ease: EASE_OUT_LUXE }}
      >
        <MontageMediaCardSurface
          item={item}
          theme={theme}
          variant={variant}
          index={index}
          isSelected={isSelected}
          isDuplicate={isDuplicate}
          isExcluded={isExcluded}
          hasFocalPoint={hasFocalPoint}
          copy={copy}
          isGhost={isGhost}
          showRemove={Boolean(onRemove)}
          selectable={selectable}
          onToggleSelect={onToggleSelect}
          toggleSelectAria={toggleSelectAria}
          onCardClick={onCardClick}
          onRemove={onRemove}
          showDragHandle={!dragFromWholeCard}
          dragHandleProps={handleDragProps}
          wholeCardDrag={wholeCardDrag}
        />
      </motion.div>
      )}
    </div>
  );
}

type OverlayProps = {
  item: MontageMediaItem;
  chapterIndex: number;
  index: number;
  isExcluded: boolean;
  hasFocalPoint: boolean;
  copy: MontageMediaCardCopy;
  /** Teinte de l'overlay selon le chapitre survolé pendant le drag. */
  accentChapterIndex?: number;
  /** Lévitation timeline — scale + rotation légère. */
  elevated?: boolean;
};

export function MontageMediaCardDragOverlay({
  item,
  chapterIndex,
  index,
  isExcluded,
  hasFocalPoint,
  copy,
  accentChapterIndex,
  elevated = false,
}: OverlayProps) {
  const theme = getChapterCardTheme(accentChapterIndex ?? chapterIndex);
  return (
    <div
      className={
        elevated
          ? "w-52 rotate-[3deg] scale-110 sm:w-64 sm:scale-125"
          : "w-full"
      }
      style={
        elevated
          ? {
              filter: "drop-shadow(0 32px 64px rgba(0,0,0,0.65))",
              boxShadow: theme.overlayShadow,
            }
          : { boxShadow: theme.cardHoverShadow }
      }
    >
      <MontageMediaCardSurface
        item={item}
        theme={theme}
        index={index}
        isSelected={false}
        isExcluded={isExcluded}
        hasFocalPoint={hasFocalPoint}
        copy={copy}
        isOverlay
        showDragHandle={false}
      />
    </div>
  );
}

type MultiOverlayProps = {
  count: number;
  label: string;
  items: MontageMediaItem[];
  chapterIndex: number;
  copy: MontageMediaCardCopy;
  accentChapterIndex?: number;
};

export function MontageMultiDragOverlay({
  count,
  label,
  items,
  chapterIndex,
  copy,
  accentChapterIndex,
}: MultiOverlayProps) {
  const stack = items.slice(0, 3);
  const theme = getChapterCardTheme(accentChapterIndex ?? chapterIndex);

  return (
    <div
      className="relative w-[min(100%,16rem)] pb-9 sm:w-64"
      style={{ filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.55))" }}
    >
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
            theme={getChapterCardTheme(chapterIndex)}
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
      <div className="absolute -bottom-1 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border bg-[#0a0a0a]/95 px-3 py-1 text-[11px] font-medium shadow-lg backdrop-blur-md"
        style={{
          borderColor: "rgba(251, 191, 36, 0.25)",
          color: theme.badgeText.includes("amber")
            ? "rgb(251, 191, 36)"
            : undefined,
        }}
      >
        {label.replace("{count}", String(count))}
      </div>
    </div>
  );
}
