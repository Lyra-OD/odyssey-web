"use client";

import { Layers } from "lucide-react";

export type MediaBankTriggerCopy = {
  label: string;
  /** Doit contenir `{count}`. */
  value: string;
  openAria: string;
};

type Props = {
  count: number;
  onOpen: () => void;
  copy: MediaBankTriggerCopy;
  className?: string;
};

/**
 * Déclencheur de la banque de médias — volontairement distinct du Dossier :
 * icône empilée (Layers), accent ambre, compteur explicite.
 */
export function MediaBankTrigger({ count, onOpen, copy, className = "" }: Props) {
  const valueLabel = copy.value.replace("{count}", String(count));

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={copy.openAria.replace("{count}", String(count))}
      className={`group inline-flex flex-col items-start gap-0.5 text-left ${className}`}
    >
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-amber-500/80">
        <Layers className="h-3 w-3" strokeWidth={1.5} aria-hidden />
        {copy.label}
      </span>
      <span className="inline-flex items-center gap-1.5 font-editorial text-base font-medium text-zinc-100">
        <span className="border-b border-transparent pb-0.5 transition-colors duration-200 group-hover:border-amber-400/30">
          {valueLabel}
        </span>
        <span
          className="text-xs text-amber-400/70 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden
        >
          ↗
        </span>
      </span>
    </button>
  );
}
