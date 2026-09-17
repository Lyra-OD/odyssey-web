import "server-only";

import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { resolveContributeToken } from "@/src/lib/contribute/accessToken";
import { countGuestPhotosForContributeToken } from "@/src/lib/contribute/guestPhotoQuota";
import {
  GUEST_SESSION_COOKIE_NAME,
  decodeGuestSessionCookie,
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
import type {
  SanctuaryGuestPack,
  SanctuaryGuestPayload,
} from "@/src/lib/contribute/sanctuaryGuestPayload";

export type { SanctuaryGuestPack, SanctuaryGuestPayload };

function cookieValueFromHeader(
  header: string | null | undefined,
  name: string,
): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    return trimmed.slice(eq + 1);
  }
  return null;
}

function packsForLocale(locale: "fr" | "en"): SanctuaryGuestPack[] {
  return listActiveGuestSupportPacks().map((pack) => ({
    key: pack.key,
    label: guestSupportPackLabel(pack, locale),
    priceCents: pack.priceCents,
    secondary: pack.secondary === true,
    amountMinCents: pack.amountMinCents ?? null,
    amountMaxCents: pack.amountMaxCents ?? null,
    amountSuggestedCents: pack.amountSuggestedCents ?? null,
  }));
}

/**
 * Contexte public Sanctuaire (hommage + packs).
 * Le mint cookie reste l’API GET — un Server Component ne peut pas Set-Cookie.
 */
export async function loadSanctuaryContext(params: {
  token: string;
  locale: "fr" | "en";
  cookieHeader?: string | null;
}): Promise<
  | { ok: true; data: SanctuaryGuestPayload }
  | { ok: false }
> {
  const tokenRow = await resolveContributeToken(params.token);
  if (!tokenRow) return { ok: false };

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

  const rawGuest = cookieValueFromHeader(
    params.cookieHeader,
    GUEST_SESSION_COOKIE_NAME,
  );
  const existing = rawGuest ? decodeGuestSessionCookie(rawGuest) : null;
  const guestPhotoCount =
    existing && existing.tokenId === tokenRow.id
      ? await countGuestPhotosForContributeToken(admin, {
          projectId: tokenRow.project_id,
          accessTokenId: tokenRow.id,
          sessionId: existing.sessionId,
        }).catch(() => 0)
      : 0;

  return {
    ok: true,
    data: {
      tribute: {
        firstName: tribute.firstName,
        lastName: tribute.lastName,
        displayName: formatTributeDisplayName(tribute, params.locale),
      },
      packs: packsForLocale(params.locale),
      guestPhotoCount,
      guestPhotoMax: SANCTUARY_GUEST_PHOTO_MAX,
    },
  };
}
