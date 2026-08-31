/** Fin beats naissance A–C (`birth.ts` SEG.C_END). */
export const WIZARD_BIRTH_REVEAL_END = 0.57;

/** Hero KEEP en attente du prénom (juste avant traits). */
export const WIZARD_IDLE_REVEAL_T = 0.56;

/**
 * Durée play Continuer = même timeline craft lab (`DEFAULT_CONSTELLATION_REVEAL_MS`).
 * revealT 0→1 (naissance A–C + traits D–F), pas un raccourci depuis idle 0.56.
 */
export { DEFAULT_CONSTELLATION_REVEAL_MS as WIZARD_REWARD_REVEAL_MS } from "@/src/components/contribute/constellation/graphs/reveal";

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
