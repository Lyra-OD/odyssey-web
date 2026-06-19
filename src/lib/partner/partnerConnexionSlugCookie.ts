import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

import { PARTNER_CONNEXION_SLUG_KEY } from "@/src/lib/partner/partnerBrandingTypes";

export const PARTNER_CONNEXION_SLUG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Options cookie partagées middleware + serveur. */
export function partnerConnexionSlugCookieOptions(): Partial<ResponseCookie> {
  return {
    path: "/",
    maxAge: PARTNER_CONNEXION_SLUG_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

export { PARTNER_CONNEXION_SLUG_KEY };
