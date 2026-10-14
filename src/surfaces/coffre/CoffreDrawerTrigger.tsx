"use client";

import { Archive } from "lucide-react";

type CoffreDrawerTriggerProps = {
  onOpen: () => void;
  copy: { label: string; cta: string; openAria: string };
  className?: string;
};

/** Déclencheur typographique du tiroir Coffre — même grammaire que Dossier / Co-Créateur. */
export function CoffreDrawerTrigger({
  onOpen,
  copy,
  className = "",
}: CoffreDrawerTriggerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={copy.openAria}
      className={`group inline-flex min-w-0 flex-col items-start gap-0.5 text-left ${className}`}
    >
      <span className="max-w-full truncate text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-400">
        {copy.label}
      </span>
      <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 font-editorial text-sm font-medium text-zinc-100 md:text-base">
        <span className="truncate border-b border-transparent pb-0.5 transition-colors duration-200 group-hover:border-teal-400/40">
          {copy.cta}
        </span>
        <Archive
          className="h-3.5 w-3.5 text-zinc-400 transition-colors duration-200 group-hover:text-teal-300"
          strokeWidth={1.5}
          aria-hidden
        />
      </span>
    </button>
  );
}
