"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

import { OdysseyLuminousText } from "@/src/components/marketing/OdysseyLuminousText";
import { editorialFont } from "@/src/lib/fonts";

import {
  DECK_EYEBROW_CLASS,
  DECK_OPEN_TEMPO,
  useDeckSoftDock,
} from "./deckSoftDock";

type DeckSlideOpenProps = {
  tagline: string;
  phase: string;
  bullets: string[];
};

/**
 * Slide 1 — Open.
 * Soft dock spatial + tempo film (temps de lire entre chaque beat).
 */
export function DeckSlideOpen({ tagline, phase, bullets }: DeckSlideOpenProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.5, once: true });
  const softDock = useDeckSoftDock(inView);

  const proofBullets = bullets.slice(0, -1);
  const scrollCue = bullets[bullets.length - 1];
  const proofDelays = [DECK_OPEN_TEMPO.proof1, DECK_OPEN_TEMPO.proof2];

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

      <ul className="relative z-10 mt-14 flex max-w-lg flex-col gap-5 text-center md:mt-16 md:gap-6">
        {proofBullets.map((bullet, i) => (
          <motion.li
            key={bullet}
            className="font-label text-[0.95rem] font-light leading-relaxed tracking-[0.02em] text-white/70 md:text-[1.05rem]"
            {...softDock(proofDelays[i] ?? DECK_OPEN_TEMPO.proof2 + i * 2)}
          >
            {bullet}
          </motion.li>
        ))}

        {scrollCue ? (
          <motion.li
            className="mt-3 font-label text-[0.9rem] font-light leading-relaxed tracking-[0.02em] text-[rgba(0,232,240,0.58)] md:text-[0.95rem]"
            {...softDock(DECK_OPEN_TEMPO.cta)}
          >
            {scrollCue}
          </motion.li>
        ) : null}
      </ul>
    </div>
  );
}
