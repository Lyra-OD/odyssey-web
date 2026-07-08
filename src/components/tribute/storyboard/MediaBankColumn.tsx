"use client";

import type { MontageMediaCardCopy } from "@/src/components/tribute/montage/MontageMediaCard";
import { MediaInstantTile } from "@/src/components/tribute/storyboard/MediaInstantTile";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";

export type MediaBankColumnCopy = {
  title: string;
  /** Doit contenir `{count}`. */
  count: string;
  empty: string;
};

type Props = {
  items: readonly MontageMediaItem[];
  copy: MediaBankColumnCopy;
  cardCopy: MontageMediaCardCopy;
  onMediaClick: (assetId: string) => void;
};

export function MediaBankColumn({
  items,
  copy,
  cardCopy,
  onMediaClick,
}: Props) {
  return (
    <aside
      className="flex min-h-0 flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)]"
      aria-label={copy.title}
    >
      <div className="shrink-0 space-y-1 border-b border-white/[0.06] px-4 py-4">
        <h3 className="font-[family-name:var(--font-label)] text-sm font-semibold tracking-wide text-zinc-200">
          {copy.title}
        </h3>
        <p className="text-xs font-light text-zinc-500">
          {items.length > 0
            ? copy.count.replace("{count}", String(items.length))
            : copy.empty}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm font-light text-zinc-600">
            {copy.empty}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <MediaInstantTile
                key={item.assetId}
                item={item}
                variant="unassigned"
                copy={cardCopy}
                onClick={onMediaClick}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
