import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { resolveContributeToken } from "@/src/lib/contribute/accessToken";
import {
  circleRoleLabel,
  formatCircleDisplayName,
  mergeCircleEntries,
  roleFromProductKey,
  type CircleRole,
} from "@/src/lib/contribute/circle";
import {
  listActiveGuestSupportPacks,
  guestSupportPackLabel,
} from "@/src/lib/wizard/guestSupportPacks";

export const runtime = "nodejs";

/**
 * GET /api/contribute/[token]
 * Contexte public Sanctuaire : hommage, catalogue empreintes, cercle des proches.
 * Pas de jauge $ (Quiet Luxury) — les montants fonds restent côté famille.
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

  const [{ data: guestMedia }, { data: paidCheckouts }] = await Promise.all([
    admin
      .from("media_assets")
      .select("contributor_name, contributor_email, created_at, source")
      .eq("project_id", tokenRow.project_id)
      .eq("contributor_type", "guest")
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("guest_micro_checkouts")
      .select("contributor_name, contributor_email, product_key, completed_at, created_at")
      .eq("project_id", tokenRow.project_id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(40),
  ]);

  const rawEntries: {
    displayName: string;
    role: CircleRole;
    at: number;
  }[] = [];

  for (const row of guestMedia ?? []) {
    const displayName = formatCircleDisplayName(
      row.contributor_name as string | null,
      row.contributor_email as string | null,
    );
    if (!displayName) continue;
    rawEntries.push({
      displayName,
      role: "present",
      at: new Date((row.created_at as string) ?? 0).getTime(),
    });
  }

  for (const row of paidCheckouts ?? []) {
    const displayName = formatCircleDisplayName(
      row.contributor_name as string | null,
      row.contributor_email as string | null,
    );
    if (!displayName) continue;
    const at = new Date(
      (row.completed_at as string | null) ??
        (row.created_at as string | null) ??
        0,
    ).getTime();
    rawEntries.push({
      displayName,
      role: roleFromProductKey(row.product_key as string | null),
      at,
    });
  }

  const circle = mergeCircleEntries(rawEntries).map((m) => ({
    displayName: m.displayName,
    role: m.role,
    roleLabel: circleRoleLabel(m.role, locale),
  }));

  return NextResponse.json({
    ok: true,
    tribute: {
      firstName: (project?.first_name as string | null) ?? null,
      lastName: (project?.last_name as string | null) ?? null,
    },
    circle,
    circleCount: circle.length,
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
