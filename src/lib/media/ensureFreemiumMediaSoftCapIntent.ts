import type { SupabaseClient } from "@supabase/supabase-js";

import { packageTierRank } from "@/src/lib/wizard/pricingConfig";

/**
 * Soft Cap médias (infra) : si cadeau freemium et ≥50 médias familiaux,
 * bascule `intendedPackage` → signature **avant** l'insert (quota P8).
 * Nécessaire pour le Co-Créateur et le Scanner (pas d'autosave pricing).
 */
export async function ensureFreemiumMediaSoftCapIntent(
  admin: SupabaseClient,
  projectId: string,
): Promise<void> {
  const { data: project } = await admin
    .from("projects")
    .select("wizard_state")
    .eq("id", projectId)
    .maybeSingle();

  const state =
    project?.wizard_state &&
    typeof project.wizard_state === "object" &&
    !Array.isArray(project.wizard_state)
      ? (project.wizard_state as Record<string, unknown>)
      : null;
  if (!state) return;

  const grantedRaw =
    (typeof state.grantedPackage === "string" && state.grantedPackage) ||
    (typeof state.basePackage === "string" && state.basePackage) ||
    "essential";
  const intendedRaw =
    (typeof state.intendedPackage === "string" && state.intendedPackage) ||
    (typeof state.basePackage === "string" && state.basePackage) ||
    grantedRaw;

  const granted = grantedRaw as
    | "essential"
    | "signature"
    | "heritage"
    | "legendary";
  const intended = intendedRaw as typeof granted;

  if (packageTierRank(granted) !== 0) return;
  if (packageTierRank(intended) > 0) return;

  const { count } = await admin
    .from("media_assets")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .or("contributor_type.is.null,contributor_type.neq.guest");

  // Bump dès 50 existants : le prochain insert serait le 51ᵉ.
  if ((count ?? 0) < 50) return;

  const nextState = {
    ...state,
    intendedPackage: "signature",
    basePackage: "signature",
  };

  await admin
    .from("projects")
    .update({
      wizard_state: nextState,
      last_saved_at: new Date().toISOString(),
    })
    .eq("id", projectId);
}
