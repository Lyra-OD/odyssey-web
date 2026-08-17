"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

import { BeforeAfterSlider } from "@/src/components/tribute/BeforeAfterSlider";
import {
  sanctuaryGhostButton,
  sanctuarySubmitButton,
} from "@/src/lib/contribute/sanctuaryChrome";

export type RestorationPreviewCopy = {
  title: string;
  hint: string;
  lockedHint: string;
  included: string;
  addCta: string;
  addedCta: string;
  upgradeEternity: string;
  beforeLabel: string;
  afterLabel: string;
  closeAria: string;
  watermark: string;
};

type Props = {
  open: boolean;
  src: string | null;
  copy: RestorationPreviewCopy;
  canFullPreview: boolean;
  alreadyAdded: boolean;
  showUpgrade: boolean;
  allowPurchase: boolean;
  addPriceLabel: string;
  onClose: () => void;
  onAddRetouch: () => void;
  onUpgradeEternity: () => void;
};

export function RestorationPreviewModal({
  open,
  src,
  copy,
  canFullPreview,
  alreadyAdded,
  showUpgrade,
  allowPurchase,
  addPriceLabel,
  onClose,
  onAddRetouch,
  onUpgradeEternity,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="restoration-preview-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-[0_0_48px_rgba(45,212,191,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/50 text-zinc-200"
          aria-label={copy.closeAria}
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <div className="px-5 pb-2 pt-6 md:px-6">
          <h2
            id="restoration-preview-title"
            className="font-editorial text-xl font-medium tracking-tight text-zinc-50"
          >
            {copy.title}
          </h2>
          <p className="mt-2 text-sm font-light leading-relaxed text-white/50">
            {canFullPreview ? copy.hint : copy.lockedHint}
          </p>
        </div>

        <div className="px-5 pb-4 md:px-6">
          <BeforeAfterSlider
            src={src}
            beforeLabel={copy.beforeLabel}
            afterLabel={copy.afterLabel}
            canFullPreview={canFullPreview}
            watermark={copy.watermark}
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-white/8 bg-black/30 px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center md:px-6">
          {canFullPreview ? (
            <p className="text-sm font-light text-teal-200/85">{copy.included}</p>
          ) : allowPurchase ? (
            <>
              <button
                type="button"
                onClick={onAddRetouch}
                className={sanctuarySubmitButton}
              >
                {alreadyAdded
                  ? copy.addedCta
                  : copy.addCta.replace("{price}", addPriceLabel)}
              </button>
              {showUpgrade ? (
                <button
                  type="button"
                  onClick={onUpgradeEternity}
                  className={sanctuaryGhostButton}
                >
                  {copy.upgradeEternity}
                </button>
              ) : null}
            </>
          ) : (
            <p className="text-sm font-light text-white/45">{copy.lockedHint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
