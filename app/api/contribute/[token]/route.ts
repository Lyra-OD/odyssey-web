import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { resolveContributeToken } from "@/src/lib/contribute/accessToken";
import {
  listActiveGuestSupportPacks,
  guestSupportPackLabel,
} from "@/src/lib/wizard/guestSupportPacks";

export const runtime = "nodejs";

/**
 * GET /api/contribute/[token]
 * Contexte public d'une page de contribution invité : hommage minimal,
 * catalogue Support Packs, avancement du Fonds Commémoratif.
 */
export async function GET(
  req: Request,
  { params }: { params: { token: string } },
) {
  const url = new URL(req.url);
  const locale = url.searchParams.get("lang") === "en" ? "en" : "fr";

  const tokenRow = await resolveContributeToken(params.token);
  if (!tokenRow) {
    return NextResponse.json({ error: "invalid_or_expired_link" }, { status: 404 });
  }

  const admin = getSupabaseAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, first_name, last_name")
    .eq("id", tokenRow.project_id)
    .maybeSingle();

  const { data: fund } = await admin
    .from("family_tribute_fund_balances")
    .select("accrued_cents, consumed_cents")
    .eq("project_id", tokenRow.project_id)
    .maybeSingle();

  const raisedCents = Number(fund?.accrued_cents ?? 0);

  return NextResponse.json({
    ok: true,
    tribute: {
      firstName: (project?.first_name as string | null) ?? null,
      lastName: (project?.last_name as string | null) ?? null,
    },
    fund: { raisedCents },
    packs: listActiveGuestSupportPacks().map((pack) => ({
      key: pack.key,
      label: guestSupportPackLabel(pack, locale),
      priceCents: pack.priceCents,
      secondary: pack.secondary === true,
      amountMinCents: pack.amountMinCents ?? null,
      amountMaxCents: pack.amountMaxCents ?? null,
      amountSuggestedCents: pack.amountSuggestedCents ?? null,
    })),
  });
}
