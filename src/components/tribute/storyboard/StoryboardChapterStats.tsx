"use client";

import { Image as ImageIcon, Music2 } from "lucide-react";

export type StoryboardChapterStatsCopy = {
  mediaLabel: string;
  /** Doit contenir `{count}` et `{max}`. */
  mediaValue: string;
  songsLabel: string;
  /** Doit contenir `{min}` et `{max}`. */
  songsValue: string;
};

type Props = {
  mediaCount: number;
  maxMediaItems: number;
  minSongsRequired: number;
  maxSongs: number;
  copy: StoryboardChapterStatsCopy;
};

/**
 * Rappel factuel des limites du forfait courant, strictement local à
 * l'Étape 4 — le sélecteur de forfait interactif vit désormais dans l'en-tête
 * global du wizard (accessible depuis n'importe quelle étape).
 */
export function StoryboardChapterStats({
  mediaCount,
  maxMediaItems,
  minSongsRequired,
  maxSongs,
  copy,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="group" aria-label={copy.mediaLabel}>
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <ImageIcon className="h-4 w-4 shrink-0 text-teal-300/80" strokeWidth={1.5} aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            {copy.mediaLabel}
          </p>
          <p className="truncate text-sm font-medium text-zinc-100">
            {copy.mediaValue
              .replace("{count}", String(mediaCount))
              .replace("{max}", String(maxMediaItems))}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <Music2 className="h-4 w-4 shrink-0 text-teal-300/80" strokeWidth={1.5} aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            {copy.songsLabel}
          </p>
          <p className="truncate text-sm font-medium text-zinc-100">
            {copy.songsValue
              .replace("{min}", String(minSongsRequired))
              .replace("{max}", String(maxSongs))}
          </p>
        </div>
      </div>
    </div>
  );
}
