import { createClient } from "@/utils/supabase/client";

export type MediaUploadStatus =
  | "queued"
  | "uploading"
  | "uploaded"
  | "failed"
  | "cancelled";

export type MediaUploadSource =
  | "local"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "google_photos";

export type UploadQueueItem = {
  id: string;
  file: File;
  status: MediaUploadStatus;
  attempts: number;
  error?: string | null;
  storagePath?: string | null;
  orderIndex?: number;
};

export type UploadProgress = {
  total: number;
  queued: number;
  uploading: number;
  uploaded: number;
  failed: number;
  cancelled: number;
};

export type MediaAssetInsertRow = {
  project_id: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number;
  source: MediaUploadSource | string;
  upload_status: "uploaded";
  order_index: number;
  // Convention DB Odyssey : owner_user_id (NOT NULL) et tenant_id (NOT NULL).
  // Cf. docs/sql/odyssey_p2b_media_assets_cleanup.sql.
  owner_user_id?: string;
  tenant_id?: string;
};

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

function computeProgress(items: UploadQueueItem[]): UploadProgress {
  return {
    total: items.length,
    queued: items.filter((i) => i.status === "queued").length,
    uploading: items.filter((i) => i.status === "uploading").length,
    uploaded: items.filter((i) => i.status === "uploaded").length,
    failed: items.filter((i) => i.status === "failed").length,
    cancelled: items.filter((i) => i.status === "cancelled").length,
  };
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

function buildStoragePath(projectId: string, item: UploadQueueItem): string {
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
): Promise<{ storagePath: string }> {
  const supabase = createClient();
  const storagePath = buildStoragePath(params.projectId, params.item);

  const { error: uploadError } = await supabase.storage
    .from(params.bucket)
    .upload(storagePath, params.item.file, {
      cacheControl: "3600",
      upsert: false,
      contentType: params.item.file.type || undefined,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
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

  const { error: insertError } = await supabase
    .from("media_assets")
    .upsert(row, {
      onConflict: "project_id,storage_path",
      ignoreDuplicates: true,
    });
  if (insertError) {
    throw new Error(`media_assets upsert failed: ${insertError.message}`);
  }

  return { storagePath };
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
): Promise<{ storagePath: string }> {
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
        // Backoff progressif pour réduire la pression réseau.
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

  // Copie locale mutée par les workers, puis renvoyée.
  const items = params.items.map((item, index) => ({
    ...item,
    orderIndex: item.orderIndex ?? index,
  }));

  let cursor = 0;

  const emit = () => {
    params.onProgress?.(computeProgress(items));
  };

  const worker = async () => {
    while (cursor < items.length) {
      if (params.signal?.aborted) return;

      const currentIndex = cursor;
      cursor += 1;
      const item = items[currentIndex];

      if (item.status === "uploaded") {
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
    progress: computeProgress(items),
  };
}
