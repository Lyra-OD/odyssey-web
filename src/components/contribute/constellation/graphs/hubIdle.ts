/**
 * Chemin 1 — hub idle (étapes isolées).
 *
 * Pipeline Traversée (chaque étape se branche sans casser les autres) :
 *  1. `prologue.arrival`  — éclipse (stub skip · futur EclipseCraftPlay)
 *  2. `hub.skyApproach`   — HubSkyCamera 0→1 (plan test-ciel → Hero)
 *  3. `hub.heroAlive`     — KEEP + breath + invite Html (`hub.heroPulse`)
 *  4. `panel.*` / `ritual.reveal` — hors de ce fichier
 *
 * Ne mélange pas la timeline reveal A→F (`birth` / `drawPhase`).
 * Ne dépend pas du prologue éclipse.
 */

import { BIRTH_HERO_START, BIRTH_SEGMENTS, resolveBirth, type BirthPhases } from "@/src/components/contribute/constellation/graphs/birth";
import { easeOutCubic } from "@/src/components/contribute/constellation/graphs/reveal";

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

/**
 * Naissance hub — étoile d’abord (dolly), invite ensuite (bounce nom craft).
 * `approach` = progression HubSkyCamera 0→1.
 */
export function resolveHubBirth(approach: number): BirthPhases {
  const u = clamp01(approach);
  const heroU = clamp01((u - 0.05) / 0.58);
  /** Atteint C_END → heroKeep solide (breath idle). */
  const heroPhase = resolveBirth(
    BIRTH_HERO_START + heroU * (BIRTH_SEGMENTS.C_END - BIRTH_HERO_START),
  );
  const nameU = clamp01((u - 0.5) / 0.5);
  const namePhase = resolveBirth(
    0.02 + nameU * (BIRTH_SEGMENTS.B_END - 0.02),
  );

  if (u < 0.5) {
    return {
      ...heroPhase,
      nameBirth: 0,
      nameClarity: 0,
      nameLift: 0,
      nameScale: 0,
      nameTrack: 0,
      nameDriftX: 0,
      nameDriftY: 0,
      nameGlow: 0,
    };
  }

  return {
    ...heroPhase,
    nameBirth: namePhase.nameBirth,
    nameClarity: namePhase.nameClarity,
    nameLift: namePhase.nameLift,
    nameScale: namePhase.nameScale,
    nameTrack: namePhase.nameTrack,
    nameDriftX: namePhase.nameDriftX,
    nameDriftY: namePhase.nameDriftY,
    nameGlow: namePhase.nameGlow,
  };
}

/** Invite hub visible (tap hint suit ~0.72). */
export function hubPromptVisible(approach: number): boolean {
  return clamp01(approach) >= 0.48;
}

export function hubTapHintVisible(approach: number): boolean {
  return clamp01(approach) >= 0.72;
}

/**
 * `hub.heroPulse` — respiration KEEP une fois l’étoile posée.
 * Indépendant de `drawPhase.constellationBreath` (qui reste à 0 avant traits).
 * Amplitude visuelle = HeroStar `sizeBreath` (taille + glow), pas le soft craft seul.
 */
export function hubHeroBreath(approach: number): number {
  const u = clamp01(approach);
  if (u < 0.28) return 0;
  return easeOutCubic(Math.min(1, (u - 0.28) / 0.4));
}

/** Champ souris / bounce Hero↔invite — actif dès que l’étoile est lisible. */
export function hubProximityActive(approach: number): boolean {
  return clamp01(approach) >= 0.4;
}

/** Knobs breath un peu plus vifs au hub (KEEP size/glow inchangés). */
export const HUB_HERO_BREATH_SPEED = 1.15;

/**
 * T-invite-3 — souffle plus rapide **hub invite seulement** (hub lite / `hubPrompt`).
 * Ne pas brancher sur reveal, craft lab, ni thaw rituel.
 */
export const HUB_HERO_BREATH_SPEED_INVITE = 1.5;

/** Intensité pulse taille hub → HeroStar.sizeBreath (craft = 0). */
export const HUB_HERO_SIZE_BREATH = 1.15;
