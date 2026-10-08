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

/**
 * Échelle typo deck (titre > vision > corps).
 * Titre / vision : préfixer `editorialFont.className` (Playfair).
 * Corps / labels : Inter via `font-label`.
 */
export const DECK_TITLE_CLASS =
  "relative z-10 mt-6 text-center text-[clamp(1.5rem,3.6vw,3rem)] font-medium leading-[1.12] tracking-[0.01em] text-white md:mt-8";

export const DECK_VISION_CLASS =
  `relative z-10 mt-8 w-full max-w-[72rem] ${DECK_PHASE_CLASS} text-[clamp(1.35rem,2.7vw,1.85rem)] font-medium leading-[1.35] tracking-[0.01em] md:mt-10`;

/** Corps lecture — Inter light. */
export const DECK_BODY_CLASS =
  "font-label text-[clamp(1.1rem,1.5vw,1.35rem)] font-light leading-snug text-zinc-300";

/** Corps accent (foyer / emphasis) — même taille, medium. */
export const DECK_BODY_EMPHASIS_CLASS =
  "font-label text-[clamp(1.1rem,1.5vw,1.35rem)] font-medium leading-snug text-white/90";

/** Labels uppercase (WEDGE, Le salon…) — Inter semibold. */
export const DECK_LABEL_CLASS =
  "font-label text-[clamp(0.95rem,1.35vw,1.18rem)] font-semibold uppercase tracking-[0.24em] text-[var(--salon-cyan)]";

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

/** Indices Competition — titres puis beats labelisés (schéma Troie = plus tard) */
export const DECK_COMPETITION_STEP = {
  eyebrow: 0,
  hero: 1,
  phase: 2,
  beat0: 3,
  beat1: 4,
  beat2: 5,
  beat3: 6,
  beat4: 7,
} as const;

export const DECK_COMPETITION_LAST_STEP = DECK_COMPETITION_STEP.beat4;

export const DECK_COMPETITION_WAITS_S: readonly number[] = [
  0.9, // eyebrow → hero
  1.6, // hero → phase
  2.8, // phase → beat0
  2.4, // beat0 → beat1
  2.4, // beat1 → beat2
  2.4, // beat2 → beat3
  2.4, // beat3 → beat4
];

/** Indices Phases — titres puis corridor 01 — 02 — 03 */
export const DECK_PHASES_STEP = {
  eyebrow: 0,
  hero: 1,
  phase: 2,
  station0: 3,
  arc01: 4,
  station1: 5,
  arc12: 6,
  station2: 7,
} as const;

export const DECK_PHASES_LAST_STEP = DECK_PHASES_STEP.station2;

export const DECK_PHASES_WAITS_S: readonly number[] = [
  0.9, // eyebrow → hero
  1.6, // hero → phase
  2.8, // phase → station0
  1.1, // station0 → arc01
  1.8, // arc01 → station1
  1.1, // station1 → arc12
  1.8, // arc12 → station2
];

/** Indices Model — titres + diptyque forfaits | yield 22→43 */
export const DECK_MODEL_STEP = {
  eyebrow: 0,
  hero: 1,
  phase: 2,
  tiers: 3,
  economics: 4,
  yield: 5,
  arc: 6,
  viral: 7,
} as const;

export const DECK_MODEL_LAST_STEP = DECK_MODEL_STEP.viral;

export const DECK_MODEL_WAITS_S: readonly number[] = [
  0.9, // eyebrow → hero
  1.6, // hero → phase
  3.2, // phase (mécanisme) → forfaits
  2.2, // forfaits → économie
  2.2, // économie → yield 22
  1.2, // yield → arc
  2.0, // arc → viral 43
];

/** Indices Traction — titres + foyer Studio → Athos → satellites → courbe */
export const DECK_TRACTION_STEP = {
  eyebrow: 0,
  hero: 1,
  phase: 2,
  product: 3,
  hub: 4,
  sats: 5,
  validation: 6,
} as const;

export const DECK_TRACTION_LAST_STEP = DECK_TRACTION_STEP.validation;

export const DECK_TRACTION_WAITS_S: readonly number[] = [
  0.9, // eyebrow → hero
  1.6, // hero → phase
  2.6, // phase → Studio
  2.0, // Studio → planète Athos (soft-dock)
  1.8, // Athos → satellites (puis orbite après dock)
  2.4, // satellites → validation
];

/** Indices Team — titres → Erik → Jon → avantage déloyal */
export const DECK_TEAM_STEP = {
  eyebrow: 0,
  hero: 1,
  phase: 2,
  erik: 3,
  jon: 4,
  advantage: 5,
} as const;

export const DECK_TEAM_LAST_STEP = DECK_TEAM_STEP.advantage;

export const DECK_TEAM_WAITS_S: readonly number[] = [
  0.9, // eyebrow → hero
  1.6, // hero → phase
  2.6, // phase → Erik
  1.8, // Erik → Jon
  2.2, // Jon → avantage
];

/** Indices Ask — titres + corridor 01–03 + coda 90 j / limite */
export const DECK_ASK_STEP = {
  eyebrow: 0,
  hero: 1,
  phase: 2,
  station0: 3,
  arc01: 4,
  station1: 5,
  arc12: 6,
  station2: 7,
  risk: 8,
  limit: 9,
} as const;

export const DECK_ASK_LAST_STEP = DECK_ASK_STEP.limit;

export const DECK_ASK_WAITS_S: readonly number[] = [
  0.9, // eyebrow → hero
  1.6, // hero → phase
  2.6, // phase → 01 Réseau
  1.1, // 01 → arc
  1.6, // arc → 02 Terrain
  1.1, // 02 → arc
  1.6, // arc → 03 Lyra
  2.0, // 03 → 90 jours
  2.0, // 90 j → limite Marketplace
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
