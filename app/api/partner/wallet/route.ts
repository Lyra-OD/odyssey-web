import { NextResponse } from "next/server";

import {
  PARTNER_API_ERROR,
  partnerApiErrorResponse,
} from "@/src/lib/partner/partnerApiErrors";
import { PartnerWalletQuerySchema } from "@/src/lib/partner/partnerWalletTypes";
import { resolvePartnerMembership } from "@/src/lib/partner/resolvePartnerMembership";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

/**
 * GET /api/partner/wallet?tenantId=<uuid>
 * Freemium V1 : wallets jetons purged — renvoie un snapshot déprécié (0)
 * + soldes commissions si disponibles (Phase 3 UI complète plus tard).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = PartnerWalletQuerySchema.safeParse({
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
    { requiredCapability: "canViewBalance" },
  );

  if (!membership.ok) {
    return partnerApiErrorResponse(PARTNER_API_ERROR.FORBIDDEN, 403);
  }

  let accruedCents = 0;
  let pendingCents = 0;
  let paidCents = 0;

  try {
    const admin = getSupabaseAdminClient();
    const { data } = await admin
      .from("partner_commission_balances")
      .select("accrued_cents, pending_cents, paid_cents")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (data) {
      accruedCents = data.accrued_cents ?? 0;
      pendingCents = data.pending_cents ?? 0;
      paidCents = data.paid_cents ?? 0;
    }
  } catch {
    // table absente ou RLS — ignore
  }

  return NextResponse.json({
    tenantId,
    balance: 0,
    creditLimitTokens: 0,
    deprecated: true,
    model: "freemium_revshare",
    commissions: {
      accruedCents,
      pendingCents,
      paidCents,
    },
    capabilities: membership.capabilities,
  });
}
