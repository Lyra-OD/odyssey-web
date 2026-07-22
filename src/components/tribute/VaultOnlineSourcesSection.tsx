"use client";

import { Cloud, Image as ImageIcon, Music2, Share2 } from "lucide-react";

import type { SocialId } from "@/src/lib/wizard/wizardState";
import { sanctuaryHoverDashed } from "@/src/lib/contribute/sanctuaryChrome";

export type VaultOnlineSourcesCopy = {
  title: string;
  description: string;
  note: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  googlePhotos: string;
};

type Props = {
  selected: SocialId | null;
  onSelect: (id: SocialId) => void;
  copy: VaultOnlineSourcesCopy;
  className?: string;
};

const ROWS: readonly {
  id: SocialId;
  labelKey: keyof Pick<
    VaultOnlineSourcesCopy,
    "facebook" | "instagram" | "tiktok" | "googlePhotos"
  >;
  Icon: typeof Share2;
}[] = [
  { id: "facebook", labelKey: "facebook", Icon: Share2 },
  { id: "instagram", labelKey: "instagram", Icon: ImageIcon },
  { id: "tiktok", labelKey: "tiktok", Icon: Music2 },
  { id: "google", labelKey: "googlePhotos", Icon: Cloud },
];

/**
 * Sous-section Coffre — sources sociales en secondaire (pas une étape héroïque).
 */
export function VaultOnlineSourcesSection({
  selected,
  onSelect,
  copy,
  className = "",
}: Props) {
  return (
    <section className={`border-t border-white/[0.06] pt-10 ${className}`}>
      <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-teal-400/70">
        {copy.title}
      </p>
      <p className="mt-3 text-sm font-light leading-relaxed text-white/45 md:text-base">
        {copy.description}
      </p>
      <p className="mt-2 text-xs font-light leading-relaxed text-zinc-600">
        {copy.note}
      </p>

      <div className="mt-6 flex flex-col gap-2.5">
        {ROWS.map(({ id, labelKey, Icon }) => {
          const isSelected = selected === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(id)}
              className={`group relative overflow-hidden rounded-sm border px-4 py-3.5 text-left transition-[border,background,box-shadow] md:py-4 ${
                isSelected
                  ? "border-teal-400/40 bg-teal-400/[0.06] shadow-[0_0_24px_rgba(45,212,191,0.12)]"
                  : `border-white/10 bg-white/[0.02] ${sanctuaryHoverDashed}`
              }`}
            >
              <span className="relative flex items-center gap-3.5">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border ${
                    isSelected
                      ? "border-teal-400/30 bg-teal-400/10 text-teal-200"
                      : "border-white/10 bg-black/30 text-zinc-400"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.35} />
                </span>
                <span className="font-label text-sm font-normal tracking-wide text-zinc-100 md:text-base">
                  {copy[labelKey]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
