import "server-only";

import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";
import {
  normalizeBasePackageId,
  packageTierRank,
} from "@/src/lib/wizard/pricingConfig";
import type { SupabaseClient } from "@supabase/supabase-js";

export type InvitationGrantedLookup =
  | { ok: true; grantedPackage: WizardBasePackage }
  | { ok: false; reason: "not_found" | "invalid_granted" | "lookup_failed" };

/**
 * Source de vérité B2B2C : `partner_invitations.granted_package`.
 * Fail-closed si invitation absente ou package invalide.
 */
export async function loadInvitationGrantedPackage(
  admin: SupabaseClient,
  invitationId: string,
): Promise<InvitationGrantedLookup> {
  const { data, error } = await admin
    .from("partner_invitations")
    .select("granted_package")
    .eq("id", invitationId)
    .maybeSingle();

  if (error) {
    console.error("[b2b2cPackageAuthority] invitation lookup:", error.message);
    return { ok: false, reason: "lookup_failed" };
  }

  if (!data?.granted_package) {
    return { ok: false, reason: "not_found" };
  }

  try {
    return {
      ok: true,
      grantedPackage: normalizeBasePackageId(String(data.granted_package)),
    };
  } catch {
    return { ok: false, reason: "invalid_granted" };
  }
}

/**
 * `intendedPackage` persisté (package-intent / redeem / checkout) — jamais en
 * dessous du grant invitation. Ignoré pour freemium_free (forcé = granted).
 */
export function resolveB2b2cIntendedPackage(params: {
  grantedPackage: WizardBasePackage;
  persistedIntended: unknown;
  forFreemiumFree?: boolean;
}): WizardBasePackage {
  if (params.forFreemiumFree) {
    return params.grantedPackage;
  }

  let intended: WizardBasePackage;
  try {
    intended = normalizeBasePackageId(
      typeof params.persistedIntended === "string"
        ? params.persistedIntended
        : params.grantedPackage,
    );
  } catch {
    intended = params.grantedPackage;
  }

  if (packageTierRank(intended) < packageTierRank(params.grantedPackage)) {
    return params.grantedPackage;
  }

  return intended;
}

export function assertIntendedNotBelowGrant(
  grantedPackage: WizardBasePackage,
  intendedPackage: WizardBasePackage,
): boolean {
  return packageTierRank(intendedPackage) >= packageTierRank(grantedPackage);
}
