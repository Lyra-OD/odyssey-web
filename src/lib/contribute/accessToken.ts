import "server-only";

import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { hashContributeToken } from "@/src/lib/contribute/contributeToken";

export type ContributeAccessToken = {
  id: string;
  project_id: string;
  tenant_id: string | null;
  purpose: string;
  expires_at: string;
  revoked_at: string | null;
};

/**
 * Résout un token de contribution opaque → ligne project_access_tokens valide.
 * Public (invité anonyme) : client admin (bypass RLS). Retourne null si le
 * token est inconnu, révoqué, expiré, ou d'un autre `purpose`.
 */
export async function resolveContributeToken(
  rawToken: string,
): Promise<ContributeAccessToken | null> {
  if (!rawToken || rawToken.trim().length === 0) return null;
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("project_access_tokens")
    .select("id, project_id, tenant_id, purpose, expires_at, revoked_at")
    .eq("token_hash", hashContributeToken(rawToken))
    .maybeSingle();

  if (error || !data) return null;
  const row = data as ContributeAccessToken;
  if (row.purpose !== "guest_contribute") return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}
