/**
 * Quota messages Sanctuaire (invité) — anti-spam dépôt texte.
 * Miroir de guestPhotoQuota (source=guest_message).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { guestContributeStoragePrefix } from "@/src/lib/contribute/guestPhotoQuota";
import { SANCTUARY_GUEST_MESSAGE_MAX } from "@/src/lib/contribute/sanctuaryLimits";

export const GUEST_MESSAGE_LIMIT_ERROR = "guest_message_limit_reached" as const;

export function isGuestMessageQuotaExceeded(
  currentMessageCount: number,
  max = SANCTUARY_GUEST_MESSAGE_MAX,
): boolean {
  return currentMessageCount >= max;
}

export async function countGuestMessagesForContributeToken(
  admin: SupabaseClient,
  params: { projectId: string; accessTokenId: string },
): Promise<number> {
  const prefix = guestContributeStoragePrefix(
    params.projectId,
    params.accessTokenId,
  );

  const { count, error } = await admin
    .from("media_assets")
    .select("id", { count: "exact", head: true })
    .eq("project_id", params.projectId)
    .eq("contributor_type", "guest")
    .eq("source", "guest_message")
    .like("storage_path", `${prefix}%`);

  if (error) {
    throw new Error(`guest_message_count_failed: ${error.message}`);
  }

  return count ?? 0;
}

export async function canAcceptGuestMessageDeposit(
  admin: SupabaseClient,
  params: { projectId: string; accessTokenId: string },
): Promise<{ ok: true; count: number } | { ok: false; count: number }> {
  const count = await countGuestMessagesForContributeToken(admin, params);
  if (isGuestMessageQuotaExceeded(count)) {
    return { ok: false, count };
  }
  return { ok: true, count };
}
