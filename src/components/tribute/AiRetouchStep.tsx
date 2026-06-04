"use client";

import { Check, Sparkles, Wand2 } from "lucide-react";

import { BeforeAfterSlider } from "@/src/components/tribute/BeforeAfterSlider";
import { formatWizardPrice, UPSELL_AI_RETOUCH_CENTS } from "@/src/lib/wizard/wizardPricing";

export type AiRetouchStepCopy = {
  title: string;
  description: string;
  cardTitle: string;
  cardSubtitle: string;
  featureRestore: string;
  featureColor: string;
  featureUpscale: string;
  beforeLabel: string;
  afterLabel: string;
  qualityNote: string;
  selectedBadge: string;
  priceNote: string;
  addCta: string;
  addedCta: string;
};

type Props = {
  copy: AiRetouchStepCopy;
  enabled: boolean;
  locale?: "fr" | "en";
  onToggle: (enabled: boolean) => void;
};

const FEATURES = [
  { key: "restore", icon: Wand2 },
  { key: "color", icon: Sparkles },
  { key: "upscale", icon: Check },
] as const;

export function AiRetouchStep({
  copy,
  enabled,
  locale = "fr",
  onToggle,
}: Props) {
  const price = formatWizardPrice(UPSELL_AI_RETOUCH_CENTS, locale);

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h2 className="font-[family-name:var(--font-label)] text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {copy.title}
        </h2>
        <p className="max-w-2xl text-sm font-light leading-relaxed text-zinc-400 md:text-base">
          {copy.description}
        </p>
      </header>

      <article
        className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
          enabled
            ? "border-teal-400/30 bg-teal-400/[0.04] shadow-[0_0_40px_rgba(45,212,191,0.12)]"
            : "border-white/10 bg-white/[0.02]"
        }`}
      >
        <div className="border-b border-white/[0.06] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-teal-400/90">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Premium
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-label)] text-xl font-medium text-zinc-100 md:text-2xl">
                {copy.cardTitle}
              </h3>
              <p className="mt-2 max-w-lg text-sm font-light text-zinc-500">
                {copy.cardSubtitle}
              </p>
            </div>
            {enabled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/25 bg-teal-400/10 px-3 py-1 text-xs font-medium text-teal-200">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                {copy.selectedBadge}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-[1fr_minmax(0,1.1fr)] md:p-6">
          <ul className="space-y-3">
            {FEATURES.map(({ key, icon: Icon }) => (
              <li
                key={key}
                className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-teal-300/90">
                  <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                </span>
                <span className="text-sm font-light leading-relaxed text-zinc-300">
                  {key === "restore"
                    ? copy.featureRestore
                    : key === "color"
                      ? copy.featureColor
                      : copy.featureUpscale}
                </span>
              </li>
            ))}
            <li className="pt-1 text-xs font-light text-zinc-500">
              {copy.qualityNote}
            </li>
          </ul>

          <BeforeAfterSlider
            beforeLabel={copy.beforeLabel}
            afterLabel={copy.afterLabel}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.06] bg-black/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <p className="text-sm text-zinc-400">
            {copy.priceNote.replace("{price}", price)}
          </p>
          <button
            type="button"
            onClick={() => onToggle(!enabled)}
            className={`inline-flex min-h-[44px] items-center justify-center rounded-xl px-5 text-sm font-medium transition-all duration-200 ${
              enabled
                ? "border border-teal-400/30 bg-teal-400/10 text-teal-100 hover:bg-teal-400/15"
                : "border border-white/12 bg-white/[0.08] text-zinc-100 shadow-[0_0_24px_rgba(45,212,191,0.1)] hover:bg-white/[0.11]"
            }`}
          >
            {enabled
              ? copy.addedCta
              : copy.addCta.replace("{price}", price)}
          </button>
        </div>
      </article>
    </div>
  );
}
