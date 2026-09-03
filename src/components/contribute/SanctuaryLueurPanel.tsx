"use client";

import { SanctuaryLueurOrb } from "@/src/components/contribute/SanctuaryLueurOrb";
import type { AppDictionary } from "@/lib/dictionaries";

export type SanctuaryLueurPanelProps = {
  copy: AppDictionary["sanctuary"]["lueurPanel"];
};

/** Slot carte empreinte Lueur — présence vivante, pas de capture. */
export function SanctuaryLueurPanel({ copy: t }: SanctuaryLueurPanelProps) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <SanctuaryLueurOrb
        variant="single"
        size="card"
        aria-label={t.aria}
        className="w-full"
      />
      <p className="text-center text-[11px] font-light tracking-wide text-teal-200/55">
        {t.whisper}
      </p>
    </div>
  );
}
