import { createClient } from "@/utils/supabase/client";
import { generateImageThumbnailBlob } from "@/src/lib/media/generateImageThumbnail";
import {
  STORAGE_CACHE_CONTROL,
} from "@/src/lib/media/storageEgressPolicy";
import { thumbStoragePathFor } from "@/src/lib/media/thumbnailPath";
import {
  computeUploadProgress,
  isLocalMediaItem,
  type MediaAssetInsertRow,
  type MediaGridItem,
  type MediaUploadSource,
  type UploadProgress,
  type UploadQueueItem,
} from "@/src/lib/media/mediaTypes";

export type {
  HydratedMediaApiItem,
  HydratedMediaListResponse,
  MediaAssetInsertRow,
  MediaGridItem,
  MediaItemOrigin,
  MediaUploadSource,
  MediaUploadStatus,
  UploadProgress,
  UploadQueueItem,
} from "@/src/lib/media/mediaTypes";

export {
  computeUploadProgress,
  createLocalQueueItem,
  displayNameFromStoragePath,
  getItemDisplayName,
  getItemMimeType,
  getItemSizeBytes,
  hydratedApiItemToGridItem,
  isLocalMediaItem,
  isRemoteMediaItem,
} from "@/src/lib/media/mediaTypes";

export type UploadCallbacks = {
  onItemUpdate?: (item: UploadQueueItem) => void;
  onProgress?: (progress: UploadProgress) => void;
};

export type UploadBatchParams = UploadCallbacks & {
  projectId: string;
  items: UploadQueueItem[];
  userId?: string;
  tenantId?: string;
  source?: MediaUploadSource;
  bucket?: string;
  maxConcurrency?: number;
  maxRetries?: number;
  signal?: AbortSignal;
  /**
   * `signed` = Co-Créateur (cookie) via upload-url + register API.
   * `direct` = Titulaire (session Auth + RLS).
   */
  uploadStrategy?: "direct" | "signed";
  insertRowFactory?: (
    context: {
      projectId: string;
      storagePath: string;
      item: UploadQueueItem;
      source: MediaUploadSource;
      userId?: string;
      tenantId?: string;
    },
  ) => Record<string, unknown>;
};

export type UploadBatchResult = {
  items: UploadQueueItem[];
  progress: UploadProgress;
};

const DEFAULT_BUCKET = "user-assets";
const DEFAULT_MAX_CONCURRENCY = 4;
const DEFAULT_MAX_RETRIES = 2;

/**
 * Code d'erreur stable levé par le trigger Postgres
 * `public.enforce_media_asset_quota()` (voir docs/sql/odyssey_p7_media_quota_guard.sql)
 * quand l'insert dépasserait `packageMaxMediaItems(basePackage)`.
 * Ce garde-fou est le rempart final côté serveur : l'UI (TributeWizard /
 * MediaDropzoneAdapter) bloque déjà l'utilisateur en amont, mais un client
 * malveillant qui appellerait directement l'API Supabase doit être stoppé ici.
 */
export const MEDIA_QUOTA_EXCEEDED_ERROR = "media_quota_exceeded";

function isMediaQuotaExceededError(message: string): boolean {
  return message.toLowerCase().includes(MEDIA_QUOTA_EXCEEDED_ERROR);
}

function safeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

function extFromFile(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 10) return fromName.toLowerCase();
  if (file.type.startsWith("image/")) return "jpg";
  if (file.type.startsWith("video/")) return "mp4";
  return "bin";
}

function buildStoragePath(projectId: string, item: MediaGridItem): string {
  if (!isLocalMediaItem(item)) {
    throw new Error("Cannot build storage path for non-local media item");
  }

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const ext = extFromFile(item.file);
  const baseName = safeFileName(item.file.name.replace(/\.[^.]+$/, ""));
  const random = crypto.randomUUID();
  return `projects/${projectId}/${yyyy}/${mm}/${dd}/${item.orderIndex ?? 0}-${baseName}-${random}.${ext}`;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

type SignedUploadUrlResponse = {
  ok?: boolean;
  path?: string;
  token?: string;
  error?: string;
};

async function requestSignedUploadUrl(params: {
  projectId: string;
  fileName: string;
  mimeType?: string;
  sizeBytes: number;
  orderIndex: number;
  kind?: "original" | "thumb";
  baseStoragePath?: string;
}): Promise<{ path: string; token: string }> {
  const res = await fetch(`/api/projects/${params.projectId}/media/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: params.fileName,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      orderIndex: params.orderIndex,
      kind: params.kind ?? "original",
      baseStoragePath: params.baseStoragePath,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as SignedUploadUrlResponse;
  if (!res.ok || !body.path || !body.token) {
    throw new Error(body.error ?? "signed_url_failed");
  }
  return { path: body.path, token: body.token };
}

async function registerMediaAsset(params: {
  projectId: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number;
  orderIndex: number;
  source: MediaUploadSource;
}): Promise<string | null> {
  const res = await fetch(`/api/projects/${params.projectId}/media/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storagePath: params.storagePath,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      orderIndex: params.orderIndex,
      source: params.source,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    assetId?: string | null;
    error?: string;
  };
  if (!res.ok || !body.ok) {
    if (body.error === MEDIA_QUOTA_EXCEEDED_ERROR) {
      throw new Error(MEDIA_QUOTA_EXCEEDED_ERROR);
    }
    throw new Error(body.error ?? "media_register_failed");
  }
  return body.assetId ?? null;
}

async function uploadAndInsertSigned(params: {
  item: UploadQueueItem;
  projectId: string;
  source: MediaUploadSource;
  bucket: string;
}): Promise<{ storagePath: string; assetId: string | null }> {
  if (!isLocalMediaItem(params.item)) {
    throw new Error("Upload requires a local file item");
  }

  const supabase = createClient();
  const signed = await requestSignedUploadUrl({
    projectId: params.projectId,
    fileName: params.item.file.name,
    mimeType: params.item.file.type || undefined,
    sizeBytes: params.item.file.size,
    orderIndex: params.item.orderIndex ?? 0,
  });

  const { error: uploadError } = await supabase.storage
    .from(params.bucket)
    .uploadToSignedUrl(signed.path, signed.token, params.item.file, {
      cacheControl: STORAGE_CACHE_CONTROL,
      contentType: params.item.file.type || undefined,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const thumbBlob = await generateImageThumbnailBlob(params.item.file);
  if (thumbBlob) {
    try {
      const thumbSigned = await requestSignedUploadUrl({
        projectId: params.projectId,
        fileName: "thumb.webp",
        mimeType: "image/webp",
        sizeBytes: thumbBlob.size,
        orderIndex: params.item.orderIndex ?? 0,
        kind: "thumb",
        baseStoragePath: signed.path,
      });
      const { error: thumbError } = await supabase.storage
        .from(params.bucket)
        .uploadToSignedUrl(thumbSigned.path, thumbSigned.token, thumbBlob, {
          cacheControl: STORAGE_CACHE_CONTROL,
          contentType: "image/webp",
        });
      if (thumbError) {
        console.warn(
          "[mediaUpload] thumbnail upload skipped:",
          thumbError.message,
        );
      }
    } catch (thumbErr) {
      const message =
        thumbErr instanceof Error ? thumbErr.message : "thumb_failed";
      console.warn("[mediaUpload] thumbnail upload skipped:", message);
    }
  }

  const assetId = await registerMediaAsset({
    projectId: params.projectId,
    storagePath: signed.path,
    mimeType: params.item.file.type || null,
    sizeBytes: params.item.file.size,
    orderIndex: params.item.orderIndex ?? 0,
    source: params.source,
  });

  return { storagePath: signed.path, assetId };
}

async function uploadAndInsert(
  params: {
    item: UploadQueueItem;
    projectId: string;
    userId?: string;
    tenantId?: string;
    source: MediaUploadSource;
    bucket: string;
    uploadStrategy?: "direct" | "signed";
    insertRowFactory?: UploadBatchParams["insertRowFactory"];
  },
): Promise<{ storagePath: string; assetId: string | null }> {
  if (params.uploadStrategy === "signed") {
    return uploadAndInsertSigned({
      item: params.item,
      projectId: params.projectId,
      source: params.source,
      bucket: params.bucket,
    });
  }

  if (!isLocalMediaItem(params.item)) {
    throw new Error("Upload requires a local file item");
  }

  const supabase = createClient();
  const storagePath = buildStoragePath(params.projectId, params.item);

  const { error: uploadError } = await supabase.storage
    .from(params.bucket)
    .upload(storagePath, params.item.file, {
      cacheControl: STORAGE_CACHE_CONTROL,
      upsert: false,
      contentType: params.item.file.type || undefined,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const thumbBlob = await generateImageThumbnailBlob(params.item.file);
  if (thumbBlob) {
    const thumbPath = thumbStoragePathFor(storagePath);
    const { error: thumbError } = await supabase.storage
      .from(params.bucket)
      .upload(thumbPath, thumbBlob, {
        cacheControl: STORAGE_CACHE_CONTROL,
        upsert: false,
        contentType: "image/webp",
      });
    if (thumbError) {
      console.warn(
        "[mediaUpload] thumbnail upload skipped:",
        thumbError.message,
      );
    }
  }

  const row =
    params.insertRowFactory?.({
      projectId: params.projectId,
      storagePath,
      item: params.item,
      source: params.source,
      userId: params.userId,
      tenantId: params.tenantId,
    }) ??
    ({
      project_id: params.projectId,
      storage_path: storagePath,
      mime_type: params.item.file.type || null,
      size_bytes: params.item.file.size,
      source: params.source,
      upload_status: "uploaded",
      order_index: params.item.orderIndex ?? 0,
      ...(params.userId ? { owner_user_id: params.userId } : {}),
      ...(params.tenantId ? { tenant_id: params.tenantId } : {}),
    } satisfies MediaAssetInsertRow);

  const { data: inserted, error: insertError } = await supabase
    .from("media_assets")
    .upsert(row, {
      onConflict: "project_id,storage_path",
      ignoreDuplicates: false,
    })
    .select("id")
    .maybeSingle();
  if (insertError) {
    if (isMediaQuotaExceededError(insertError.message)) {
      throw new Error(MEDIA_QUOTA_EXCEEDED_ERROR);
    }
    throw new Error(`media_assets upsert failed: ${insertError.message}`);
  }

  return {
    storagePath,
    assetId: inserted?.id ?? null,
  };
}

async function uploadWithRetries(
  params: {
    item: UploadQueueItem;
    projectId: string;
    userId?: string;
    tenantId?: string;
    source: MediaUploadSource;
    bucket: string;
    maxRetries: number;
    signal?: AbortSignal;
    insertRowFactory?: UploadBatchParams["insertRowFactory"];
    uploadStrategy?: UploadBatchParams["uploadStrategy"];
  },
): Promise<{ storagePath: string; assetId: string | null }> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= params.maxRetries + 1; attempt += 1) {
    if (params.signal?.aborted) {
      throw new Error("Upload cancelled");
    }

    try {
      return await uploadAndInsert({
        item: params.item,
        projectId: params.projectId,
        userId: params.userId,
        tenantId: params.tenantId,
        source: params.source,
        bucket: params.bucket,
        insertRowFactory: params.insertRowFactory,
        uploadStrategy: params.uploadStrategy,
      });
    } catch (error) {
      lastError = error;

      // Rejet de quota déterministe (pas transitoire) : inutile de retenter,
      // la limite ne bougera pas pendant les retries.
      if (error instanceof Error && error.message === MEDIA_QUOTA_EXCEEDED_ERROR) {
        break;
      }

      if (attempt <= params.maxRetries) {
        await sleep(300 * 2 ** (attempt - 1));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unknown upload error");
}

export async function uploadMediaBatch(
  params: UploadBatchParams,
): Promise<UploadBatchResult> {
  const source = params.source ?? "local";
  const maxConcurrency = Math.max(
    1,
    Math.min(params.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY, 8),
  );
  const maxRetries = Math.max(0, params.maxRetries ?? DEFAULT_MAX_RETRIES);
  const bucket = params.bucket ?? DEFAULT_BUCKET;

  const items = params.items.map((item, index) => ({
    ...item,
    orderIndex: item.orderIndex ?? index,
  }));

  let cursor = 0;

  const emit = () => {
    params.onProgress?.(computeUploadProgress(items));
  };

  const worker = async () => {
    while (cursor < items.length) {
      if (params.signal?.aborted) return;

      const currentIndex = cursor;
      cursor += 1;
      const item = items[currentIndex];

      if (item.origin === "remote" || item.status === "uploaded") {
        continue;
      }

      if (!isLocalMediaItem(item)) {
        item.status = "failed";
        item.error = "Missing local file for upload";
        params.onItemUpdate?.({ ...item });
        emit();
        continue;
      }

      item.status = "uploading";
      item.error = null;
      params.onItemUpdate?.({ ...item });
      emit();

      try {
        const result = await uploadWithRetries({
          item,
          projectId: params.projectId,
          userId: params.userId,
          tenantId: params.tenantId,
          source,
          bucket,
          maxRetries,
          signal: params.signal,
          insertRowFactory: params.insertRowFactory,
          uploadStrategy: params.uploadStrategy,
        });

        item.status = "uploaded";
        item.storagePath = result.storagePath;
        // Garder `item.id` stable (UUID local) pour que onItemUpdate merge
        // correctement dans React ; `assetId` porte l'id DB.
        if (result.assetId) {
          item.assetId = result.assetId;
        }
        item.attempts += 1;
        item.error = null;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        item.status = params.signal?.aborted ? "cancelled" : "failed";
        item.attempts += 1;
        item.error = message;
      }

      params.onItemUpdate?.({ ...item });
      emit();
    }
  };

  await Promise.all(Array.from({ length: maxConcurrency }, () => worker()));

  return {
    items,
    progress: computeUploadProgress(items),
  };
}
