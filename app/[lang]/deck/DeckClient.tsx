"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";

import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";
import { SKY_LAB_DEFAULT_LAYERS } from "@/src/components/contribute/constellation/skyCraftLayers";
import {
  LocaleSwitcher,
  type LocaleSwitcherLabels,
} from "@/src/components/i18n/LocaleSwitcher";
import { OdysseyLuminousText } from "@/src/components/marketing/OdysseyLuminousText";
import { editorialFont } from "@/src/lib/fonts";

import {
  DeckEclipseIntro,
  hasSeenDeckEclipseIntro,
} from "./DeckEclipseIntro";
import { DeckSlideCompetition } from "./DeckSlideCompetition";
import { DeckSlideEcosystem } from "./DeckSlideEcosystem";
import { DeckSlideModel } from "./DeckSlideModel";
import { DeckSlideNeed } from "./DeckSlideNeed";
import { DeckSlideOpen } from "./DeckSlideOpen";
import { DeckSlidePhases } from "./DeckSlidePhases";
import { DeckSlideSolution } from "./DeckSlideSolution";
import { DeckSlideAsk } from "./DeckSlideAsk";
import { DeckSlideTeam } from "./DeckSlideTeam";
import { DeckSlideTraction } from "./DeckSlideTraction";
import {
  DECK_BODY_CLASS,
  DECK_EYEBROW_CLASS,
  DECK_TITLE_CLASS,
  DECK_VISION_CLASS,
} from "./deckSoftDock";
import { DeckSoftCapTipProvider } from "./DeckSoftCapTip";
import { highlightDeckTeal } from "./deckTealText";

const SanctuaryUniverse = dynamic(
  () =>
    import("@/src/components/contribute/SanctuaryUniverse").then(
      (m) => m.SanctuaryUniverse,
    ),
  { ssr: false },
);

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

type TractionLabels = {
  foyer: string;
  ringOuter: string;
  ringInner: string;
  hub: string;
  arcFrom: string;
  arcTo: string;
  phaseBadge: string;
  productDesktop: string;
  partnersDesktop: string;
};

type DeckClientProps = {
  locale: "fr" | "en";
  wordmark: string;
  introSkip: string;
  progressOf: string;
  softCapTip: string;
  softCapTipAria: string;
  tractionLabels: TractionLabels;
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
 * T5b : Mark ODYSSEY sticky en haut, détaché du contenu des slides.
 */
export function DeckClient({
  locale,
  wordmark,
  introSkip,
  progressOf,
  softCapTip,
  softCapTipAria,
  tractionLabels,
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
    <DeckSoftCapTipProvider tip={softCapTip} aria={softCapTipAria}>
    <div className="relative h-dvh overflow-hidden bg-[#020202]">
      <div className="absolute right-5 top-5 z-40 md:right-8 md:top-8">
        <LocaleSwitcher lang={locale} {...localeSwitcher} />
      </div>

      {/* Ciel GL en fond — le rond vidéo reste sur le sas password (DeckGate). */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        {deckVisible ? (
          <SanctuaryUniverse
            mode="background"
            locale={locale}
            skyLayers={SKY_LAB_DEFAULT_LAYERS}
            constellationVisible={false}
            skyCraftChrome={false}
            wanderChrome={false}
            skipConstellationReveal
            className="h-full w-full"
          />
        ) : null}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/45 via-black/38 to-black/62"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_72%_58%_at_50%_48%,rgba(0,0,0,0.42),transparent_72%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] opacity-[0.035]"
          style={{ backgroundImage: DECK_GRAIN }}
        />
      </div>

      {ready && showIntro ? (
        <DeckEclipseIntro
          locale={locale}
          skipLabel={introSkip}
          onDone={() => setShowIntro(false)}
        />
      ) : null}

      {/* Chrome sticky : Mark détaché + progress — hors flux des slides */}
      <header
        className={`pointer-events-none fixed inset-x-0 top-0 z-30 flex flex-col items-center pt-5 transition-opacity duration-500 md:pt-6 ${
          deckVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="pointer-events-none scale-[0.82] sm:scale-90">
          <OdysseyConnexionMark wordmark={wordmark} animate={deckVisible} />
        </div>
        <p
          className="font-label mt-3 text-[0.6rem] uppercase tracking-[0.42em] text-white/35 md:mt-3.5 md:text-[0.65rem]"
          aria-live="polite"
        >
          {slides[index]?.progress ?? progressLabel}
        </p>
      </header>

      <div
        className={`absolute right-5 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 transition-opacity duration-500 md:right-8 ${
          deckVisible ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      >
        {slides.map((s, i) => {
          const active = i === index;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              className="relative flex h-3 w-3 items-center justify-center"
              tabIndex={deckVisible ? 0 : -1}
              aria-label={`${i + 1} / ${slides.length}`}
            >
              {active ? (
                <>
                  {/* Même ADN que FR (SalonCyanGlowText) : flou blanc + cœur cyan. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-80 blur-[5px]"
                  />
                  <span
                    aria-hidden
                    className="deck-nav-dot-breathe relative h-1.5 w-1.5 rounded-full bg-[var(--salon-cyan)]"
                  />
                </>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-white/20 transition-colors hover:bg-[var(--salon-cyan-dim)]" />
              )}
            </button>
          );
        })}
      </div>

      <div
        ref={scrollerRef}
        className={`deck-scroller relative z-10 h-dvh snap-y snap-mandatory overflow-y-auto overscroll-y-contain transition-opacity duration-700 ease-out ${
          deckVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{ scrollBehavior: "smooth" }}
      >
        {slides.map((slide, i) => (
          <section
            key={slide.id}
            data-deck-slide
            data-deck-index={i}
            className="flex min-h-dvh snap-start snap-always flex-col items-center justify-center px-6 pb-20 pt-28 sm:pt-32 md:pt-36"
          >
            {i === 0 ? (
              <DeckSlideOpen
                tagline={slide.tagline}
                phase={slide.phase}
                bullets={slide.bullets}
              />
            ) : i === 1 || slide.id === "need" ? (
              <DeckSlideNeed
                tagline={slide.tagline}
                title={slide.title}
                phase={slide.phase}
                bullets={slide.bullets}
                active={index === i}
              />
            ) : i === 2 || slide.id === "solution" ? (
              <DeckSlideSolution
                tagline={slide.tagline}
                title={slide.title}
                phase={slide.phase}
                bullets={slide.bullets}
                active={index === i}
              />
            ) : i === 3 || slide.id === "ecosystem" ? (
              <DeckSlideEcosystem
                tagline={slide.tagline}
                title={slide.title}
                phase={slide.phase}
                bullets={slide.bullets}
                active={index === i}
              />
            ) : i === 4 || slide.id === "competition" ? (
              <DeckSlideCompetition
                tagline={slide.tagline}
                title={slide.title}
                phase={slide.phase}
                bullets={slide.bullets}
                active={index === i}
              />
            ) : i === 5 || slide.id === "phases" ? (
              <DeckSlidePhases
                tagline={slide.tagline}
                title={slide.title}
                phase={slide.phase}
                bullets={slide.bullets}
                active={index === i}
              />
            ) : i === 6 || slide.id === "model" ? (
              <DeckSlideModel
                tagline={slide.tagline}
                title={slide.title}
                phase={slide.phase}
                bullets={slide.bullets}
                active={index === i}
              />
            ) : i === 7 || slide.id === "traction" ? (
              <DeckSlideTraction
                tagline={slide.tagline}
                title={slide.title}
                phase={slide.phase}
                bullets={slide.bullets}
                active={index === i}
                foyerLabel={tractionLabels.foyer}
                ringOuter={tractionLabels.ringOuter}
                ringInner={tractionLabels.ringInner}
                hubLabel={tractionLabels.hub}
                arcFrom={tractionLabels.arcFrom}
                arcTo={tractionLabels.arcTo}
                phaseBadge={tractionLabels.phaseBadge}
                productDesktop={tractionLabels.productDesktop}
                partnersDesktop={tractionLabels.partnersDesktop}
              />
            ) : i === 8 || slide.id === "team" ? (
              <DeckSlideTeam
                tagline={slide.tagline}
                title={slide.title}
                phase={slide.phase}
                bullets={slide.bullets}
                active={index === i}
              />
            ) : i === 9 || slide.id === "ask" ? (
              <DeckSlideAsk
                tagline={slide.tagline}
                title={slide.title}
                phase={slide.phase}
                bullets={slide.bullets}
                active={index === i}
              />
            ) : (
              <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
                <p className={DECK_EYEBROW_CLASS}>{slide.tagline}</p>

                {!isOdysseyTitle(slide.title, wordmark) ? (
                  <h2 className={`${editorialFont.className} ${DECK_TITLE_CLASS}`}>
                    <OdysseyLuminousText variant="deck">{slide.title}</OdysseyLuminousText>
                  </h2>
                ) : null}

                <p
                  className={`${editorialFont.className} ${DECK_VISION_CLASS} max-w-xl text-center`}
                >
                  {highlightDeckTeal(slide.phase)}
                </p>

                <ul className="mt-10 max-w-xl space-y-3 text-center">
                  {slide.bullets.map((bullet) => (
                    <li key={bullet} className={`${DECK_BODY_CLASS} text-white/50`}>
                      {highlightDeckTeal(bullet)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
    </DeckSoftCapTipProvider>
  );
}
