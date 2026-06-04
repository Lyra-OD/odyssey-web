import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const PARTNER_ROLES = new Set(["partner", "partner_admin", "admin"]);

/**
 * Détermine si l'utilisateur appartient à un tenant partenaire (B2B).
 */
export async function resolveUserIsPartner(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data: memberships, error } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    console.warn("[resolvePartnerAccess] tenant_members lookup failed:", error.message);
    return false;
  }

  return Boolean(
    memberships?.some((row) => PARTNER_ROLES.has(String(row.role))),
  );
}
