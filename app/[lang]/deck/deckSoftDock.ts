"use client";

import type { Transition } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useState,
  type MutableRefObject,
} from "react";

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
 * Soft dock — opacity + rise seulement.
 * Pas de filter blur : ça créait un faux halo (blanc/mauve) sur la typo.
 */
export function useDeckSoftDock(play: boolean) {
  const reduceMotion = useReducedMotion();

  return (delay = 0) => {
    if (reduceMotion) {
      return {
        initial: false as const,
        animate: { opacity: 1, y: 0 } as const,
        transition: { duration: 0 } satisfies Transition,
      };
    }

    return {
      initial: { opacity: 0, y: 10 } as const,
      animate: play
        ? ({ opacity: 1, y: 0 } as const)
        : ({ opacity: 0, y: 10 } as const),
      transition: {
        duration: play ? DECK_DOCK_DUR : 0.35,
        ease: DECK_FILM_EASE,
        delay: play ? delay : 0,
      } satisfies Transition,
    };
  };
}

/** Tempo film Open (s depuis slide active). */
export const DECK_OPEN_TEMPO = {
  eyebrow: 0.4,
  hero: 0.4 + 1.15,
  proof1: 0.4 + 1.15 + 2.2,
  proof2: 0.4 + 1.15 + 2.2 + 2.0,
  cta: 0.4 + 1.15 + 2.2 + 2.0 + 1.6,
} as const;

/** Indices Need — 0…6 */
export const DECK_NEED_STEP = {
  eyebrow: 0,
  hero: 1,
  phase: 2,
  col0: 3,
  col1: 4,
  col2: 5,
  bridge: 6,
} as const;

export const DECK_NEED_LAST_STEP = DECK_NEED_STEP.bridge;

/**
 * Attentes auto *après* chaque step (s), avant le suivant.
 * Clic = saute l’attente. Un cran plus court que le tempo lecture pur.
 */
export const DECK_NEED_WAITS_S: readonly number[] = [
  1.15, // eyebrow → hero
  2.2, // hero → phase
  8.5, // phase → Avant (lire la phase)
  5.2, // Avant → Pendant
  5.2, // Pendant → Après
  6.0, // Après → pont
];

/**
 * Reveal pas-à-pas : auto-tempo + clic pour avancer (le clic annule l’attente).
 * `step` = dernier beat visible (−1 = slide inactive).
 */
export function useDeckStepReveal(
  active: boolean,
  waits: readonly number[],
  lastStep: number,
) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(-1);
  /** Incrémente à chaque advance manuel pour re-armer le timer proprement. */
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    if (!active) {
      setStep(-1);
      return;
    }
    if (reduceMotion) {
      setStep(lastStep);
      return;
    }
    setStep(0);
    setEpoch(0);
  }, [active, reduceMotion, lastStep]);

  useEffect(() => {
    if (!active || reduceMotion || step < 0 || step >= lastStep) return;
    const wait = waits[step] ?? 4;
    const t = window.setTimeout(() => {
      setStep((s) => Math.min(s + 1, lastStep));
    }, wait * 1000);
    return () => window.clearTimeout(t);
  }, [active, reduceMotion, step, waits, lastStep, epoch]);

  const advance = useCallback(() => {
    if (!active || reduceMotion) return false;
    let moved = false;
    setStep((s) => {
      if (s < 0) {
        moved = true;
        return 0;
      }
      if (s >= lastStep) return s;
      moved = true;
      return s + 1;
    });
    if (moved) setEpoch((e) => e + 1);
    return true;
  }, [active, reduceMotion, lastStep]);

  const visible = useCallback(
    (n: number) => reduceMotion || (active && step >= n),
    [active, reduceMotion, step],
  );

  const canAdvance = active && !reduceMotion && step >= 0 && step < lastStep;

  return { step, advance, visible, canAdvance };
}

/** Garde pour éviter double-advance si on clique un bouton enfant. */
export function deckRevealClickTarget(
  e: { target: EventTarget | null },
  root: MutableRefObject<HTMLElement | null>,
) {
  if (!(e.target instanceof Element)) return true;
  if (!root.current?.contains(e.target)) return false;
  if (e.target.closest("a, button, input, textarea, select, [role='button']")) {
    return false;
  }
  return true;
}
