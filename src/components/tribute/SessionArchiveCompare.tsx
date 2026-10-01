"use client";

import { Film, MonitorPlay, Sparkles } from "lucide-react";

import {
  sanctuaryFocusRing,
  wizardMiniCapsAction,
} from "@/src/lib/contribute/sanctuaryChrome";
import {
  EXTENSION_CINEMA_MASTER_CENTS,
  formatWizardPrice,
} from "@/src/lib/wizard/wizardPricing";

export type SessionArchiveCompareCopy = {
  eyebrow: string;
  sessionTitle: string;
  sessionBody: string;
  /** Prestige grand écran — jamais une pénalité mobile. */
  sessionDesktopNote: string;
  archiveTitle: string;
  archiveBody: string;
  archiveIncludedBadge: string;
  archiveCta: string;
  archiveFundHint: string;
  continueCta: string;
};

type Props = {
  copy: SessionArchiveCompareCopy;
  locale?: "fr" | "en";
  /** Master déjà inclus (Héritage+) ou déjà coché. */
  archiveIncluded?: boolean;
  onKeepArchive: () => void;
  onContinue: () => void;
};

/**
 * C3 — Comparatif Quiet Luxury : Séance live vs Archive patrimoniale.
 * CTA Master toujours actif (jamais grisé) ; prestige ordi = présence, pas déficit mobile.
 */
export function SessionArchiveCompare({
  copy,
  locale = "fr",
  archiveIncluded = false,
  onKeepArchive,
  onContinue,
}: Props) {
  const priceLabel = formatWizardPrice(EXTENSION_CINEMA_MASTER_CENTS, locale);
  const archiveCtaLabel = copy.archiveCta.replace("{price}", priceLabel);

  return (
    <section
      className="space-y-5"
      aria-labelledby="session-archive-compare-heading"
    >
      <p
        id="session-archive-compare-heading"
        className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 md:text-left"
      >
        {copy.eyebrow}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 md:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400/10 text-teal-200">
              <MonitorPlay className="h-5 w-5" strokeWidth={1.6} aria-hidden />
            </span>
            <h3 className="font-[family-name:var(--font-label)] text-lg font-medium text-zinc-100">
              {copy.sessionTitle}
            </h3>
          </div>
          <p className="mt-3 text-sm font-light leading-relaxed text-zinc-400">
            {copy.sessionBody}
          </p>
          <p className="mt-4 hidden border-t border-white/[0.06] pt-3 text-xs font-light italic leading-relaxed text-zinc-500 md:block">
            {copy.sessionDesktopNote}
          </p>
        </article>

        <article className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[0.06] to-transparent p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-100">
                <Film className="h-5 w-5" strokeWidth={1.6} aria-hidden />
              </span>
              <h3 className="font-[family-name:var(--font-label)] text-lg font-medium text-zinc-100">
                {copy.archiveTitle}
              </h3>
            </div>
            {archiveIncluded ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-100">
                <Sparkles className="h-3 w-3" strokeWidth={2} aria-hidden />
                {copy.archiveIncludedBadge}
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm font-light leading-relaxed text-zinc-400">
            {copy.archiveBody}
          </p>
          {!archiveIncluded ? (
            <p className="mt-3 text-xs font-light leading-relaxed text-zinc-500">
              {copy.archiveFundHint}
            </p>
          ) : null}
        </article>
      </div>

      <div className="flex flex-col items-center gap-3 pt-1">
        {!archiveIncluded ? (
          <button
            type="button"
            onClick={onKeepArchive}
            className={`${wizardMiniCapsAction} min-h-[56px] w-full max-w-md rounded-2xl border border-cyan-400/45 bg-gradient-to-r from-cyan-600/35 via-teal-500/30 to-cyan-400/25 px-6 text-base font-semibold text-white shadow-[0_0_56px_rgba(34,211,238,0.28),0_0_40px_rgba(45,212,191,0.18)] transition-all hover:scale-[1.01] ${sanctuaryFocusRing}`}
          >
            {archiveCtaLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onContinue}
          className={
            archiveIncluded
              ? `${wizardMiniCapsAction} min-h-[56px] w-full max-w-md rounded-2xl border border-teal-400/45 bg-gradient-to-r from-teal-600/35 via-teal-500/30 to-cyan-400/25 px-6 text-base font-semibold text-white shadow-[0_0_56px_rgba(45,212,191,0.3),0_0_40px_rgba(34,211,238,0.2)] transition-all hover:scale-[1.01] ${sanctuaryFocusRing}`
              : "text-xs font-light tracking-wide text-zinc-400 underline decoration-zinc-800 underline-offset-4 transition-colors hover:text-zinc-300"
          }
        >
          {copy.continueCta}
        </button>
      </div>
    </section>
  );
}
