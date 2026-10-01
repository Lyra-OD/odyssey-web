"use client";

import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";
import { GuestSkyStill } from "@/src/components/contribute/GuestSkyStill";
import { LocaleSwitcher } from "@/src/components/i18n/LocaleSwitcher";
import { connexionSubmitButtonClass } from "@/src/components/salon/SalonCyanGlowText";
import {
  inMemoryOfTitle,
  tributeSkyName,
  type TributeNameBits,
} from "@/src/lib/contribute/inMemoryTitle";
import type { Locale } from "@/i18n.config";

export type SanctuarySkyShellCopy = {
  kicker: string;
  skyContextBody: string;
  skyPrivacyNote: string;
  skyCta: string;
  loading: string;
  poweredBy: string;
  brandWordmark: string;
  logoHomeAria: string;
  languageLabel: string;
  langOptionFr: string;
  langOptionEn: string;
};

type Props = {
  locale: Locale;
  copy: SanctuarySkyShellCopy;
  tribute: TributeNameBits | null;
  onLocale: (next: Locale) => void;
  onCta: () => void;
  ctaReady: boolean;
  ctaBusy?: boolean;
};

/** Premier HTML du Sanctuaire — still + copy, zéro Framer / Three. */
export function SanctuarySkyShell({
  locale,
  copy,
  tribute,
  onLocale,
  onCta,
  ctaReady,
  ctaBusy = false,
}: Props) {
  const title = tribute
    ? inMemoryOfTitle(tributeSkyName(tribute, locale), locale)
    : inMemoryOfTitle("", locale);

  return (
    <main className="relative h-dvh overflow-hidden overscroll-none bg-[#020202] text-zinc-100 antialiased">
      <GuestSkyStill />
      <div className="pointer-events-none fixed inset-0 z-[46] flex flex-col">
        <div className="relative flex items-start justify-end px-4 pt-10 md:px-8 md:pt-14">
          <div className="pointer-events-auto absolute left-1/2 top-10 -translate-x-1/2 md:top-14">
            <a
              href={`/${locale}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={copy.logoHomeAria}
              className="inline-flex justify-center"
            >
              <div className="mx-auto flex max-w-[16rem] origin-top scale-[0.82] justify-center sm:max-w-[18rem] sm:scale-[0.88]">
                <OdysseyConnexionMark
                  wordmark={copy.brandWordmark}
                  animate={false}
                  className="pointer-events-none mb-0"
                />
              </div>
            </a>
          </div>
          <div className="pointer-events-auto relative z-[1]">
            <LocaleSwitcher
              lang={locale}
              languageLabel={copy.languageLabel}
              langOptionFr={copy.langOptionFr}
              langOptionEn={copy.langOptionEn}
              onSwitch={onLocale}
            />
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 px-6 pt-4 text-center md:gap-4 md:pt-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.55em] text-white/35">
            {copy.kicker}
          </p>
          <h1
            className={`font-editorial text-[1.85rem] font-medium tracking-tight text-zinc-50 md:text-4xl ${
              tribute ? "opacity-100" : "opacity-40"
            }`}
          >
            {title}
          </h1>
          <p
            className={`max-w-sm text-sm font-light leading-relaxed text-white/70 md:text-base ${
              tribute ? "opacity-100" : "opacity-0"
            }`}
          >
            {copy.skyContextBody}
          </p>
          <p
            className={`max-w-sm text-xs font-light leading-relaxed text-white/40 md:text-sm ${
              tribute ? "opacity-100" : "opacity-0"
            }`}
          >
            {copy.skyPrivacyNote}
          </p>
        </div>
        <div className="flex-1" />
        <div className="flex flex-col items-center gap-4 px-6 pb-16 text-center">
          <button
            type="button"
            disabled={!ctaReady || ctaBusy}
            onClick={onCta}
            className={`pointer-events-auto parcours-monolith-continue ${connexionSubmitButtonClass} max-w-xs touch-manipulation`}
          >
            {ctaReady ? copy.skyCta : copy.loading}
          </button>
          <p className="text-[8px] font-medium uppercase tracking-[0.44em] text-white/26">
            {copy.poweredBy} {copy.brandWordmark}
          </p>
        </div>
      </div>
    </main>
  );
}
