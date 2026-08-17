import { z } from "zod";

import { percentRate } from "@/src/lib/partner/partnerCommissionTypes";

/** Raisons ledger qui comptent comme commission confirmée (pas payout). */
export const PERFORMANCE_ACCRUAL_REASONS = [
  "commission_accrual",
  "guest_commission_accrual",
] as const;

export const PARTNER_INVITATION_STATUSES = [
  "pending",
  "accepted",
  "expired",
  "revoked",
] as const;

export type PartnerInvitationStatus =
  (typeof PARTNER_INVITATION_STATUSES)[number];

export const PartnerMyPerformanceQuerySchema = z.object({
  tenantId: z.string().uuid(),
});

export const PartnerInvitationStatusSchema = z.enum(PARTNER_INVITATION_STATUSES);

export const PartnerMyPerformanceRowSchema = z
  .object({
    invitationId: z.string().uuid(),
    createdAt: z.string(),
    familyEmailMasked: z.string(),
    status: PartnerInvitationStatusSchema,
    attributedCents: z.number().int().nonnegative(),
  })
  .strict();

export const PartnerMyPerformanceKpisSchema = z
  .object({
    invitationsSent: z.number().int().nonnegative(),
    invitationsAccepted: z.number().int().nonnegative(),
    upsells: z.number().int().nonnegative(),
    attributedCents: z.number().int().nonnegative(),
    engagementRatePercent: z.number().int().min(0).max(100),
    conversionRatePercent: z.number().int().min(0).max(100),
    followUpCount: z.number().int().nonnegative(),
  })
  .strict();

export const PartnerMyPerformanceResponseSchema = z
  .object({
    tenantId: z.string().uuid(),
    kpis: PartnerMyPerformanceKpisSchema,
    rows: z.array(PartnerMyPerformanceRowSchema),
    followUp: z.array(PartnerMyPerformanceRowSchema),
  })
  .strict();

export type PartnerMyPerformanceRow = z.infer<
  typeof PartnerMyPerformanceRowSchema
>;
export type PartnerMyPerformanceKpis = z.infer<
  typeof PartnerMyPerformanceKpisSchema
>;
export type PartnerMyPerformanceResponse = z.infer<
  typeof PartnerMyPerformanceResponseSchema
>;

export const EMPTY_PERFORMANCE_KPIS: PartnerMyPerformanceKpis = {
  invitationsSent: 0,
  invitationsAccepted: 0,
  upsells: 0,
  attributedCents: 0,
  engagementRatePercent: 0,
  conversionRatePercent: 0,
  followUpCount: 0,
};

export type PartnerPerformanceInvitationInput = {
  id: string;
  invited_email: string;
  status: string;
  created_at: string;
};

export type PartnerPerformanceLedgerInput = {
  invitation_id: string | null;
  reason: string;
  status: string;
  commission_cents: number | null;
};

export function isPartnerInvitationStatus(
  value: string,
): value is PartnerInvitationStatus {
  return (PARTNER_INVITATION_STATUSES as readonly string[]).includes(value);
}

export function coerceInvitationStatus(raw: string): PartnerInvitationStatus {
  return isPartnerInvitationStatus(raw) ? raw : "pending";
}

/**
 * Masque l’email famille pour le conseiller : `j***@salon.com`.
 * Ne jamais renvoyer l’adresse en clair dans my-performance.
 */
export function maskFamilyEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return "***";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const first = local.charAt(0);
  if (!first || !domain) return "***";
  return `${first}***@${domain}`;
}

export function isConfirmedPerformanceAccrual(
  row: PartnerPerformanceLedgerInput,
): boolean {
  return (
    row.status === "confirmed" &&
    (PERFORMANCE_ACCRUAL_REASONS as readonly string[]).includes(row.reason)
  );
}

export function attributedCentsByInvitation(
  ledgerRows: PartnerPerformanceLedgerInput[],
): Map<string, number> {
  const byInvitation = new Map<string, number>();
  for (const row of ledgerRows) {
    if (!isConfirmedPerformanceAccrual(row) || !row.invitation_id) continue;
    const cents = Math.max(0, row.commission_cents ?? 0);
    byInvitation.set(
      row.invitation_id,
      (byInvitation.get(row.invitation_id) ?? 0) + cents,
    );
  }
  return byInvitation;
}

export function aggregateMyPerformance(
  invitations: PartnerPerformanceInvitationInput[],
  ledgerRows: PartnerPerformanceLedgerInput[],
  nowMs: number = Date.now(),
): PartnerMyPerformanceKpis {
  const attributed = attributedCentsByInvitation(ledgerRows);
  const invitationIds = new Set(invitations.map((row) => row.id));

  let attributedCents = 0;
  for (const [invitationId, cents] of attributed) {
    if (!invitationIds.has(invitationId)) continue;
    attributedCents += cents;
  }

  const upsellIds = new Set<string>();
  for (const row of ledgerRows) {
    if (
      row.status !== "confirmed" ||
      row.reason !== "commission_accrual" ||
      !row.invitation_id ||
      !invitationIds.has(row.invitation_id)
    ) {
      continue;
    }
    if ((row.commission_cents ?? 0) > 0) {
      upsellIds.add(row.invitation_id);
    }
  }

  const invitationsSent = invitations.length;
  const invitationsAccepted = invitations.filter(
    (row) => coerceInvitationStatus(row.status) === "accepted",
  ).length;
  const upsells = upsellIds.size;

  return {
    invitationsSent,
    invitationsAccepted,
    upsells,
    attributedCents,
    engagementRatePercent: percentRate(invitationsAccepted, invitationsSent),
    conversionRatePercent: percentRate(upsells, invitationsSent),
    followUpCount: listFollowUpInvitations(invitations, nowMs).length,
  };
}

export const PERFORMANCE_LIST_LIMIT = 50;
export const PERFORMANCE_INVITATION_CAP = 500;
export const FOLLOW_UP_AFTER_DAYS = 3;
export const FOLLOW_UP_LIST_LIMIT = 20;
const FOLLOW_UP_AFTER_MS = FOLLOW_UP_AFTER_DAYS * 24 * 60 * 60 * 1000;

export function isPendingDueForFollowUp(
  invitation: PartnerPerformanceInvitationInput,
  nowMs: number,
): boolean {
  if (coerceInvitationStatus(invitation.status) !== "pending") return false;
  const createdMs = Date.parse(invitation.created_at);
  if (!Number.isFinite(createdMs)) return false;
  return nowMs - createdMs >= FOLLOW_UP_AFTER_MS;
}

export function listFollowUpInvitations(
  invitations: PartnerPerformanceInvitationInput[],
  nowMs: number,
): PartnerPerformanceInvitationInput[] {
  return invitations
    .filter((invitation) => isPendingDueForFollowUp(invitation, nowMs))
    .sort(
      (left, right) =>
        Date.parse(left.created_at) - Date.parse(right.created_at),
    )
    .slice(0, FOLLOW_UP_LIST_LIMIT);
}
