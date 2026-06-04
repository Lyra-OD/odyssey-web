import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

let supabaseAdminSingleton: SupabaseClient | null = null;

/**
 * Service-role Supabase client — server-only.
 * Used for Storage deletes and other ops blocked for `authenticated` by RLS.
 * Always verify project ownership with the user session before calling.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (supabaseAdminSingleton) return supabaseAdminSingleton;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  supabaseAdminSingleton = createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseAdminSingleton;
}
