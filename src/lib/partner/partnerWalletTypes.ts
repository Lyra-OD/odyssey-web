import { z } from "zod";

import { PartnerCapabilitiesSchema } from "@/src/lib/partner/partnerTenantTypes";

export const PartnerWalletQuerySchema = z.object({
  tenantId: z.string().uuid(),
});

export const PartnerWalletResponseSchema = z
  .object({
    tenantId: z.string().uuid(),
    balance: z.number().int(),
    creditLimitTokens: z.number().int(),
    capabilities: PartnerCapabilitiesSchema,
  })
  .strict();

export type PartnerWalletResponse = z.infer<typeof PartnerWalletResponseSchema>;
