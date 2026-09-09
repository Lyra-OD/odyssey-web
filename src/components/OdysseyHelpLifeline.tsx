"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Phone } from "lucide-react";

import { appRoutes } from "@/src/lib/appRoutes";
import type { AppDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";

export type HelpLifelineCopy = AppDictionary["helpLifeline"];

type Props = {
  locale: Locale;
  copy: HelpLifelineCopy;
  className?: string;
};

/**
 * Chip d'aide permanente — bas-gauche, fixe, toujours visible.
 * Utilise un React Portal (document.body) pour échapper à tout stacking
 * context parent (transforms, filters, overflow, z-index internes au wizard).
 * Baby-boomers : téléphone cliquable + lien Contact.
 */
export function OdysseyHelpLifeline({ locale, copy, className = "" }: Props) {
  // SSR-safe : on ne monte le portal qu'une fois côté client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const digits = copy.phoneDisplay.replace(/\D/g, "");
  const telHref = digits.length === 10 ? `tel:+1${digits}` : `tel:+${digits}`;

  const chip = (
    <div
      className={`pointer-events-none fixed bottom-5 left-4 z-[9999] ${className}`}
      aria-label={copy.label}
    >
      <div className="pointer-events-auto inline-flex flex-col items-start gap-1 rounded-xl border border-white/10 bg-black/70 px-3 py-2.5 backdrop-blur-md">
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

  if (!mounted) return null;
  return createPortal(chip, document.body);
}
