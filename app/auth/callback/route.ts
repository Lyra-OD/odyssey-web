import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const DEFAULT_NEXT = "/fr/dashboard";

function sanitizeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return DEFAULT_NEXT;
  }
  if (!/^\/(fr|en)(\/|$)/.test(raw)) {
    return DEFAULT_NEXT;
  }
  return raw;
}

function loginErrorRedirect(requestUrl: URL, nextPath: string): NextResponse {
  const seg = nextPath.match(/^\/(fr|en)\//);
  const l = seg?.[1];
  const path =
    l === "fr" || l === "en"
      ? `/${l}/login?error=callback`
      : "/fr/login?error=callback";
  return NextResponse.redirect(new URL(path, requestUrl));
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const sanitizedNext = sanitizeNextPath(url.searchParams.get("next"));
  const redirectUrl = new URL(sanitizedNext, url.origin);

  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as
    | "signup"
    | "email"
    | "recovery"
    | "invite"
    | "magiclink"
    | "email_change"
    | null;

  let response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession:", error.message);
      return loginErrorRedirect(url, sanitizedNext);
    }
    console.log("Redirection vers :", sanitizedNext);
    /* Même instance `response` : les cookies de session ont été posés via setAll. */
    return response;
  }

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });
    if (error) {
      console.error("[auth/callback] verifyOtp:", error.message);
      return loginErrorRedirect(url, sanitizedNext);
    }
    console.log("Redirection vers :", sanitizedNext);
    return response;
  }

  console.warn("[auth/callback] missing code/token_hash — redirect login");
  return loginErrorRedirect(url, sanitizedNext);
}
