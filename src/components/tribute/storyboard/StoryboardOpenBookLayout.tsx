"use client";

import type { ReactNode } from "react";

import { MediaBankColumn } from "@/src/components/tribute/storyboard/MediaBankColumn";
import type { MediaBankColumnCopy } from "@/src/components/tribute/storyboard/MediaBankColumn";
import type { MontageMediaCardCopy } from "@/src/components/tribute/montage/MontageMediaCard";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";

type Props = {
  bankItems: readonly MontageMediaItem[];
  selectedMediaIds: readonly string[];
  activeDragIds: readonly string[];
  isBankDropHighlighted: boolean;
  bankCopy: MediaBankColumnCopy;
  cardCopy: MontageMediaCardCopy;
  resolveBankDragMediaIds: (assetId: string) => readonly string[];
  onBankMediaClick: (assetId: string) => void;
  onToggleMediaSelect: (assetId: string) => void;
  onShiftMediaSelect: (assetId: string) => void;
  onSelectAllBank: () => void;
  onDeselectAllBank: () => void;
  filmMap: ReactNode;
  children: ReactNode;
};

/**
 * Layout « Livre Ouvert » — banque persistante + chapitres empilés.
 * Desktop : grille 280px | 1fr. Mobile : stack vertical (banque au-dessus).
 */
export function StoryboardOpenBookLayout({
  bankItems,
  selectedMediaIds,
  activeDragIds,
  isBankDropHighlighted,
  bankCopy,
  cardCopy,
  resolveBankDragMediaIds,
  onBankMediaClick,
  onToggleMediaSelect,
  onShiftMediaSelect,
  onSelectAllBank,
  onDeselectAllBank,
  filmMap,
  children,
}: Props) {
  return (
    <div className="space-y-6">
      {filmMap}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
        <MediaBankColumn
          items={bankItems}
          selectedMediaIds={selectedMediaIds}
          activeDragIds={activeDragIds}
          isDropHighlighted={isBankDropHighlighted}
          copy={bankCopy}
          cardCopy={cardCopy}
          resolveBankDragMediaIds={resolveBankDragMediaIds}
          onMediaClick={onBankMediaClick}
          onToggleMediaSelect={onToggleMediaSelect}
          onShiftMediaSelect={onShiftMediaSelect}
          onSelectAll={onSelectAllBank}
          onDeselectAll={onDeselectAllBank}
        />

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
