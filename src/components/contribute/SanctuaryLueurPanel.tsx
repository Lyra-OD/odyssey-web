"use client";

import { SanctuaryLueurOrb } from "@/src/components/contribute/SanctuaryLueurOrb";

export type SanctuaryLueurPanelProps = {
  locale: "fr" | "en";
};

const copy = {
  fr: {
    aria: "Lueur du Sanctuaire",
    whisper: "Elle rejoint ceux qui restent.",
  },
  en: {
    aria: "Sanctuary glow",
    whisper: "It joins those who remain.",
  },
} as const;

/** Slot carte empreinte Lueur — présence vivante, pas de capture. */
export function SanctuaryLueurPanel({ locale }: SanctuaryLueurPanelProps) {
  const t = copy[locale];
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <SanctuaryLueurOrb size="card" aria-label={t.aria} />
      <p className="text-center text-[11px] font-light tracking-wide text-teal-200/55">
        {t.whisper}
      </p>
    </div>
  );
}
