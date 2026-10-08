"use client";

import { motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { OdysseyLuminousText } from "@/src/components/marketing/OdysseyLuminousText";
import { editorialFont } from "@/src/lib/fonts";

import {
  DECK_BODY_CLASS,
  DECK_CONTACT_LAST_STEP,
  DECK_CONTACT_STEP,
  DECK_CONTACT_WAITS_S,
  DECK_EYEBROW_CLASS,
  DECK_TITLE_CLASS,
  useDeckSoftDock,
  useDeckStepReveal,
} from "./deckSoftDock";
import { DeckVision } from "./DeckVision";
import { highlightDeckTeal } from "./deckTealText";

const EclipseCraftPlay = dynamic(
  () =>
    import("@/src/components/contribute/EclipseCraftPlay").then(
      (m) => m.EclipseCraftPlay,
    ),
  { ssr: false },
);

/** Fade blanc craft → ciel Sanctuaire. */
const CINEMA_FADE_MS = 900;

type DeckSlideContactProps = {
  locale: "fr" | "en";
  tagline: string;
  title: string;
  phase: string;
  bullets: string[];
  active: boolean;
  ctaLabel: string;
  ctaHref: string;
  skipLabel?: string;
};

type ContactAct = "cinema" | "copy";

/**
 * Slide 11 — Contact :
 * 1) Cinéma plein écran (noir → naissance → blanc B)
 * 2) Dissolve vers le ciel + titres / infos soft-dock
 */
export function DeckSlideContact({
  locale,
  tagline,
  title,
  phase,
  bullets,
  active,
  ctaLabel,
  ctaHref,
  skipLabel,
}: DeckSlideContactProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const doneRef = useRef(false);

  const [act, setAct] = useState<ContactAct>("cinema");
  const [fading, setFading] = useState(false);
  const [mountPlay, setMountPlay] = useState(false);

  const copyActive = Boolean(active && act === "copy");

  const { advance, visible, canAdvance } = useDeckStepReveal(
    copyActive,
    DECK_CONTACT_WAITS_S,
    DECK_CONTACT_LAST_STEP,
  );
  const canAdvanceRef = useRef(canAdvance);
  const advanceRef = useRef(advance);
  canAdvanceRef.current = canAdvance;
  advanceRef.current = advance;

  const [beat0, beat1] = bullets.slice(0, 2);

  const dockEyebrow = useDeckSoftDock(visible(DECK_CONTACT_STEP.eyebrow));
  const dockHero = useDeckSoftDock(visible(DECK_CONTACT_STEP.hero));
  const dockPhase = useDeckSoftDock(visible(DECK_CONTACT_STEP.phase));
  const dockBeat0 = useDeckSoftDock(visible(DECK_CONTACT_STEP.beat0));
  const dockBeat1 = useDeckSoftDock(visible(DECK_CONTACT_STEP.beat1));
  const dockCta = useDeckSoftDock(visible(DECK_CONTACT_STEP.cta));

  const finishCinema = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFading(true);
    window.setTimeout(() => {
      setAct("copy");
      setMountPlay(false);
      setFading(false);
    }, CINEMA_FADE_MS);
  }, []);

  useEffect(() => {
    if (!active) {
      doneRef.current = false;
      setAct("cinema");
      setFading(false);
      setMountPlay(false);
      return;
    }
    if (reduceMotion) {
      doneRef.current = true;
      setAct("copy");
      setMountPlay(false);
      return;
    }
    doneRef.current = false;
    setAct("cinema");
    setFading(false);
    setMountPlay(true);
  }, [active, reduceMotion]);

  useEffect(() => {
    if (!active || act !== "copy") return;
    const section = rootRef.current?.closest("[data-deck-slide]");
    if (!(section instanceof HTMLElement)) return;

    const onClick = (e: MouseEvent) => {
      if (!canAdvanceRef.current) return;
      if (!(e.target instanceof Element)) return;
      if (
        e.target.closest("a, button, input, textarea, select, [role='button']")
      ) {
        return;
      }
      e.preventDefault();
      advanceRef.current();
    };

    section.addEventListener("click", onClick);
    return () => section.removeEventListener("click", onClick);
  }, [active, act]);

  const showCinema = Boolean(active && act === "cinema" && mountPlay);

  return (
    <div
      ref={rootRef}
      className={`relative mx-auto flex w-full max-w-[90rem] flex-col items-center justify-center px-3 md:px-6 ${
        copyActive && canAdvance ? "cursor-pointer" : ""
      }`}
    >
      {showCinema || fading ? (
        <div
          className={`fixed inset-0 z-[25] bg-black transition-opacity ease-out ${
            fading ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          style={{ transitionDuration: `${CINEMA_FADE_MS}ms` }}
          role="presentation"
        >
          {mountPlay ? (
            <EclipseCraftPlay
              locale={locale}
              mode="prologue"
              onComplete={finishCinema}
            />
          ) : null}
          {skipLabel ? (
            <button
              type="button"
              onClick={finishCinema}
              className="font-label absolute bottom-10 left-1/2 z-50 -translate-x-1/2 text-[0.65rem] uppercase tracking-[0.4em] text-white/40 transition-colors hover:text-white/70"
            >
              {skipLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={finishCinema}
              className="absolute inset-0 z-40 cursor-pointer bg-transparent"
              aria-label="Skip"
            />
          )}
        </div>
      ) : null}

      {act === "copy" ? (
        <div className="relative z-10 flex w-full flex-col items-center text-center">
          <motion.p className={DECK_EYEBROW_CLASS} {...dockEyebrow()}>
            {tagline}
          </motion.p>

          <motion.h2
            className={`${editorialFont.className} ${DECK_TITLE_CLASS}`}
            {...dockHero()}
          >
            <OdysseyLuminousText variant="deck">{title}</OdysseyLuminousText>
          </motion.h2>

          <DeckVision text={phase} {...dockPhase()} />

          <div className="mt-10 flex w-full flex-col items-center gap-5 md:mt-12">
            {beat0 ? (
              <motion.p
                className={`${DECK_BODY_CLASS} text-center`}
                {...dockBeat0()}
              >
                {highlightDeckTeal(beat0)}
              </motion.p>
            ) : null}
            {beat1 ? (
              <motion.p
                className={`${DECK_BODY_CLASS} text-center`}
                {...dockBeat1()}
              >
                {highlightDeckTeal(beat1)}
              </motion.p>
            ) : null}

            <motion.div {...dockCta()}>
              <Link
                href={ctaHref}
                className="font-label inline-flex items-center justify-center border border-[rgba(0,232,240,0.45)] bg-[rgba(0,232,240,0.08)] px-8 py-3.5 text-[0.85rem] font-semibold uppercase tracking-[0.22em] text-[var(--salon-cyan)] transition-colors hover:bg-[rgba(0,232,240,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--salon-cyan)]"
              >
                {ctaLabel}
              </Link>
            </motion.div>
          </div>
        </div>
      ) : (
        /* Pendant le cinéma : réserve la hauteur de slide (snap). */
        <div className="h-[min(50vh,20rem)] w-full" aria-hidden />
      )}
    </div>
  );
}
