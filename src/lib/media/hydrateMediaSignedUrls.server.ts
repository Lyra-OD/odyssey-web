import type { SupabaseClient } from "@supabase/supabase-js";

import {
  displayNameFromStoragePath,
  type HydratedMediaApiItem,
} from "@/src/lib/media/mediaTypes";
import { SIGNED_URL_TTL_SEC } from "@/src/lib/media/storageEgressPolicy";
import {
  isImageStoragePath,
  thumbStoragePathFor,
} from "@/src/lib/media/thumbnailPath";

const DEFAULT_BUCKET = "user-assets";

type MediaAssetRow = {
  id: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  order_index: number | null;
  source: string;
  owner_user_id: string;
  tenant_id: string;
};

function signedUrlForPath(
  signedByPath: Map<string, string | null>,
  path: string,
): string | null {
  return signedByPath.get(path) ?? null;
}

export async function hydrateMediaRowsWithSignedUrls(
  supabase: SupabaseClient,
  rows: MediaAssetRow[],
  bucket = DEFAULT_BUCKET,
): Promise<HydratedMediaApiItem[]> {
  if (!rows.length) return [];

  const pathsToSign = new Set<string>();
  for (const row of rows) {
    if (!row.storage_path) continue;
    pathsToSign.add(row.storage_path);
    if (isImageStoragePath(row.storage_path)) {
      pathsToSign.add(thumbStoragePathFor(row.storage_path));
    }
  }

  const signedByPath = new Map<string, string | null>();
  const pathList = [...pathsToSign];

  if (pathList.length > 0) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrls(pathList, SIGNED_URL_TTL_SEC);

    if (error) {
      for (const path of pathList) signedByPath.set(path, null);
    } else {
      for (const entry of data ?? []) {
        signedByPath.set(
          entry.path ?? "",
          entry.signedUrl && !entry.error ? entry.signedUrl : null,
        );
      }
    }
  }

  return rows.map((row) => {
    const storagePath = row.storage_path;
    const fullPreviewUrl = storagePath
      ? signedUrlForPath(signedByPath, storagePath)
      : null;

    const thumbPath = storagePath ? thumbStoragePathFor(storagePath) : null;
    const thumbUrl =
      storagePath && isImageStoragePath(storagePath) && thumbPath
        ? signedUrlForPath(signedByPath, thumbPath)
        : null;

    const previewUrl = thumbUrl ?? fullPreviewUrl;

    return {
      id: row.id,
      assetId: row.id,
      storagePath,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes ?? 0,
      orderIndex: row.order_index ?? 0,
      displayName: displayNameFromStoragePath(storagePath),
      previewUrl,
      fullPreviewUrl,
      source: row.source,
      ownerUserId: row.owner_user_id,
      tenantId: row.tenant_id,
    };
  });
}
