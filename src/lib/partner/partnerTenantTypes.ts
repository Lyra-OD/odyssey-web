import { z } from "zod";

import { PARTNER_MEMBER_ROLES } from "@/src/lib/partner/partnerRoles";

export const PartnerMemberRoleSchema = z.enum(PARTNER_MEMBER_ROLES);

export const PartnerCapabilitiesSchema = z
  .object({
    canInvite: z.boolean(),
    canViewBalance: z.boolean(),
    canViewLedger: z.boolean(),
    canRecharge: z.boolean(),
  })
  .strict();

export type PartnerCapabilities = z.infer<typeof PartnerCapabilitiesSchema>;

export const PartnerTenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string().optional(),
  brandLabel: z.string().optional(),
  logoUrl: z.string().url().nullable().optional(),
  isFreemium: z.boolean(),
  role: PartnerMemberRoleSchema,
  capabilities: PartnerCapabilitiesSchema,
});

export type PartnerTenant = z.infer<typeof PartnerTenantSchema>;

export const PartnerTenantsResponseSchema = z
  .object({
    tenants: z.array(PartnerTenantSchema),
  })
  .strict();

export type PartnerTenantsResponse = z.infer<typeof PartnerTenantsResponseSchema>;
