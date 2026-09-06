import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  supabaseAuthCookieSignature,
  withAuthRefreshLock,
} from "@/src/lib/supabase/authRefreshLock";

export async function createClient() {
  const cookieStore = cookies();

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* Server Components cannot always set cookies; middleware refreshes the session. */
          }
        },
      },
    },
  );

  // Anti-course refresh token — voir src/lib/supabase/authRefreshLock.ts.
  const signature = supabaseAuthCookieSignature(cookieStore.getAll());
  const originalGetUser = client.auth.getUser.bind(client.auth);
  client.auth.getUser = (jwt?: string) =>
    withAuthRefreshLock(signature, () => originalGetUser(jwt));

  return client;
}
