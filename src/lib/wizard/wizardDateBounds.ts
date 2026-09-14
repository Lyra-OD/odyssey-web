/**
 * Bornes calendaires Essentiel (Étape 1) — timezone locale navigateur.
 * Naissance : ≤ hier. Départ : ≥ naissance, ≤ aujourd’hui + 2 ans (MAID).
 */

export const WIZARD_DATE_FLOOR = "1800-01-01";
export const WIZARD_DEATH_MAID_YEARS = 2;

export function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Max naissance = hier (pas aujourd’hui, pas futur). */
export function wizardBirthMaxISO(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return isoDateLocal(d);
}

/** Max départ = aujourd’hui + horizon MAID. */
export function wizardDeathMaxISO(now = new Date()): string {
  const d = new Date(
    now.getFullYear() + WIZARD_DEATH_MAID_YEARS,
    now.getMonth(),
    now.getDate(),
  );
  return isoDateLocal(d);
}

/** Min départ = naissance si saisie, sinon plancher. */
export function wizardDeathMinISO(birthDate: string): string {
  const trimmed = birthDate.trim();
  if (trimmed && trimmed >= WIZARD_DATE_FLOOR) return trimmed;
  return WIZARD_DATE_FLOOR;
}

export type EssentialsDateIssue =
  | "missing"
  | "birthTooRecent"
  | "deathBeforeBirth"
  | "deathTooFar";

export function essentialsBirthIssue(
  birthDate: string,
  now = new Date(),
): EssentialsDateIssue | null {
  if (!birthDate.trim()) return "missing";
  if (birthDate < WIZARD_DATE_FLOOR) return "missing";
  if (birthDate > wizardBirthMaxISO(now)) return "birthTooRecent";
  return null;
}

export function essentialsDeathIssue(
  birthDate: string,
  deathDate: string,
  now = new Date(),
): EssentialsDateIssue | null {
  if (!deathDate.trim()) return "missing";
  if (deathDate < WIZARD_DATE_FLOOR) return "missing";
  const birth = birthDate.trim();
  if (birth && deathDate < birth) return "deathBeforeBirth";
  if (deathDate > wizardDeathMaxISO(now)) return "deathTooFar";
  return null;
}
