import { coerceWizardState } from "@/src/lib/wizard/wizardState";

export type TributeNameFields = {
  firstName: string | null;
  lastName: string | null;
};

/**
 * Nom affiché Sanctuaire : essentials Wizard en priorité,
 * puis colonnes SQL `projects.first_name` / `last_name`.
 */
export function resolveTributeNames(project: {
  first_name?: string | null;
  last_name?: string | null;
  wizard_state?: unknown;
}): TributeNameFields {
  const essentials = coerceWizardState(project.wizard_state).essentials;
  const eFirst = essentials?.firstName?.trim() || null;
  const eLast = essentials?.lastName?.trim() || null;
  if (eFirst || eLast) {
    return { firstName: eFirst, lastName: eLast };
  }

  const cFirst = project.first_name?.trim() || null;
  const cLast = project.last_name?.trim() || null;
  return { firstName: cFirst, lastName: cLast };
}

export function formatTributeDisplayName(
  tribute: TributeNameFields,
  locale: "fr" | "en" = "fr",
): string {
  const parts = [tribute.firstName, tribute.lastName]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return locale === "en" ? "a loved one" : "un être cher";
}

/** Champs SQL à miroir depuis essentials (autosave). */
export function essentialsNameColumnsForSync(essentials: {
  firstName?: string;
  lastName?: string;
} | null | undefined): Partial<{ first_name: string; last_name: string }> {
  if (!essentials) return {};
  const out: Partial<{ first_name: string; last_name: string }> = {};
  const first = essentials.firstName?.trim();
  const last = essentials.lastName?.trim();
  if (first) out.first_name = first;
  if (last) out.last_name = last;
  return out;
}
