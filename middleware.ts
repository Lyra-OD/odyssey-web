import { type NextRequest, NextResponse } from "next/server";

import { appRoutes } from "@/src/lib/appRoutes";
import {
  isHqProtectedPath,
  isListedOnHqAllowlist,
  localeFromPathname,
} from "@/src/lib/hq/isOdysseyOperator";
import {
  normalizePartnerSlugParam,
  PARTNER_CONNEXION_SLUG_KEY,
} from "@/src/lib/partner/partnerBrandingTypes";
import { partnerConnexionSlugCookieOptions } from "@/src/lib/partner/partnerConnexionSlugCookie";
import { updateSession } from "@/utils/supabase/middleware";

function redirectKeepingSession(url: URL, sessionResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value);
  });
  return redirectResponse;
}

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  const isSalonConnexion = /^\/(fr|en)\/salon\/connexion\/?$/.test(pathname);
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

  if (isHqProtectedPath(pathname)) {
    const lang = localeFromPathname(pathname);
    if (!user) {
      const loginUrl = new URL(
        appRoutes.hqConnexionWithParams(lang, { next: pathname }),
        request.url,
      );
      return redirectKeepingSession(loginUrl, response);
    }

    const allowed = await isListedOnHqAllowlist(supabase, user.id);
    if (!allowed) {
      const homeUrl = new URL(`/${lang}`, request.url);
      return redirectKeepingSession(homeUrl, response);
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
