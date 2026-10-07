"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

import { OdysseyLuminousText } from "@/src/components/marketing/OdysseyLuminousText";
import { editorialFont } from "@/src/lib/fonts";

import {
  DECK_COMPETITION_LAST_STEP,
  DECK_COMPETITION_STEP,
  DECK_COMPETITION_WAITS_S,
  DECK_EYEBROW_CLASS,
  DECK_PHASE_CLASS,
  useDeckSoftDock,
  useDeckStepReveal,
} from "./deckSoftDock";

type DeckSlideCompetitionProps = {
  tagline: string;
  title: string;
  phase: string;
  bullets: string[];
  active: boolean;
};

type SplitBullet = {
  label: string;
  body: string;
};

function splitLabeledBullet(raw: string): SplitBullet {
  const idx = raw.search(/\s*[:：]\s*/);
  if (idx < 0) return { label: "", body: raw };
  const match = raw.slice(idx).match(/^(\s*[:：]\s*)/);
  const sepLen = match?.[1]?.length ?? 1;
  return {
    label: raw.slice(0, idx).trim(),
    body: raw.slice(idx + sepLen).trim(),
  };
}

/**
 * Slide 5 — Competition : titres ADN deck + beats labelisés.
 * Métaphore Troie / réseau = craft suivant.
 */
export function DeckSlideCompetition({
  tagline,
  title,
  phase,
  bullets,
  active,
}: DeckSlideCompetitionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { advance, visible, canAdvance } = useDeckStepReveal(
    active,
    DECK_COMPETITION_WAITS_S,
    DECK_COMPETITION_LAST_STEP,
  );
  const canAdvanceRef = useRef(canAdvance);
  const advanceRef = useRef(advance);
  canAdvanceRef.current = canAdvance;
  advanceRef.current = advance;

  const beats = bullets.map(splitLabeledBullet).slice(0, 5);

  const dockEyebrow = useDeckSoftDock(visible(DECK_COMPETITION_STEP.eyebrow));
  const dockHero = useDeckSoftDock(visible(DECK_COMPETITION_STEP.hero));
  const dockPhase = useDeckSoftDock(visible(DECK_COMPETITION_STEP.phase));
  const dockBeat0 = useDeckSoftDock(visible(DECK_COMPETITION_STEP.beat0));
  const dockBeat1 = useDeckSoftDock(visible(DECK_COMPETITION_STEP.beat1));
  const dockBeat2 = useDeckSoftDock(visible(DECK_COMPETITION_STEP.beat2));
  const dockBeat3 = useDeckSoftDock(visible(DECK_COMPETITION_STEP.beat3));
  const dockBeat4 = useDeckSoftDock(visible(DECK_COMPETITION_STEP.beat4));
  const dockBeats = [dockBeat0, dockBeat1, dockBeat2, dockBeat3, dockBeat4];

  useEffect(() => {
    if (!active) return;
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
  }, [active]);

  return (
    <div
      ref={rootRef}
      className={`relative mx-auto flex w-full max-w-[90rem] flex-col px-3 md:px-6 ${
        canAdvance ? "cursor-pointer" : ""
      }`}
    >
      <div className="relative z-10 mx-auto flex w-full max-w-[90rem] -translate-y-[105%] flex-col items-center text-center">
        <motion.p className={DECK_EYEBROW_CLASS} {...dockEyebrow()}>
          {tagline}
        </motion.p>

        <motion.h2
          className={`${editorialFont.className} relative z-10 mt-6 text-center text-[clamp(1.4rem,3.4vw,2.85rem)] font-medium leading-[1.12] tracking-[0.01em] text-white md:mt-8`}
          {...dockHero()}
        >
          <OdysseyLuminousText variant="deck">{title}</OdysseyLuminousText>
        </motion.h2>

        <motion.p
          className={`${editorialFont.className} ${DECK_PHASE_CLASS} relative z-10 mt-8 w-full max-w-[72rem] text-[clamp(1.3rem,2.55vw,1.75rem)] font-medium leading-[1.32] tracking-[0.01em] md:mt-10`}
          style={{ WebkitFontSmoothing: "antialiased" }}
          {...dockPhase()}
        >
          {phase}
        </motion.p>
      </div>

      {/* Beats — colonne lisible ; schéma Troie = plus tard */}
      <div className="relative z-10 mx-auto -mt-10 flex w-full max-w-[60rem] flex-col gap-9 md:-mt-14 md:gap-10 lg:max-w-[64rem]">
        {beats.map((item, i) => {
          const dock = dockBeats[i] ?? dockBeat4;
          return (
            <motion.div
              key={`beat-${item.label || i}`}
              className="text-left"
              {...dock()}
            >
              {item.label ? (
                <p className="font-label text-[clamp(0.85rem,1.2vw,1.05rem)] font-semibold uppercase tracking-[0.26em] text-[var(--salon-cyan)]">
                  {item.label}
                </p>
              ) : null}
              <p
                className={`${editorialFont.className} mt-2.5 text-[clamp(1.22rem,1.7vw,1.5rem)] font-light leading-snug text-zinc-300`}
              >
                {item.body}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
