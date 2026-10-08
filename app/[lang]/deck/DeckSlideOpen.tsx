"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

import { OdysseyLuminousText } from "@/src/components/marketing/OdysseyLuminousText";
import { editorialFont } from "@/src/lib/fonts";

import {
  DECK_BODY_CLASS,
  DECK_EYEBROW_CLASS,
  DECK_OPEN_TEMPO,
  useDeckSoftDock,
} from "./deckSoftDock";
import { DeckVision } from "./DeckVision";
import { highlightDeckTeal } from "./deckTealText";

type DeckSlideOpenProps = {
  tagline: string;
  phase: string;
  bullets: string[];
};

/**
 * Slide 1 — Open.
 * Soft dock spatial + tempo film (temps de lire entre chaque beat).
 * Beat 1 = vision (Playfair + teal, 2 lignes) · beat 2 = preuve · cue scroll.
 */
export function DeckSlideOpen({ tagline, phase, bullets }: DeckSlideOpenProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.5, once: true });
  const softDock = useDeckSoftDock(inView);

  const visionBeat = bullets[0];
  const proofBeat = bullets[1];
  const scrollCue = bullets[2];

  return (
    <div
      ref={rootRef}
      className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-2"
    >
      <motion.p
        className={DECK_EYEBROW_CLASS}
        {...softDock(DECK_OPEN_TEMPO.eyebrow)}
      >
        {tagline}
      </motion.p>

      <motion.h2
        className={`${editorialFont.className} relative z-10 mt-10 max-w-[18em] text-center text-[clamp(1.85rem,5.2vw,3.15rem)] font-medium leading-[1.22] tracking-[0.01em] text-white md:mt-12`}
        {...softDock(DECK_OPEN_TEMPO.hero)}
      >
        <OdysseyLuminousText variant="deck">{phase}</OdysseyLuminousText>
      </motion.h2>

      {visionBeat ? (
        <DeckVision
          text={visionBeat}
          className="max-w-2xl"
          {...softDock(DECK_OPEN_TEMPO.proof1)}
        />
      ) : null}

      <ul className="relative z-10 mt-10 flex max-w-lg flex-col gap-5 text-center md:mt-12 md:gap-6">
        {proofBeat ? (
          <motion.li
            className={`${DECK_BODY_CLASS} text-center`}
            {...softDock(DECK_OPEN_TEMPO.proof2)}
          >
            {highlightDeckTeal(proofBeat)}
          </motion.li>
        ) : null}

        {scrollCue ? (
          <motion.li
            className="mt-3 font-label text-[0.9rem] font-light leading-relaxed tracking-[0.02em] text-[var(--salon-cyan)] md:text-[0.95rem]"
            {...softDock(DECK_OPEN_TEMPO.cta)}
          >
            {scrollCue}
          </motion.li>
        ) : null}
      </ul>
    </div>
  );
}
