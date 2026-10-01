import "server-only";

import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { hashContributeToken } from "@/src/lib/contribute/contributeToken";

/** Séance privée lecture seule — hub guest (C8/C14). */
export const SESSION_STREAM_TOKEN_PURPOSE = "view_only" as const;

export type SessionStreamAccessToken = {
  id: string;
  project_id: string;
  tenant_id: string | null;
  purpose: string;
  expires_at: string;
  revoked_at: string | null;
};

/**
 * Résout un token opaque → projet pour `/stream/[token]`.
 */
export async function resolveSessionStreamToken(
  rawToken: string,
): Promise<SessionStreamAccessToken | null> {
  if (!rawToken || rawToken.trim().length === 0) return null;
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("project_access_tokens")
    .select("id, project_id, tenant_id, purpose, expires_at, revoked_at")
    .eq("token_hash", hashContributeToken(rawToken))
    .maybeSingle();

  if (error || !data) return null;
  const row = data as SessionStreamAccessToken;
  if (row.purpose !== SESSION_STREAM_TOKEN_PURPOSE) return null;
  if (row.revoked_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return row;
}
