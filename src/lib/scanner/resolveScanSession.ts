import "server-only";

import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { hashScanSessionToken } from "@/src/lib/scanner/scanSessionToken";

export type ScanSessionRow = {
  id: string;
  project_id: string;
  tenant_id: string | null;
  status: string;
  expires_at: string;
  upload_count: number;
  created_by_user_id: string | null;
};

export function isMissingScanSessionsTable(error: {
  message?: string;
  code?: string;
} | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (msg.includes("scan_sessions") &&
      (msg.includes("does not exist") ||
        msg.includes("schema cache") ||
        msg.includes("could not find")))
  );
}

/**
 * Résout un token QR opaque → session active non expirée.
 * Public (téléphone anonyme) : client admin (bypass RLS).
 */
export async function resolveScanSession(
  rawToken: string,
): Promise<ScanSessionRow | null> {
  if (!rawToken || rawToken.trim().length === 0) return null;
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("scan_sessions")
    .select(
      "id, project_id, tenant_id, status, expires_at, upload_count, created_by_user_id",
    )
    .eq("token_hash", hashScanSessionToken(rawToken))
    .maybeSingle();

  if (error || !data) return null;
  const row = data as ScanSessionRow;
  if (row.status !== "active") return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}
