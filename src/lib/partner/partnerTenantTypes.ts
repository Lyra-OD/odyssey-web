import { z } from "zod";

export const PartnerTenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string().optional(),
});

export type PartnerTenant = z.infer<typeof PartnerTenantSchema>;

export const PartnerTenantsResponseSchema = z
  .object({
    tenants: z.array(PartnerTenantSchema),
  })
  .strict();

export type PartnerTenantsResponse = z.infer<typeof PartnerTenantsResponseSchema>;
