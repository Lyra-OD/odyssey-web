/**
 * Hydrate médias storyboard → URLs signées Creatomate (TTL 4 h).
 */

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CREATOMATE_MEDIA_SIGNED_URL_TTL_SEC,
  cinematicTheme,
} from "@/src/lib/creatomate/cinematicTheme";
import type { ResolvedMediaAsset } from "@/src/lib/creatomate/types";
import { VIDEO_TRIM_DURATION_SEC } from "@/src/lib/wizard/storyboardPacing";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

const BUCKET = "user-assets";

function isVideoMime(mime: string | null, path: string): boolean {
  if (mime?.startsWith("video/")) return true;
  return /\.(mp4|mov|webm|m4v)$/i.test(path);
}

/**
 * Charge les media_assets du projet présents dans le storyboard,
 * signe les chemins (TTL 4 h), applique videoTrims + focalPoints.
 */
export async function resolveStoryboardMediaAssets(
  admin: SupabaseClient,
  params: {
    projectId: string;
    storyboard: WizardStoryboardState;
  },
): Promise<Map<string, ResolvedMediaAsset>> {
  const ids = new Set<string>();
  for (const ch of params.storyboard.chapters) {
    for (const id of ch.mediaIds) {
      if (!params.storyboard.excludedIds.includes(id)) ids.add(id);
    }
  }

  const result = new Map<string, ResolvedMediaAsset>();
  if (ids.size === 0) return result;

  const { data: rows, error } = await admin
    .from("media_assets")
    .select("id, storage_path, mime_type")
    .eq("project_id", params.projectId)
    .in("id", [...ids]);

  if (error) {
    throw new Error(`creatomate_media_load_failed: ${error.message}`);
  }

  const pathById = new Map<string, { path: string; mime: string | null }>();
  const paths: string[] = [];
  for (const row of rows ?? []) {
    const id = row.id as string;
    const path = String(row.storage_path ?? "");
    if (!path) continue;
    pathById.set(id, { path, mime: (row.mime_type as string | null) ?? null });
    paths.push(path);
  }

  // Songs upload — signed later in resolveChapterAudio
  const signedByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed, error: signError } = await admin.storage
      .from(BUCKET)
      .createSignedUrls(paths, CREATOMATE_MEDIA_SIGNED_URL_TTL_SEC);

    if (signError) {
      throw new Error(`creatomate_media_sign_failed: ${signError.message}`);
    }
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl && !entry.error) {
        signedByPath.set(entry.path, entry.signedUrl);
      }
    }
  }

  for (const [id, meta] of pathById) {
    const url = signedByPath.get(meta.path);
    if (!url) continue;

    const kind = isVideoMime(meta.mime, meta.path) ? "video" : "image";
    const trim = params.storyboard.videoTrims[id];
    const focal = params.storyboard.focalPoints[id];

    const trimStartSec = trim?.trimStartSec ?? 0;
    const durationSec =
      kind === "video"
        ? (trim?.durationSec ??
          cinematicTheme.media.videoFallbackDurationSec ??
          VIDEO_TRIM_DURATION_SEC)
        : cinematicTheme.media.photoDurationSec;

    result.set(id, {
      id,
      kind,
      url,
      trimStartSec,
      durationSec,
      focalX: typeof focal?.x === "number" ? focal.x : 0.5,
      focalY: typeof focal?.y === "number" ? focal.y : 0.5,
      hasAudio: kind === "video",
    });
  }

  return result;
}

/** Signe un chemin Storage (musique upload) — TTL 4 h. */
export async function signStoragePathForCreatomate(
  admin: SupabaseClient,
  storagePath: string,
): Promise<string | null> {
  const path = storagePath.trim();
  if (!path) return null;
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, CREATOMATE_MEDIA_SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
