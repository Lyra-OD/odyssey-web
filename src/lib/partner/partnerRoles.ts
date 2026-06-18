/** Salon tenant roles on `tenant_members` (Director vs Admin). */
export const PARTNER_MEMBER_ROLES = ["partner", "partner_admin"] as const;

export type PartnerMemberRole = (typeof PARTNER_MEMBER_ROLES)[number];

export const PARTNER_MEMBER_ROLE_SET: ReadonlySet<string> = new Set(
  PARTNER_MEMBER_ROLES,
);

/** Includes platform `admin` for coarse B2B detection (checkout), not Salon RBAC. */
export const PARTNER_PLATFORM_ACCESS_ROLES = [
  ...PARTNER_MEMBER_ROLES,
  "admin",
] as const;

export type PartnerPlatformAccessRole =
  (typeof PARTNER_PLATFORM_ACCESS_ROLES)[number];

export const PARTNER_PLATFORM_ACCESS_ROLE_SET: ReadonlySet<string> = new Set(
  PARTNER_PLATFORM_ACCESS_ROLES,
);

export function isPartnerMemberRole(role: string): role is PartnerMemberRole {
  return PARTNER_MEMBER_ROLE_SET.has(role);
}

export function isPartnerPlatformAccessRole(
  role: string,
): role is PartnerPlatformAccessRole {
  return PARTNER_PLATFORM_ACCESS_ROLE_SET.has(role);
}
