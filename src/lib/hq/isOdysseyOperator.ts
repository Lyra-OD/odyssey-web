import type { SupabaseClient } from "@supabase/supabase-js";

export function isHqProtectedPath(pathname: string): boolean {
  if (!/^\/(fr|en)\/hq(\/|$)/.test(pathname)) return false;
  return !/^\/(fr|en)\/hq\/connexion\/?$/.test(pathname);
}

export function localeFromPathname(pathname: string): "fr" | "en" {
  return pathname.startsWith("/en") ? "en" : "fr";
}

/**
 * True if the SELECT own-row hit matches this user.
 * Fail-closed: missing row or mismatched id → false.
 */
export function isHqAllowlistHit(
  row: { user_id?: string | null } | null | undefined,
  userId: string,
): boolean {
  return typeof row?.user_id === "string" && row.user_id === userId;
}

/**
 * HQ allowlist — `public.hq_allowlist`. Not a tenant role. Not env.
 * Uses the session client (RLS: own row only). Fail-closed on error.
 */
export async function isListedOnHqAllowlist(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("hq_allowlist")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[hq_allowlist] lookup failed:", error.message);
    return false;
  }

  return isHqAllowlistHit(data as { user_id?: string } | null, userId);
}
