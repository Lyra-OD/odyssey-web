/** Champs monétisation — jamais modifiables par PATCH autosave owner. */
export const OWNER_MONETIZATION_WIZARD_KEYS = [
  "grantedPackage",
  "intendedPackage",
  "basePackage",
  "pricing",
] as const;

export type OwnerMonetizationWizardKey =
  (typeof OWNER_MONETIZATION_WIZARD_KEYS)[number];

/**
 * Retire silencieusement les clés monétisation d'un patch autosave owner.
 * Le checkout et `POST /package-intent` sont les seules voies serveur.
 */
export function stripOwnerMonetizationFields(
  patch: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!patch) return undefined;

  const next = { ...patch };
  for (const key of OWNER_MONETIZATION_WIZARD_KEYS) {
    delete next[key];
  }

  return Object.keys(next).length > 0 ? next : undefined;
}
