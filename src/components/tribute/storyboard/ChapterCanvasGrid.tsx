"use client";

import type { MontageMediaCardCopy } from "@/src/components/tribute/montage/MontageMediaCard";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import type { MontageFocalPoint } from "@/src/lib/wizard/wizardState";

import { CanvasGhostSlot } from "@/src/components/tribute/storyboard/CanvasGhostSlot";
import { MediaInstantTile } from "@/src/components/tribute/storyboard/MediaInstantTile";

export type ChapterCanvasGridCopy = {
  emptyHint: string;
};

type Props = {
  items: readonly MontageMediaItem[];
  chapterIndex: number;
  /** Capacité recommandée — `null` si durée chanson inconnue. */
  recommendedCapacity: number | null;
  excludedIds: readonly string[];
  focalPoints: Readonly<Record<string, MontageFocalPoint>>;
  copy: ChapterCanvasGridCopy;
  cardCopy: MontageMediaCardCopy;
  onMediaClick: (assetId: string) => void;
};

const MAX_VISIBLE_GHOSTS = 6;

export function ChapterCanvasGrid({
  items,
  chapterIndex,
  recommendedCapacity,
  excludedIds,
  focalPoints,
  copy,
  cardCopy,
  onMediaClick,
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

  return (
    <div className="relative">
      {isEmpty ? (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 z-[1] -translate-y-1/2 text-center text-sm font-light text-zinc-600">
          {copy.emptyHint}
        </p>
      ) : null}

      <div
        className="grid grid-cols-3 gap-3 lg:grid-cols-6"
        role="list"
        aria-label={`Médias du chapitre — ${assignedCount} placé(s)`}
      >
        {items.map((item, index) => (
          <div key={item.assetId} role="listitem">
            <MediaInstantTile
              item={item}
              chapterIndex={chapterIndex}
              sequenceIndex={index}
              variant="chapter"
              isExcluded={excludedIds.includes(item.assetId)}
              hasFocalPoint={Boolean(focalPoints[item.assetId])}
              copy={cardCopy}
              onClick={onMediaClick}
            />
          </div>
        ))}

        {Array.from({ length: ghostCount }, (_, index) => (
          <CanvasGhostSlot key={`ghost-${index}`} />
        ))}
      </div>
    </div>
  );
}
