"use client";

import { Archive } from "lucide-react";

type CoffreDrawerTriggerProps = {
  onOpen: () => void;
  mediaCount: number;
  copy: { label: string; openAria: string };
  className?: string;
};

/**
 * Déclencheur du tiroir Coffre — pilier du projet : pastille teal à gauche de
 * l’en-tête, distincte des déclencheurs typographiques (Dossier / Co-Créateur).
 */
export function CoffreDrawerTrigger({
  onOpen,
  mediaCount,
  copy,
  className = "",
}: CoffreDrawerTriggerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={copy.openAria}
      className={`group inline-flex min-w-0 max-w-full items-center gap-2.5 rounded-full border border-teal-400/30 bg-teal-400/[0.06] py-1.5 pl-2 pr-3.5 shadow-[0_0_24px_rgba(45,212,191,0.08)] transition-colors duration-200 hover:border-teal-300/60 hover:bg-teal-400/[0.1] ${className}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-400/15">
        <Archive
          className="h-3.5 w-3.5 text-teal-200"
          strokeWidth={1.5}
          aria-hidden
        />
      </span>
      <span className="truncate font-editorial text-sm font-medium text-zinc-50 md:text-base">
        {copy.label}
      </span>
      <span className="shrink-0 rounded-full border border-purple-300/50 bg-purple-500/20 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-purple-100 shadow-[0_0_12px_rgba(168,85,247,0.35)]">
        {mediaCount}
      </span>
    </button>
  );
}
