/** Fin beats naissance A–C (`birth.ts` SEG.C_END). */
export const WIZARD_BIRTH_REVEAL_END = 0.57;

/** Hero KEEP en attente du prénom (juste avant traits). */
export const WIZARD_IDLE_REVEAL_T = 0.56;

/** Durée reveal constellation D→F post-validation étape 1. */
export const WIZARD_REWARD_REVEAL_MS = 3200;

/** ~8 caractères = naissance complète A–C. */
const NAME_CHARS_FOR_FULL_BIRTH = 8;

export function firstNameToBirthRevealT(firstName: string): number {
  const trimmed = firstName.trim();
  if (trimmed.length < 1) return WIZARD_IDLE_REVEAL_T;
  const progress = Math.min(1, trimmed.length / NAME_CHARS_FOR_FULL_BIRTH);
  return 0.02 + progress * (WIZARD_BIRTH_REVEAL_END - 0.02);
}

export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}
