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
/**
 * Clone les headers de la requête EN COURS (donc après une éventuelle
 * mutation de `request.cookies`) + injecte notre header interne. Un clone
 * pris une seule fois avant tout rafraîchissement de session reste figé
 * sur l'ancien Cookie — c'était le vrai bug (voir plus bas).
 */
function requestHeadersWithPathname(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  headers.set("x-odyssey-pathname", request.nextUrl.pathname);
  return headers;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeadersWithPathname(request) },
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
          /**
           * BUG RACINE trouvé le 6 sept 2026 : ce clone était auparavant
           * pris UNE SEULE FOIS, avant tout rafraîchissement — donc figé
           * sur l'ancien Cookie. Résultat : la session rafraîchie ne
           * repartait jamais vers le handler en aval dans CE cycle de
           * requête, qui retentait alors SON PROPRE refresh avec un
           * refresh token déjà consommé (rotation à usage unique) → 401
           * permanents dès l'expiration de l'access token, sur un compte
           * pourtant valide. `request.cookies.set()` juste au-dessus
           * mute déjà `request.headers` en direct : on le re-clone donc
           * MAINTENANT, après la mutation, pour que le handler en aval
           * voie la session fraîche.
           */
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeadersWithPathname(request) },
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
