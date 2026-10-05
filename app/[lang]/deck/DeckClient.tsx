"use client";

import { useEffect, useState } from "react";

import { ConnexionEclipseLayer } from "@/src/components/auth/ConnexionEclipseLayer";
import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";

import {
  DeckEclipseIntro,
  hasSeenDeckEclipseIntro,
} from "./DeckEclipseIntro";

/** Grain léger (même ADN sas / player). */
const DECK_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

type DeckClientProps = {
  locale: "fr" | "en";
  wordmark: string;
  hint: string;
  progress: string;
  introSkip: string;
};

/**
 * Shell Quiet Luxury — A (Mark + éclipse login) + intro craft play B.
 * Gate + scroller = T2–T3.
 */
export function DeckClient({
  locale,
  wordmark,
  hint,
  progress,
  introSkip,
}: DeckClientProps) {
  const [ready, setReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    const skipIntro = hasSeenDeckEclipseIntro();
    setShowIntro(!skipIntro);
    setReady(true);
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#020202] px-6">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <ConnexionEclipseLayer />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: DECK_GRAIN }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.78)_100%)]"
        />
      </div>

      {ready && showIntro ? (
        <DeckEclipseIntro
          locale={locale}
          skipLabel={introSkip}
          onDone={() => setShowIntro(false)}
        />
      ) : null}

      <div
        className={`relative z-10 flex flex-col items-center transition-opacity duration-700 ease-out ${
          !ready || showIntro ? "opacity-0" : "opacity-100"
        }`}
      >
        <p className="font-label mb-8 text-[0.65rem] uppercase tracking-[0.42em] text-white/35">
          {progress}
        </p>
        <OdysseyConnexionMark wordmark={wordmark} animate={!showIntro && ready} />
        <p className="font-label mt-10 max-w-sm text-center text-sm font-light leading-relaxed text-white/45">
          {hint}
        </p>
      </div>
    </div>
  );
}
