import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const PARTNER_INSERT_ROLES = new Set(["partner", "partner_admin"]);

export type PartnerTenantAccessResult =
  | { ok: true; role: string }
  | {
      ok: false;
      error: "forbidden" | "not_found";
      message: string;
    };

/**
 * Vérifie que l'utilisateur peut agir pour le tenant (RLS INSERT invitations).
 * Seuls `partner` et `partner_admin` — pas `admin` plateforme sans membership.
 */
export async function assertPartnerTenantAccess(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
): Promise<PartnerTenantAccessResult> {
  const { data: membership, error } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: "not_found",
      message: error.message,
    };
  }

  if (!membership?.role || !PARTNER_INSERT_ROLES.has(String(membership.role))) {
    return {
      ok: false,
      error: "forbidden",
      message: "Accès partenaire requis pour ce tenant.",
    };
  }

  return { ok: true, role: String(membership.role) };
}
