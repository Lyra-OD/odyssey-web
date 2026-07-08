"use client";

import { Film, Image as ImageIcon } from "lucide-react";

import { StoragePreviewImage } from "@/src/components/media/StoragePreviewImage";
import {
  getChapterCardTheme,
  getUnassignedCardTheme,
} from "@/src/lib/wizard/chapterTheme";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import type { MontageMediaCardCopy } from "@/src/components/tribute/montage/MontageMediaCard";

type Props = {
  item: MontageMediaItem;
  /** Index du chapitre — omis pour la banque non assignée. */
  chapterIndex?: number;
  /** Position dans la séquence du chapitre (badge 01, 02…). */
  sequenceIndex?: number;
  variant?: "chapter" | "unassigned";
  isExcluded?: boolean;
  hasFocalPoint?: boolean;
  copy: MontageMediaCardCopy;
  onClick: (assetId: string) => void;
};

function formatSequenceIndex(index: number) {
  return String(index + 1).padStart(2, "0");
}

/**
 * Vignette média read-only — PR-1 Livre Ouvert (sans dnd-kit).
 */
export function MediaInstantTile({
  item,
  chapterIndex = 0,
  sequenceIndex = 0,
  variant = "chapter",
  isExcluded = false,
  hasFocalPoint = false,
  copy,
  onClick,
}: Props) {
  const theme =
    variant === "unassigned"
      ? getUnassignedCardTheme()
      : getChapterCardTheme(chapterIndex);

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
    <button
      type="button"
      onClick={() => onClick(item.assetId)}
      aria-label={`${copy.clickToEdit} — ${item.displayName}`}
      className={`group/tile relative aspect-video w-full overflow-hidden rounded-xl ring-1 ring-white/10 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:ring-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020202] ${theme.focusRing} ${
        isExcluded ? "opacity-40 grayscale" : ""
      }`}
      style={{
        boxShadow: "none",
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.boxShadow = theme.cardHoverShadow;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.boxShadow = "none";
      }}
    >
      {preview}

      {variant === "chapter" ? (
        <span
          className={`pointer-events-none absolute left-2 top-2 z-[2] rounded-md px-2 py-1 font-mono text-xs font-semibold tabular-nums tracking-wider ${theme.badgeBg} ${theme.badgeText}`}
          aria-hidden
        >
          {formatSequenceIndex(sequenceIndex)}
        </span>
      ) : null}

      {hasFocalPoint && variant === "chapter" ? (
        <span
          className={`pointer-events-none absolute bottom-2 right-2 z-[2] h-2 w-2 rounded-full ${theme.focalBg}`}
          aria-hidden
        />
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#020202]/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/tile:opacity-100" />
    </button>
  );
}
