import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  supabaseAuthCookieSignature,
  withAuthRefreshLock,
} from "@/src/lib/supabase/authRefreshLock";

/**
 * Refreshes the Supabase auth session and propagates cookies on the response.
 * See: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-odyssey-pathname", request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Anti-course refresh token — voir src/lib/supabase/authRefreshLock.ts.
  // Fusionne cet appel avec celui d'une éventuelle route API concurrente
  // qui partage exactement les mêmes cookies de session.
  const signature = supabaseAuthCookieSignature(request.cookies.getAll());
  const {
    data: { user },
  } = await withAuthRefreshLock(signature, () => supabase.auth.getUser());

  return { response: supabaseResponse, supabase, user };
}
