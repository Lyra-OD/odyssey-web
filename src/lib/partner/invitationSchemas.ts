import { z } from "zod";

export const LegacyGrantedPackageSchema = z.enum([
  "essential",
  "signature",
  "heritage",
]);

export type LegacyGrantedPackage = z.infer<typeof LegacyGrantedPackageSchema>;

export const CreatePartnerInvitationBodySchema = z
  .object({
    familyEmail: z
      .string()
      .trim()
      .min(3)
      .max(320)
      .email({ message: "invalid_email" })
      .transform((value) => value.toLowerCase()),
    grantedPackage: LegacyGrantedPackageSchema,
    tenantId: z.string().uuid({ message: "invalid_tenant_id" }),
  })
  .strict();

export type CreatePartnerInvitationBody = z.infer<
  typeof CreatePartnerInvitationBodySchema
>;

export const INVITATION_TTL_DAYS = 14;

/** Réponse succès `POST /api/partner/invitations`. */
export const CreatePartnerInvitationResponseSchema = z
  .object({
    invitationId: z.string().uuid(),
    status: z.string(),
    magicLinkUrl: z.string().url(),
    expiresAt: z.string(),
    grantedPackage: LegacyGrantedPackageSchema,
  })
  .strict();

export type CreatePartnerInvitationResponse = z.infer<
  typeof CreatePartnerInvitationResponseSchema
>;
