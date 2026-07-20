/**
 * @deprecated Freemium V1 — utiliser `createPartnerInvitation` (sans débit).
 * Conservé pour imports legacy ; délègue au nouveau module.
 */
export {
  createPartnerInvitation as createPartnerInvitationWithDebit,
  type CreatePartnerInvitationParams as CreatePartnerInvitationWithDebitParams,
  type CreatePartnerInvitationResult as CreatePartnerInvitationWithDebitResult,
  type CreatePartnerInvitationSuccess as CreatePartnerInvitationWithDebitSuccess,
  type CreatePartnerInvitationFailure as CreatePartnerInvitationWithDebitFailure,
} from "@/src/lib/partner/createPartnerInvitation";
