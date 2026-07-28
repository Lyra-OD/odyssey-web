import type { SupabaseClient } from "@supabase/supabase-js";

import { SANCTUARY_GUEST_VIDEO_MAX_PER_TOKEN } from "@/src/lib/contribute/sanctuaryLimits";

export const GUEST_VIDEO_LIMIT_ERROR = "guest_video_limit_reached";

/**
 * Compte les dépôts `guest_video` pour ce token (path Storage contribute/{tokenId}/).
 */
export async function countGuestVideoDeposits(
  admin: SupabaseClient,
  params: { projectId: string; accessTokenId: string },
): Promise<number> {
  const prefix = `projects/${params.projectId}/contribute/${params.accessTokenId}/`;
  const { count, error } = await admin
    .from("media_assets")
    .select("id", { count: "exact", head: true })
    .eq("project_id", params.projectId)
    .eq("source", "guest_video")
    .eq("contributor_type", "guest")
    .like("storage_path", `${prefix}%`);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function canAcceptGuestVideoDeposit(
  admin: SupabaseClient,
  params: {
    projectId: string;
    accessTokenId: string;
    max?: number;
  },
): Promise<{ ok: true; count: number } | { ok: false; count: number }> {
  const max = params.max ?? SANCTUARY_GUEST_VIDEO_MAX_PER_TOKEN;
  const count = await countGuestVideoDeposits(admin, params);
  if (count >= max) return { ok: false, count };
  return { ok: true, count };
}

/**
 * Valide qu’un media_id est un témoignage invité du même token / projet.
 */
export async function assertGuestVideoMediaForToken(
  admin: SupabaseClient,
  params: {
    mediaId: string;
    projectId: string;
    accessTokenId: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await admin
    .from("media_assets")
    .select("id, project_id, source, contributor_type, storage_path")
    .eq("id", params.mediaId)
    .maybeSingle();

  if (error) return { ok: false, error: "media_lookup_failed" };
  if (!data) return { ok: false, error: "media_not_found" };
  if (data.project_id !== params.projectId) {
    return { ok: false, error: "media_wrong_project" };
  }
  if (data.source !== "guest_video" || data.contributor_type !== "guest") {
    return { ok: false, error: "media_not_guest_video" };
  }
  const prefix = `projects/${params.projectId}/contribute/${params.accessTokenId}/`;
  const path = String(data.storage_path ?? "");
  if (!path.startsWith(prefix)) {
    return { ok: false, error: "media_wrong_token" };
  }
  return { ok: true };
}
