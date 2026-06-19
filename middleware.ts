import { type NextRequest, NextResponse } from "next/server";

import {
  normalizePartnerSlugParam,
  PARTNER_CONNEXION_SLUG_KEY,
} from "@/src/lib/partner/partnerBrandingTypes";
import { partnerConnexionSlugCookieOptions } from "@/src/lib/partner/partnerConnexionSlugCookie";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  const isSalonConnexion = /^\/(fr|en)\/salon\/connexion\/?$/.test(
    request.nextUrl.pathname,
  );
  if (isSalonConnexion) {
    const slug =
      normalizePartnerSlugParam(request.nextUrl.searchParams.get("partenaire")) ??
      normalizePartnerSlugParam(request.nextUrl.searchParams.get("partner"));
    if (slug) {
      response.cookies.set(
        PARTNER_CONNEXION_SLUG_KEY,
        slug,
        partnerConnexionSlugCookieOptions(),
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on all routes except static assets and media (Supabase refreshes session via cookies).
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|webm)$).*)",
  ],
};
