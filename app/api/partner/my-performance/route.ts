import { NextResponse } from "next/server";

import {
  PARTNER_API_ERROR,
  partnerApiErrorResponse,
} from "@/src/lib/partner/partnerApiErrors";
import {
  PERFORMANCE_ACCRUAL_REASONS,
  PERFORMANCE_INVITATION_CAP,
  PERFORMANCE_LIST_LIMIT,
  PartnerMyPerformanceQuerySchema,
  aggregateMyPerformance,
  attributedCentsByInvitation,
  coerceInvitationStatus,
  listFollowUpInvitations,
  maskFamilyEmail,
  type PartnerMyPerformanceRow,
  type PartnerPerformanceInvitationInput,
  type PartnerPerformanceLedgerInput,
} from "@/src/lib/partner/partnerPerformance";
import { resolvePartnerMembership } from "@/src/lib/partner/resolvePartnerMembership";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const LEDGER_IN_CHUNK = 100;

type InvitationRowRaw = {
  id: string;
  invited_email: string;
  status: string;
  created_at: string;
};

type LedgerRowRaw = {
  invitation_id: string | null;
  reason: string;
  status: string;
  commission_cents: number | null;
};

async function fetchConfirmedAccruals(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  tenantId: string,
  invitationIds: string[],
): Promise<PartnerPerformanceLedgerInput[]> {
  const rows: PartnerPerformanceLedgerInput[] = [];

  for (let offset = 0; offset < invitationIds.length; offset += LEDGER_IN_CHUNK) {
    const chunk = invitationIds.slice(offset, offset + LEDGER_IN_CHUNK);
    const { data } = await admin
      .from("partner_commission_ledger")
      .select("invitation_id, reason, status, commission_cents")
      .eq("tenant_id", tenantId)
      .in("invitation_id", chunk)
      .in("reason", [...PERFORMANCE_ACCRUAL_REASONS])
      .eq("status", "confirmed");

    for (const row of (data ?? []) as LedgerRowRaw[]) {
      rows.push({
        invitation_id: row.invitation_id,
        reason: row.reason,
        status: row.status,
        commission_cents: row.commission_cents,
      });
    }
  }

  return rows;
}

/**
 * GET /api/partner/my-performance?tenantId=<uuid>
 * Scoreboard du conseiller connecté (ses invitations). Pas le solde salon.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = PartnerMyPerformanceQuerySchema.safeParse({
    tenantId: searchParams.get("tenantId"),
  });

  if (!parsedQuery.success) {
    return partnerApiErrorResponse(PARTNER_API_ERROR.INVALID_TENANT, 400);
  }

  const { tenantId } = parsedQuery.data;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return partnerApiErrorResponse(PARTNER_API_ERROR.UNAUTHENTICATED, 401);
  }

  const membership = await resolvePartnerMembership(
    supabase,
    user.id,
    tenantId,
    { requiredCapability: "canInvite" },
  );

  if (!membership.ok) {
    return partnerApiErrorResponse(PARTNER_API_ERROR.FORBIDDEN, 403);
  }

  let admin;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return partnerApiErrorResponse(PARTNER_API_ERROR.INTERNAL, 500);
  }

  const { data: invitationRaw } = await admin
    .from("partner_invitations")
    .select("id, invited_email, status, created_at")
    .eq("tenant_id", tenantId)
    .eq("invited_by_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(PERFORMANCE_INVITATION_CAP);

  const invitations: PartnerPerformanceInvitationInput[] = (
    (invitationRaw ?? []) as InvitationRowRaw[]
  ).map((row) => ({
    id: row.id,
    invited_email: row.invited_email,
    status: row.status,
    created_at: row.created_at,
  }));

  const invitationIds = invitations.map((row) => row.id);
  const ledgerRows =
    invitationIds.length > 0
      ? await fetchConfirmedAccruals(admin, tenantId, invitationIds)
      : [];

  const kpis = aggregateMyPerformance(invitations, ledgerRows);
  const attributed = attributedCentsByInvitation(ledgerRows);

  const toRow = (
    invitation: PartnerPerformanceInvitationInput,
  ): PartnerMyPerformanceRow => ({
    invitationId: invitation.id,
    createdAt: invitation.created_at,
    familyEmailMasked: maskFamilyEmail(invitation.invited_email),
    status: coerceInvitationStatus(invitation.status),
    attributedCents: attributed.get(invitation.id) ?? 0,
  });

  const rows: PartnerMyPerformanceRow[] = invitations
    .slice(0, PERFORMANCE_LIST_LIMIT)
    .map(toRow);

  const followUp: PartnerMyPerformanceRow[] = listFollowUpInvitations(
    invitations,
    Date.now(),
  ).map(toRow);

  return NextResponse.json({
    tenantId,
    kpis,
    rows,
    followUp,
  });
}
