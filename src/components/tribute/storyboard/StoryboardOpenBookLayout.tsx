"use client";

import type { ReactNode } from "react";

import { MediaBankColumn } from "@/src/components/tribute/storyboard/MediaBankColumn";
import type { MediaBankColumnCopy } from "@/src/components/tribute/storyboard/MediaBankColumn";
import type { MontageMediaCardCopy } from "@/src/components/tribute/montage/MontageMediaCard";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";

type Props = {
  bankItems: readonly MontageMediaItem[];
  bankCopy: MediaBankColumnCopy;
  cardCopy: MontageMediaCardCopy;
  onBankMediaClick: (assetId: string) => void;
  filmMap: ReactNode;
  children: ReactNode;
};

/**
 * Layout « Livre Ouvert » — banque persistante + chapitres empilés.
 * Desktop : grille 280px | 1fr. Mobile : stack vertical (banque au-dessus).
 */
export function StoryboardOpenBookLayout({
  bankItems,
  bankCopy,
  cardCopy,
  onBankMediaClick,
  filmMap,
  children,
}: Props) {
  return (
    <div className="space-y-6">
      {filmMap}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
        <MediaBankColumn
          items={bankItems}
          copy={bankCopy}
          cardCopy={cardCopy}
          onMediaClick={onBankMediaClick}
        />

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
