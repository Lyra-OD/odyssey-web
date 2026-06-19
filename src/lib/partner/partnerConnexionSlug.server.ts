import "server-only";

import { cookies } from "next/headers";

import {
  normalizePartnerSlugParam,
  PARTNER_CONNEXION_SLUG_KEY,
} from "@/src/lib/partner/partnerBrandingTypes";
import { partnerConnexionSlugCookieOptions } from "@/src/lib/partner/partnerConnexionSlugCookie";

/** Slug mémorisé (Option B) — lisible côté serveur pour redirects layout. */
export function readPartnerConnexionSlugFromCookie(): string | null {
  const raw = cookies().get(PARTNER_CONNEXION_SLUG_KEY)?.value;
  return normalizePartnerSlugParam(raw);
}

/**
 * Écriture cookie — Route Handler / middleware uniquement (pas dans RSC render).
 * @see middleware.ts pour connexion ?partenaire=
 * @see persistPartnerConnexionSlug() côté client pour le dashboard
 */
export function writePartnerConnexionSlugCookie(slug: string): void {
  const normalized = normalizePartnerSlugParam(slug);
  if (!normalized) return;

  cookies().set(
    PARTNER_CONNEXION_SLUG_KEY,
    normalized,
    partnerConnexionSlugCookieOptions(),
  );
}
