"use client";

import type { Transition } from "framer-motion";
import { useReducedMotion } from "framer-motion";

/** Eyebrow deck — signature toutes slides (lisible, pas fantôme). */
export const DECK_EYEBROW_CLASS =
  "font-label relative z-10 text-center text-[0.72rem] font-medium uppercase tracking-[0.36em] text-white/65 md:text-[0.78rem] md:tracking-[0.4em]";

/** Courbe cinéma (ADN Manifesto / Quiet Luxury). */
export const DECK_FILM_EASE: [number, number, number, number] = [
  0.16, 1, 0.3, 1,
];

/** Soft dock — étoile qui se pose (durée s). */
export const DECK_DOCK_DUR = 1.0;

/**
 * Soft dock spatial — opacity + blur + rise.
 * `play` = inView (ou reduced-motion → tout visible).
 */
export function useDeckSoftDock(play: boolean) {
  const reduceMotion = useReducedMotion();
  const active = Boolean(reduceMotion || play);

  return (delay: number) => ({
    initial: reduceMotion
      ? false
      : ({ opacity: 0, y: 10, filter: "blur(6px)" } as const),
    animate: active
      ? ({ opacity: 1, y: 0, filter: "blur(0px)" } as const)
      : ({ opacity: 0, y: 10, filter: "blur(6px)" } as const),
    transition: {
      duration: reduceMotion ? 0 : DECK_DOCK_DUR,
      ease: DECK_FILM_EASE,
      delay: reduceMotion ? 0 : delay,
    } satisfies Transition,
  });
}

/** Tempo film Open (s depuis entrée en vue). */
export const DECK_OPEN_TEMPO = {
  eyebrow: 0.4,
  hero: 0.4 + 1.15,
  proof1: 0.4 + 1.15 + 2.2,
  proof2: 0.4 + 1.15 + 2.2 + 2.0,
  cta: 0.4 + 1.15 + 2.2 + 2.0 + 1.6,
} as const;

/**
 * Tempo film Need — un peu plus serré (diagnostic).
 * eyebrow → title → phase → 3 colonnes L→R → barre pont.
 */
export const DECK_NEED_TEMPO = {
  eyebrow: 0.35,
  hero: 0.35 + 1.0,
  phase: 0.35 + 1.0 + 1.6,
  col0: 0.35 + 1.0 + 1.6 + 1.5,
  col1: 0.35 + 1.0 + 1.6 + 1.5 + 0.85,
  col2: 0.35 + 1.0 + 1.6 + 1.5 + 0.85 + 0.85,
  bridge: 0.35 + 1.0 + 1.6 + 1.5 + 0.85 + 0.85 + 1.5,
} as const;
