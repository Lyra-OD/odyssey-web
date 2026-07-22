"use client";

import { Smartphone } from "lucide-react";

import {
  sanctuaryCardSurface,
  sanctuarySelectedSurface,
} from "@/src/lib/contribute/sanctuaryChrome";

export type ScannerCompanionPlaceholderCopy = {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  hint: string;
};

type Props = {
  copy: ScannerCompanionPlaceholderCopy;
  className?: string;
};

/**
 * Slot Scanner Compagnon — placeholder honête (pas de fausse session live).
 * Canon : docs/SCANNER_COMPANION.md · Wizard Sanctuaire étape Coffre.
 */
export function ScannerCompanionPlaceholder({
  copy,
  className = "",
}: Props) {
  return (
    <aside
      className={`relative overflow-hidden px-5 py-6 md:px-7 md:py-7 ${sanctuaryCardSurface} ${sanctuarySelectedSurface} ${className}`}
      aria-label={copy.title}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 12% 20%, rgba(45,212,191,0.12) 0%, transparent 55%)",
        }}
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
        <div
          className="mx-auto flex h-[7.25rem] w-[7.25rem] shrink-0 flex-col items-center justify-center rounded-sm border border-dashed border-teal-400/35 bg-[#020202]/60 sm:mx-0"
          aria-hidden
        >
          <Smartphone
            className="h-7 w-7 text-teal-300/80"
            strokeWidth={1.25}
          />
          <span className="mt-2 text-[9px] font-medium uppercase tracking-[0.32em] text-teal-400/75">
            {copy.badge}
          </span>
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-teal-400/75">
            {copy.eyebrow}
          </p>
          <h3 className="mt-2 font-editorial text-xl font-medium tracking-tight text-zinc-50 md:text-2xl">
            {copy.title}
          </h3>
          <p className="mt-3 text-sm font-light leading-relaxed text-white/50 md:text-[0.95rem]">
            {copy.description}
          </p>
          <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">
            {copy.hint}
          </p>
        </div>
      </div>
    </aside>
  );
}
