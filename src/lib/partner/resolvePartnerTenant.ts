import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { resolvePartnerMembership } from "@/src/lib/partner/resolvePartnerMembership";

export type PartnerTenantAccessResult =
  | { ok: true; role: string }
  | {
      ok: false;
      error: "forbidden" | "not_found";
      message: string;
    };

/**
 * @deprecated Prefer `resolvePartnerMembership()` for role + capabilities in one call.
 * Verifies the user is a Salon member (`partner` or `partner_admin`) on the tenant.
 */
export async function assertPartnerTenantAccess(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
): Promise<PartnerTenantAccessResult> {
  const result = await resolvePartnerMembership(supabase, userId, tenantId);

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      message: result.message,
    };
  }

  return { ok: true, role: result.role };
}
