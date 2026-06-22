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

async function uploadAndInsert(
  params: {
    item: UploadQueueItem;
    projectId: string;
    userId?: string;
    tenantId?: string;
    source: MediaUploadSource;
    bucket: string;
    insertRowFactory?: UploadBatchParams["insertRowFactory"];
  },
): Promise<{ storagePath: string; assetId: string | null }> {
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
      });
    } catch (error) {
      lastError = error;
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
        });

        item.status = "uploaded";
        item.storagePath = result.storagePath;
        if (result.assetId) {
          item.assetId = result.assetId;
          item.id = result.assetId;
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
