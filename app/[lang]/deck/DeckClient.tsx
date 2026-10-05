"use client";

import { useEffect, useState } from "react";

import { ConnexionEclipseLayer } from "@/src/components/auth/ConnexionEclipseLayer";
import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";
import { editorialFont } from "@/src/lib/fonts";

import {
  DeckEclipseIntro,
  hasSeenDeckEclipseIntro,
} from "./DeckEclipseIntro";

/** Grain léger (même ADN sas / player). */
const DECK_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

export type PitchDeckSlide = {
  id: string;
  tagline: string;
  title: string;
  phase: string;
  bullets: string[];
  progress?: string;
};

type DeckClientProps = {
  locale: "fr" | "en";
  wordmark: string;
  introSkip: string;
  progressOf: string;
  slides: PitchDeckSlide[];
};

/**
 * Shell Quiet Luxury — A (Mark + éclipse login) + intro craft play B.
 * T1 : slide 1 depuis dict. Gate + scroller = T2–T3.
 */
export function DeckClient({
  locale,
  wordmark,
  introSkip,
  progressOf,
  slides,
}: DeckClientProps) {
  const [ready, setReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const slide = slides[0];
  const progressLabel =
    slide?.progress ??
    progressOf
      .replace("{current}", "1")
      .replace("{total}", String(slides.length));

  useEffect(() => {
    const skipIntro = hasSeenDeckEclipseIntro();
    setShowIntro(!skipIntro);
    setReady(true);
  }, []);

  if (!slide) return null;

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
        className={`relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center px-2 transition-opacity duration-700 ease-out ${
          !ready || showIntro ? "opacity-0" : "opacity-100"
        }`}
      >
        <p className="font-label mb-6 text-[0.65rem] uppercase tracking-[0.42em] text-white/35">
          {progressLabel}
        </p>
        <OdysseyConnexionMark
          wordmark={wordmark}
          animate={!showIntro && ready}
          className="mb-10"
        />
        <p className="font-label text-center text-[0.7rem] uppercase tracking-[0.32em] text-white/40">
          {slide.tagline}
        </p>
        {slide.title !== "Odyssey" &&
        slide.title.toUpperCase() !== wordmark.toUpperCase() ? (
          <h1
            className={`${editorialFont.className} mt-5 text-center text-[clamp(1.85rem,5vw,2.75rem)] font-medium tracking-[0.04em] text-zinc-100`}
          >
            {slide.title}
          </h1>
        ) : null}
        <p
          className={`${editorialFont.className} mt-6 max-w-xl text-center text-[clamp(1.15rem,3.2vw,1.55rem)] font-medium leading-snug tracking-[0.02em] text-zinc-200`}
        >
          {slide.phase}
        </p>
        <ul className="mt-10 space-y-3 text-center">
          {slide.bullets.map((bullet) => (
            <li
              key={bullet}
              className="font-label text-sm font-light leading-relaxed text-white/50 md:text-[0.95rem]"
            >
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
