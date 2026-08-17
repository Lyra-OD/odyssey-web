import { z } from "zod";

import { PartnerCapabilitiesSchema } from "@/src/lib/partner/partnerTenantTypes";

export const PartnerWalletQuerySchema = z.object({
  tenantId: z.string().uuid(),
});

/** @deprecated UI = GET /api/partner/commissions. Conservé pour compat. */
export const PartnerWalletResponseSchema = z
  .object({
    tenantId: z.string().uuid(),
    balance: z.number().int(),
    creditLimitTokens: z.number().int(),
    capabilities: PartnerCapabilitiesSchema,
    deprecated: z.boolean().optional(),
    model: z.string().optional(),
    commissions: z
      .object({
        accruedCents: z.number().int(),
        pendingCents: z.number().int(),
        paidCents: z.number().int(),
      })
      .optional(),
  })
  .strict();

export type PartnerWalletResponse = z.infer<typeof PartnerWalletResponseSchema>;
