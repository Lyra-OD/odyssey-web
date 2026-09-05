import {
  BIRTH_NAME_MIST_END,
  BIRTH_SEGMENTS,
} from "@/src/components/contribute/constellation/graphs/birth";

/** Fin beats naissance A–C (`birth.ts` SEG.C_END). */
export const WIZARD_BIRTH_REVEAL_END = BIRTH_SEGMENTS.C_END;

/** Hero KEEP en attente du prénom (juste avant traits). */
export const WIZARD_IDLE_REVEAL_T = 0.56;

/** Play linéaire d’avant — hold, étoile, traits (pas la brume). */
const WIZARD_LEGACY_LINEAR_MS = 14500;
/** Brume du nom seule (~2,4 s à 8 s linéaires → ici plus lente). */
const WIZARD_NAME_MIST_MS = 4400;

/**
 * Durée play Continuer wizard — découplée du craft lab (14 s).
 * Brume étirée ; ensuite même rythme que le play 8 s linéaire.
 */
export const WIZARD_REWARD_REVEAL_MS =
  WIZARD_NAME_MIST_MS +
  WIZARD_LEGACY_LINEAR_MS * (1 - BIRTH_NAME_MIST_END);

/**
 * Wall 0→1 → revealT 0→1. Wizard seulement (le lab reste linéaire 14 s).
 * ~4,4 s brume jusqu’au mot lisible · ensuite hold + Hero + traits au rythme 8 s.
 */
export function mapWizardRewardWallToRevealT(wallU: number): number {
  const u = Math.min(1, Math.max(0, wallU));
  const mistEnd = BIRTH_NAME_MIST_END;
  const wallMist = WIZARD_NAME_MIST_MS / WIZARD_REWARD_REVEAL_MS;
  if (u <= wallMist) {
    return (u / Math.max(1e-6, wallMist)) * mistEnd;
  }
  const v = (u - wallMist) / Math.max(1e-6, 1 - wallMist);
  return mistEnd + v * (1 - mistEnd);
}

/** Pause admiration après constellation complète, avant carte J3 / suite. */
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
