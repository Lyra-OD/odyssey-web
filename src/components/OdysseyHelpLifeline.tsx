"use client";

import Link from "next/link";
import { Phone } from "lucide-react";

import { appRoutes } from "@/src/lib/appRoutes";
import type { AppDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";

export type HelpLifelineCopy = AppDictionary["helpLifeline"];

type Props = {
  locale: Locale;
  copy: HelpLifelineCopy;
  /**
   * z-index Tailwind class à passer selon la surface :
   *   - famille (hors rituel) : "z-[59]"  — sous invite z-[60] / dossier z-[61]
   *   - invité               : "z-[47]"  — dessus sky overlay z-[46]
   */
  zClass?: string;
  /** Offset bas via classe Tailwind si un footer sticky réduit l'espace. */
  className?: string;
};

/**
 * Chip d'aide permanente — affiché bas-gauche, fixe, discret.
 * Baby-boomers : téléphone cliquable + lien Contact toujours accessible.
 * Rendu conditionnel par l'appelant (ex. masqué pendant le rituel ciel).
 */
export function OdysseyHelpLifeline({
  locale,
  copy,
  zClass = "z-[59]",
  className = "",
}: Props) {
  // Dériver le href tel: depuis l'affichage (strip non-digits, ajoute +1 si 10 chiffres NA)
  const digits = copy.phoneDisplay.replace(/\D/g, "");
  const telHref =
    digits.length === 10 ? `tel:+1${digits}` : `tel:+${digits}`;

  return (
    <div
      className={`pointer-events-none fixed bottom-5 left-4 ${zClass} ${className}`}
    >
      <div className="pointer-events-auto inline-flex flex-col items-start gap-1 rounded-xl border border-white/10 bg-black/60 px-3 py-2.5 backdrop-blur-md">
        <p className="text-[9px] font-medium uppercase tracking-[0.3em] text-white/35">
          {copy.label}
        </p>
        <a
          href={telHref}
          aria-label={copy.phoneAria}
          className="inline-flex items-center gap-1.5 text-[11px] font-light text-zinc-300 transition-colors hover:text-teal-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40"
        >
          <Phone className="h-3 w-3 shrink-0 text-teal-400/70" strokeWidth={1.75} aria-hidden />
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
}
