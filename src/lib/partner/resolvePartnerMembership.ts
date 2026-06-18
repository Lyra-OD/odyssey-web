import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getPartnerCapabilities,
  partnerHasCapability,
  type PartnerCapabilities,
  type PartnerCapabilityKey,
} from "@/src/lib/partner/partnerCapabilities";
import {
  isPartnerMemberRole,
  type PartnerMemberRole,
} from "@/src/lib/partner/partnerRoles";

export type ResolvePartnerMembershipOptions = {
  requiredCapability?: PartnerCapabilityKey;
};

export type PartnerMembershipSuccess = {
  ok: true;
  role: PartnerMemberRole;
  capabilities: PartnerCapabilities;
};

export type PartnerMembershipFailure = {
  ok: false;
  error: "forbidden" | "not_found";
  message: string;
  capability?: PartnerCapabilityKey;
};

export type PartnerMembershipResult =
  | PartnerMembershipSuccess
  | PartnerMembershipFailure;

/**
 * Resolves Salon tenant membership: role + capabilities (+ optional capability gate).
 * Replaces stacked `assertPartnerTenantAccess` + `assertPartnerCapability` calls.
 */
export async function resolvePartnerMembership(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  options: ResolvePartnerMembershipOptions = {},
): Promise<PartnerMembershipResult> {
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

  const rawRole = membership?.role ? String(membership.role) : null;

  if (!rawRole || !isPartnerMemberRole(rawRole)) {
    return {
      ok: false,
      error: "forbidden",
      message: "Partner access required for this tenant.",
    };
  }

  const capabilities = getPartnerCapabilities(rawRole);
  if (!capabilities) {
    return {
      ok: false,
      error: "forbidden",
      message: "Partner access required for this tenant.",
    };
  }

  const { requiredCapability } = options;
  if (
    requiredCapability &&
    !partnerHasCapability(rawRole, requiredCapability)
  ) {
    return {
      ok: false,
      error: "forbidden",
      message: `Capability "${requiredCapability}" required for this tenant.`,
      capability: requiredCapability,
    };
  }

  return {
    ok: true,
    role: rawRole,
    capabilities,
  };
}
