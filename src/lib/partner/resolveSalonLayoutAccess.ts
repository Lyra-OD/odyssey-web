import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchPartnerTenantsForUser } from "@/src/lib/partner/fetchPartnerTenantsForUser";
import { resolvePartnerMembership } from "@/src/lib/partner/resolvePartnerMembership";
import type { PartnerTenant } from "@/src/lib/partner/partnerTenantTypes";

export type SalonLayoutAccessResult =
  | { ok: true; partnerTenants: PartnerTenant[] }
  | { ok: false; reason: "no_partner_tenants" | "membership_denied" };

/**
 * Server gate for `/salon` layout: user must hold a valid partner role on at least one tenant.
 * Active tenant selection stays client-side; per-tenant checks run in partner APIs.
 */
export async function resolveSalonLayoutAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<SalonLayoutAccessResult> {
  const partnerTenants = await fetchPartnerTenantsForUser(supabase, userId);
  if (partnerTenants.length === 0) {
    return { ok: false, reason: "no_partner_tenants" };
  }

  for (const tenant of partnerTenants) {
    const membership = await resolvePartnerMembership(
      supabase,
      userId,
      tenant.id,
    );
    if (membership.ok) {
      return { ok: true, partnerTenants };
    }
  }

  return { ok: false, reason: "membership_denied" };
}
