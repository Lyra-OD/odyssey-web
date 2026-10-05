"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { ConnexionEclipseLayer } from "@/src/components/auth/ConnexionEclipseLayer";
import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";
import {
  LocaleSwitcher,
  type LocaleSwitcherLabels,
} from "@/src/components/i18n/LocaleSwitcher";
import { editorialFont } from "@/src/lib/fonts";

import {
  DeckEclipseIntro,
  hasSeenDeckEclipseIntro,
} from "./DeckEclipseIntro";
import { DeckSlideLayout } from "./DeckSlideLayout";

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
  localeSwitcher: LocaleSwitcherLabels;
};

function isOdysseyTitle(title: string, wordmark: string) {
  return (
    title === "Odyssey" ||
    title.toUpperCase() === wordmark.toUpperCase()
  );
}

/**
 * Scroller Quiet Luxury — 11 slides snap.
 * T5 : layout desktop split (texte | visual), mobile stack.
 */
export function DeckClient({
  locale,
  wordmark,
  introSkip,
  progressOf,
  slides,
  localeSwitcher,
}: DeckClientProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const skipIntro = hasSeenDeckEclipseIntro();
    setShowIntro(!skipIntro);
    setReady(true);
  }, []);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || showIntro || !ready) return;

    const sections = Array.from(
      root.querySelectorAll<HTMLElement>("[data-deck-slide]"),
    );
    if (sections.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.55) continue;
          const i = Number(entry.target.getAttribute("data-deck-index"));
          if (Number.isFinite(i)) setIndex(i);
        }
      },
      { root, threshold: [0.55] },
    );

    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ready, showIntro, slides.length]);

  const goTo = useCallback(
    (next: number) => {
      const root = scrollerRef.current;
      if (!root) return;
      const clamped = Math.max(0, Math.min(next, slides.length - 1));
      const el = root.querySelector<HTMLElement>(
        `[data-deck-index="${clamped}"]`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [slides.length],
  );

  useEffect(() => {
    if (showIntro || !ready) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goTo(index - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(slides.length - 1);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, index, ready, showIntro, slides.length]);

  if (slides.length === 0) return null;

  const progressLabel = progressOf
    .replace("{current}", String(index + 1))
    .replace("{total}", String(slides.length));

  const deckVisible = ready && !showIntro;

  return (
    <div className="relative h-dvh overflow-hidden bg-[#020202]">
      <div className="absolute right-5 top-5 z-30 md:right-8 md:top-8">
        <LocaleSwitcher lang={locale} {...localeSwitcher} />
      </div>

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

      <p
        className={`font-label pointer-events-none absolute left-1/2 top-6 z-20 -translate-x-1/2 text-[0.65rem] uppercase tracking-[0.42em] text-white/35 transition-opacity duration-500 lg:left-10 lg:translate-x-0 ${
          deckVisible ? "opacity-100" : "opacity-0"
        }`}
        aria-live="polite"
      >
        {slides[index]?.progress ?? progressLabel}
      </p>

      <div
        className={`absolute right-5 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 transition-opacity duration-500 md:right-8 ${
          deckVisible ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      >
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goTo(i)}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i === index ? "bg-white/70" : "bg-white/20 hover:bg-white/40"
            }`}
            tabIndex={deckVisible ? 0 : -1}
            aria-label={`${i + 1} / ${slides.length}`}
          />
        ))}
      </div>

      <div
        ref={scrollerRef}
        className={`relative z-10 h-dvh snap-y snap-mandatory overflow-y-auto overscroll-y-contain transition-opacity duration-700 ease-out ${
          deckVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{ scrollBehavior: "smooth" }}
      >
        {slides.map((slide, i) => {
          const isOpen = i === 0;
          const text = (
            <>
              {isOpen ? (
                <div className="mb-8 lg:hidden">
                  <OdysseyConnexionMark
                    wordmark={wordmark}
                    animate={deckVisible}
                  />
                </div>
              ) : null}

              <p className="font-label text-[0.7rem] uppercase tracking-[0.32em] text-white/40">
                {slide.tagline}
              </p>

              {!isOdysseyTitle(slide.title, wordmark) ? (
                <h2
                  className={`${editorialFont.className} mt-5 text-[clamp(1.55rem,3.6vw,2.65rem)] font-medium tracking-[0.04em] text-zinc-100`}
                >
                  {slide.title}
                </h2>
              ) : null}

              <p
                className={`${editorialFont.className} mt-6 max-w-xl text-[clamp(1.05rem,2.4vw,1.45rem)] font-medium leading-snug tracking-[0.02em] text-zinc-200 lg:max-w-none`}
              >
                {slide.phase}
              </p>

              <ul className="mt-10 max-w-xl space-y-3 lg:max-w-none">
                {slide.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="font-label text-sm font-light leading-relaxed text-white/55 md:text-[0.95rem] lg:text-left"
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
            </>
          );

          const visual = isOpen ? (
            <div className="hidden w-full justify-center lg:flex">
              <OdysseyConnexionMark
                wordmark={wordmark}
                animate={deckVisible}
              />
            </div>
          ) : undefined;

          return (
            <section
              key={slide.id}
              data-deck-slide
              data-deck-index={i}
              className="flex min-h-dvh snap-start snap-always flex-col justify-center"
            >
              <DeckSlideLayout
                text={text}
                visual={visual}
                showVisualColumn
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
