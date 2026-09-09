"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Phone } from "lucide-react";

import { appRoutes } from "@/src/lib/appRoutes";
import type { AppDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";
import { useUiLocaleOptional } from "@/src/components/i18n/UiLocaleContext";

export type HelpLifelineCopy = AppDictionary["helpLifeline"];

type Props = {
  /** Locale URL initiale (fallback si hors contexte). */
  locale: Locale;
  copyFr: HelpLifelineCopy;
  copyEn: HelpLifelineCopy;
  className?: string;
};

/**
 * Chip d'aide permanente — bas-gauche, fixe, toujours visible.
 * Mobile : pastille téléphone au-dessus du footer sticky Next (`bottom-24`).
 * Desktop (`md+`) : chip complet (label + tel + écrire) à `bottom-5`.
 * Portal `document.body` pour échapper au stacking context parent.
 * Suit `UiLocaleContext` quand le LocaleSwitcher switch sans remount layout.
 */
export function OdysseyHelpLifeline({
  locale: routeLocale,
  copyFr,
  copyEn,
  className = "",
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const ui = useUiLocaleOptional();
  const locale = ui?.locale ?? routeLocale;
  const copy = locale === "en" ? copyEn : copyFr;

  const digits = copy.phoneDisplay.replace(/\D/g, "");
  const telHref = digits.length === 10 ? `tel:+1${digits}` : `tel:+${digits}`;

  const chip = (
    <div
      className={`pointer-events-none fixed bottom-24 left-4 z-[9999] md:bottom-5 ${className}`}
      aria-label={copy.label}
    >
      {/* Mobile — pastille téléphone (évite le chevauchement Next). */}
      <a
        href={telHref}
        aria-label={copy.phoneAria}
        className="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/70 text-teal-400/80 backdrop-blur-md transition-colors hover:border-teal-400/30 hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40 md:hidden"
      >
        <Phone className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </a>

      {/* Desktop — chip complet. */}
      <div className="pointer-events-auto hidden flex-col items-start gap-1 rounded-xl border border-white/10 bg-black/70 px-3 py-2.5 backdrop-blur-md md:inline-flex">
        <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-white/35">
          {copy.label}
        </p>
        <a
          href={telHref}
          aria-label={copy.phoneAria}
          className="inline-flex items-center gap-1.5 text-[11px] font-light text-zinc-300 transition-colors hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40"
        >
          <Phone
            className="h-3 w-3 shrink-0 text-teal-400/70"
            strokeWidth={1.75}
            aria-hidden
          />
          {copy.phoneDisplay}
        </a>
        <Link
          href={appRoutes.contact(locale)}
          aria-label={copy.writeUsAria}
          className="text-[10px] font-light text-white/40 underline decoration-white/20 underline-offset-2 transition-colors hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40"
        >
          {copy.writeUs}
        </Link>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(chip, document.body);
}
