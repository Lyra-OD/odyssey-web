import { BIRTH_SEGMENTS } from "@/src/components/contribute/constellation/graphs/birth";

/** Fin beats naissance A–C (`birth.ts` SEG.C_END). */
export const WIZARD_BIRTH_REVEAL_END = BIRTH_SEGMENTS.C_END;

/** Hero KEEP en attente du prénom (juste avant traits). */
export const WIZARD_IDLE_REVEAL_T = 0.56;

/**
 * Durée play Continuer wizard — découplée du craft lab (14 s).
 * Horloge non linéaire : plus de temps sur le nuage / la naissance ; traits pas compressés.
 */
export const WIZARD_REWARD_REVEAL_MS = 10000;

/**
 * Wall 0→1 → revealT 0→1. Wizard seulement (le lab reste linéaire 14 s).
 * ~6.5 s nom+nuage · ~1.5 s fin Hero · ~2 s traits.
 */
export function mapWizardRewardWallToRevealT(wallU: number): number {
  const u = Math.min(1, Math.max(0, wallU));
  const nameEnd = BIRTH_SEGMENTS.B_END;
  const birthEnd = BIRTH_SEGMENTS.C_END;
  /** Fractions d’horloge (doivent sommer à 1). */
  const WALL_NAME = 0.65;
  const WALL_HERO = 0.15;
  const WALL_STROKES = 0.2;
  if (u <= WALL_NAME) {
    return (u / WALL_NAME) * nameEnd;
  }
  if (u <= WALL_NAME + WALL_HERO) {
    const v = (u - WALL_NAME) / WALL_HERO;
    return nameEnd + v * (birthEnd - nameEnd);
  }
  const v = (u - WALL_NAME - WALL_HERO) / WALL_STROKES;
  return birthEnd + v * (1 - birthEnd);
}

/** Pause admiration après constellation complète, avant étape 2. */
export const WIZARD_REWARD_DWELL_MS = 3500;

/** ~8 caractères = naissance complète A–C. */
const NAME_CHARS_FOR_FULL_BIRTH = 8;

export function firstNameToBirthRevealT(firstName: string): number {
  const trimmed = firstName.trim();
  if (trimmed.length < 1) return WIZARD_IDLE_REVEAL_T;
  const progress = Math.min(1, trimmed.length / NAME_CHARS_FOR_FULL_BIRTH);
  return 0.02 + progress * (WIZARD_BIRTH_REVEAL_END - 0.02);
}

/** Vide → 1er caractère : snap (évite lerp idle 0.56 → ~0.09 = rewind). */
export function shouldSnapBirthRevealFromIdle(
  prevTrimmedLen: number,
  nextTrimmedLen: number,
): boolean {
  return prevTrimmedLen < 1 && nextTrimmedLen >= 1;
}

/** Effacement total : snap retour idle KEEP. */
export function shouldSnapBirthRevealToIdle(
  prevTrimmedLen: number,
  nextTrimmedLen: number,
): boolean {
  return prevTrimmedLen >= 1 && nextTrimmedLen < 1;
}

export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}
