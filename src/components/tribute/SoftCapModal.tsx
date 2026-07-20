"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export type SoftCapVariant = "mediaUnlock" | "mediaMagic" | "musicDual";

export type SoftCapModalCopy = {
  mediaUnlockTitle: string;
  mediaUnlockBody: string;
  mediaMagicTitle: string;
  mediaMagicBody: string;
  musicTitle: string;
  musicBody: string;
  ctaHeritage: string;
  ctaLicense: string;
  ctaContinue: string;
  ctaDismiss: string;
  priceHeritage: string;
  priceLicense: string;
};

type SoftCapModalProps = {
  open: boolean;
  variant: SoftCapVariant;
  mediaCount?: number;
  copy: SoftCapModalCopy;
  onAcceptHeritage: () => void;
  onAcceptLicense?: () => void;
  onDismiss: () => void;
};

/** Pont léger : sync le volume médias étape 3 → Soft Cap filet. */
export function SoftCapMediaCountSync({
  count,
  onCount,
}: {
  count: number;
  onCount: (count: number) => void;
}) {
  useEffect(() => {
    onCount(count);
  }, [count, onCount]);
  return null;
}

/**
 * Soft Cap Quiet Luxury — pas de paywall brutal.
 * mediaUnlock : filet à 50 · mediaMagic : post Composition Magique · musicDual : Licence vs Héritage
 */
export function SoftCapModal({
  open,
  variant,
  mediaCount = 0,
  copy,
  onAcceptHeritage,
  onAcceptLicense,
  onDismiss,
}: SoftCapModalProps) {
  if (!open) return null;

  const title =
    variant === "mediaUnlock"
      ? copy.mediaUnlockTitle
      : variant === "mediaMagic"
        ? copy.mediaMagicTitle.replace("{count}", String(mediaCount))
        : copy.musicTitle;

  const body =
    variant === "mediaUnlock"
      ? copy.mediaUnlockBody
      : variant === "mediaMagic"
        ? copy.mediaMagicBody.replace("{count}", String(mediaCount))
        : copy.musicBody;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="soft-cap-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/12 bg-[#121018] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
          aria-label={copy.ctaDismiss}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="space-y-5 px-6 pb-6 pt-8">
          <div className="space-y-2 pr-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-200/70">
              Odyssey
            </p>
            <h2
              id="soft-cap-title"
              className="font-serif text-2xl leading-snug text-white"
            >
              {title}
            </h2>
            <p className="text-sm leading-relaxed text-white/65">{body}</p>
          </div>

          <div className="flex flex-col gap-2.5">
            {variant === "musicDual" ? (
              <>
                <button
                  type="button"
                  onClick={onAcceptLicense}
                  className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-left transition hover:border-amber-200/35 hover:bg-amber-200/[0.06]"
                >
                  <span className="block text-sm font-medium text-white">
                    {copy.ctaLicense}
                  </span>
                  <span className="mt-0.5 block text-xs text-white/50">
                    {copy.priceLicense}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onAcceptHeritage}
                  className="rounded-xl bg-gradient-to-r from-amber-200/90 to-amber-100/80 px-4 py-3 text-left text-[#1a1410] transition hover:brightness-105"
                >
                  <span className="block text-sm font-semibold">
                    {copy.ctaHeritage}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#1a1410]/70">
                    {copy.priceHeritage}
                  </span>
                </button>
              </>
            ) : variant === "mediaMagic" ? (
              <>
                <button
                  type="button"
                  onClick={onAcceptHeritage}
                  className="rounded-xl bg-gradient-to-r from-amber-200/90 to-amber-100/80 px-4 py-3 text-center text-sm font-semibold text-[#1a1410] transition hover:brightness-105"
                >
                  {copy.ctaContinue}
                </button>
                <p className="text-center text-[11px] text-white/40">
                  {copy.priceHeritage}
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onAcceptHeritage}
                  className="rounded-xl bg-gradient-to-r from-amber-200/90 to-amber-100/80 px-4 py-3 text-left transition hover:brightness-105"
                >
                  <span className="block text-sm font-semibold text-[#1a1410]">
                    {copy.ctaHeritage}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#1a1410]/70">
                    {copy.priceHeritage}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-xl px-4 py-2.5 text-center text-sm text-white/55 transition hover:text-white/80"
                >
                  {copy.ctaDismiss}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
