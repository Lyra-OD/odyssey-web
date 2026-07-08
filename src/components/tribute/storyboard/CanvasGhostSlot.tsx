"use client";

import { Image as ImageIcon } from "lucide-react";

type Props = {
  className?: string;
};

/** Emplacement fantôme — capacité restante sur la grille du chapitre. */
export function CanvasGhostSlot({ className = "" }: Props) {
  return (
    <div
      className={`flex aspect-video w-full items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] ${className}`}
      aria-hidden
    >
      <ImageIcon className="h-5 w-5 text-zinc-700/80" strokeWidth={1.2} />
    </div>
  );
}
