import {
  isPartnerMemberRole,
  type PartnerMemberRole,
} from "@/src/lib/partner/partnerRoles";

export type PartnerCapabilityKey =
  | "canInvite"
  | "canViewBalance"
  | "canViewLedger"
  | "canRecharge";

export type PartnerCapabilities = Record<PartnerCapabilityKey, boolean>;

const PARTNER_CAPABILITIES: Record<PartnerMemberRole, PartnerCapabilities> = {
  partner: {
    canInvite: true,
    canViewBalance: false,
    canViewLedger: false,
    canRecharge: false,
  },
  partner_admin: {
    canInvite: true,
    canViewBalance: true,
    canViewLedger: true,
    canRecharge: true,
  },
};

/**
 * RBAC capabilities for a Salon tenant role (`partner` = Director, `partner_admin` = Admin).
 * Returns `null` if the role is not a recognized Salon member role.
 */
export function getPartnerCapabilities(role: string): PartnerCapabilities | null {
  if (!isPartnerMemberRole(role)) {
    return null;
  }
  return PARTNER_CAPABILITIES[role];
}

export function partnerHasCapability(
  role: string,
  capability: PartnerCapabilityKey,
): boolean {
  const capabilities = getPartnerCapabilities(role);
  return capabilities?.[capability] ?? false;
}

export type PartnerCapabilityDeniedResult = {
  ok: false;
  error: "forbidden";
  message: string;
  capability: PartnerCapabilityKey;
};

/**
 * Checks a capability for an already-resolved tenant role.
 */
export function assertPartnerCapability(
  role: string,
  capability: PartnerCapabilityKey,
): { ok: true } | PartnerCapabilityDeniedResult {
  if (partnerHasCapability(role, capability)) {
    return { ok: true };
  }

  return {
    ok: false,
    error: "forbidden",
    capability,
    message: `Capability "${capability}" required for this tenant.`,
  };
}
