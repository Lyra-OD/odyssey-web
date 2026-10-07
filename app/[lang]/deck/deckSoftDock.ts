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

/**
 * Sous-titre / vision / `phase` — teal continu (même ADN lignes + labels).
 * Pas de mauve ponctuel.
 */
export const DECK_PHASE_CLASS =
  "text-[var(--salon-cyan)] [text-shadow:none] [filter:none]";

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

/** Indices Need — triangle 1→2→3→1 puis convergence → pont */
export const DECK_NEED_STEP = {
  eyebrow: 0,
  hero: 1,
  phase: 2,
  node0: 3,
  line01: 4,
  node1: 5,
  line12: 6,
  node2: 7,
  line20: 8,
  converge: 9,
} as const;

export const DECK_NEED_LAST_STEP = DECK_NEED_STEP.converge;

/**
 * Attentes auto *après* chaque step (s).
 * Assez pour lire ; plus court sans clic. Clic = saute.
 */
export const DECK_NEED_WAITS_S: readonly number[] = [
  0.9, // eyebrow → hero
  1.6, // hero → phase
  3.2, // phase → node0
  4.2, // node0 lire → line01
  1.5, // line01 courant → node1
  4.2, // node1 lire → line12
  1.5, // line12 → node2
  4.2, // node2 lire → line20
  1.5, // line20 → converge
];

/** Indices Solution — 3 faisceaux → foyer */
export const DECK_SOLUTION_STEP = {
  eyebrow: 0,
  hero: 1,
  phase: 2,
  node0: 3,
  beam0: 4,
  node1: 5,
  beam1: 6,
  node2: 7,
  beam2: 8,
  focus: 9,
  coda: 10,
} as const;

export const DECK_SOLUTION_LAST_STEP = DECK_SOLUTION_STEP.coda;

export const DECK_SOLUTION_WAITS_S: readonly number[] = [
  0.9, // eyebrow → hero
  1.6, // hero → phase
  3.0, // phase → node0
  3.8, // node0 lire → beam0
  1.4, // beam0 → node1
  3.8, // node1 lire → beam1
  1.4, // beam1 → node2
  3.8, // node2 lire → beam2
  1.4, // beam2 → focus
  2.8, // focus → coda
];

/** Indices Ecosystem — Salon → corps → Familles → corps → canal → sat + comportement */
export const DECK_ECOSYSTEM_STEP = {
  eyebrow: 0,
  hero: 1,
  phase: 2,
  pole0: 3,
  body0: 4,
  pole1: 5,
  body1: 6,
  arc: 7,
  spark: 8,
} as const;

export const DECK_ECOSYSTEM_LAST_STEP = DECK_ECOSYSTEM_STEP.spark;

export const DECK_ECOSYSTEM_WAITS_S: readonly number[] = [
  0.9, // eyebrow → hero
  1.6, // hero → phase
  2.4, // phase → planète salon
  1.2, // salon → corps salon
  3.6, // lire corps → planète familles
  1.2, // familles → corps familles
  3.6, // lire corps → canal
  1.6, // canal / orbite → satellite + comportement
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
