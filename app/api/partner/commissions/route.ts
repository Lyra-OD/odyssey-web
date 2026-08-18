import { NextResponse } from "next/server";

import {
  PARTNER_API_ERROR,
  partnerApiErrorResponse,
} from "@/src/lib/partner/partnerApiErrors";
import { loadPartnerCommissionDashboard } from "@/src/lib/partner/loadPartnerCommissionDashboard";
import { PartnerCommissionQuerySchema } from "@/src/lib/partner/partnerCommissionTypes";
import { resolvePartnerMembership } from "@/src/lib/partner/resolvePartnerMembership";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/partner/commissions?tenantId=<uuid>
 * Soldes + ledger RevShare + pilotage salon. `partner_admin` only (`canViewLedger`).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedQuery = PartnerCommissionQuerySchema.safeParse({
    tenantId: searchParams.get("tenantId"),
  });

  if (!parsedQuery.success) {
    return partnerApiErrorResponse(PARTNER_API_ERROR.INVALID_TENANT, 400);
  }

  const { tenantId } = parsedQuery.data;
  const locale = searchParams.get("lang") === "en" ? "en" : "fr";

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
    { requiredCapability: "canViewLedger" },
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

  try {
    const dashboard = await loadPartnerCommissionDashboard(
      admin,
      tenantId,
      locale,
    );
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("[partner/commissions]", error);
    return partnerApiErrorResponse(PARTNER_API_ERROR.INTERNAL, 500);
  }
}
