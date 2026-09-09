import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { resolveContributeToken } from "@/src/lib/contribute/accessToken";
import { countGuestPhotosForContributeToken } from "@/src/lib/contribute/guestPhotoQuota";
import {
  attachGuestSessionCookieIfMinted,
  resolveOrMintGuestSession,
} from "@/src/lib/contribute/guestSessionCookie";
import {
  formatTributeDisplayName,
  resolveTributeNames,
} from "@/src/lib/contribute/tributeName";
import { SANCTUARY_GUEST_PHOTO_MAX } from "@/src/lib/contribute/sanctuaryLimits";
import {
  listActiveGuestSupportPacks,
  guestSupportPackLabel,
} from "@/src/lib/wizard/guestSupportPacks";

export const runtime = "nodejs";

/**
 * GET /api/contribute/[token]
 * Contexte public Sanctuaire : hommage + catalogue. Pas de PII des autres
 * invités (prénoms / courriels). `circle` reste [] — étoiles = mon dépôt.
 * `circleCount` = preuve anonyme (« le ciel se remplit »). Pas de jauge $.
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

  const guestSession = resolveOrMintGuestSession({
    cookieHeader: req.headers.get("cookie"),
    tokenId: tokenRow.id,
  });

  const admin = getSupabaseAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, first_name, last_name")
    .eq("id", tokenRow.project_id)
    .maybeSingle();

  const tribute = resolveTributeNames({
    first_name: (project?.first_name as string | null) ?? null,
    last_name: (project?.last_name as string | null) ?? null,
  });

  const [guestPhotoCount, circleHead] = await Promise.all([
    countGuestPhotosForContributeToken(admin, {
      projectId: tokenRow.project_id,
      accessTokenId: tokenRow.id,
      sessionId: guestSession.payload.sessionId,
    }).catch(() => 0),
    admin
      .from("media_assets")
      .select("id", { count: "exact", head: true })
      .eq("project_id", tokenRow.project_id)
      .eq("contributor_type", "guest"),
  ]);

  const circleCount = circleHead.count ?? 0;

  const response = NextResponse.json({
    ok: true,
    tribute: {
      firstName: tribute.firstName,
      lastName: tribute.lastName,
      displayName: formatTributeDisplayName(tribute, locale),
    },
    guestPhotoCount,
    guestPhotoMax: SANCTUARY_GUEST_PHOTO_MAX,
    circle: [],
    circleCount,
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
  attachGuestSessionCookieIfMinted(response, guestSession);
  return response;
}
