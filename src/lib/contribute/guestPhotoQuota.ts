/**
 * Quota photos Sanctuaire (invité) — enforcement API + tests.
 * Canon : sanctuaryLimits.ts · Quiet Luxury anti-dump.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { SANCTUARY_GUEST_PHOTO_MAX } from "@/src/lib/contribute/sanctuaryLimits";

export const GUEST_PHOTO_LIMIT_ERROR = "guest_photo_limit_reached" as const;

/** Préfixe storage des dépôts liés à un access_token contribute. */
export function guestContributeStoragePrefix(
  projectId: string,
  accessTokenId: string,
): string {
  return `projects/${projectId}/contribute/${accessTokenId}/`;
}

export function isGuestPhotoQuotaExceeded(
  currentPhotoCount: number,
  max = SANCTUARY_GUEST_PHOTO_MAX,
): boolean {
  return currentPhotoCount >= max;
}

/**
 * Compte les photos invité (`source=guest_photo`) pour ce token contribute.
 * Scopé projet + chemin token — n’affecte pas le Soft Cap famille.
 */
export async function countGuestPhotosForContributeToken(
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
    .eq("source", "guest_photo")
    .like("storage_path", `${prefix}%`);

  if (error) {
    throw new Error(`guest_photo_count_failed: ${error.message}`);
  }

  return count ?? 0;
}

/** True si une nouvelle photo est autorisée. */
export async function canAcceptGuestPhotoDeposit(
  admin: SupabaseClient,
  params: { projectId: string; accessTokenId: string },
): Promise<{ ok: true; count: number } | { ok: false; count: number }> {
  const count = await countGuestPhotosForContributeToken(admin, params);
  if (isGuestPhotoQuotaExceeded(count)) {
    return { ok: false, count };
  }
  return { ok: true, count };
}

export function isGuestPhotoLimitDbError(message: string | undefined): boolean {
  if (!message) return false;
  return message.includes(GUEST_PHOTO_LIMIT_ERROR);
}
