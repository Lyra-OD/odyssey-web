import { NextResponse } from "next/server";

import {
  PARTNER_API_ERROR,
  partnerApiErrorResponse,
} from "@/src/lib/partner/partnerApiErrors";
import { fetchPartnerWalletRow } from "@/src/lib/partner/partnerWallet";
import { PartnerWalletQuerySchema } from "@/src/lib/partner/partnerWalletTypes";
import { resolvePartnerMembership } from "@/src/lib/partner/resolvePartnerMembership";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/partner/wallet?tenantId=<uuid>
 * Admin-only wallet snapshot for the active Salon tenant.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = PartnerWalletQuerySchema.safeParse({
    tenantId: searchParams.get("tenantId"),
  });

  if (!parsedQuery.success) {
    return partnerApiErrorResponse(
      PARTNER_API_ERROR.INVALID_TENANT,
      400,
    );
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

  const wallet = await fetchPartnerWalletRow(supabase, tenantId);
  if (!wallet) {
    return partnerApiErrorResponse(PARTNER_API_ERROR.WALLET_NOT_FOUND, 404);
  }

  return NextResponse.json({
    tenantId,
    balance: wallet.balance,
    creditLimitTokens: wallet.creditLimitTokens,
    capabilities: membership.capabilities,
  });
}
