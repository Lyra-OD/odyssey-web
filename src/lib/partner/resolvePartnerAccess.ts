import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isPartnerPlatformAccessRole } from "@/src/lib/partner/partnerRoles";

/**
 * Coarse check: user belongs to any partner-capable tenant membership (includes platform `admin`).
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
    memberships?.some((row) =>
      isPartnerPlatformAccessRole(String(row.role)),
    ),
  );
}
