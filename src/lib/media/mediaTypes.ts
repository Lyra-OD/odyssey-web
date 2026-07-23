/**
 * Unified media grid model — local upload queue + remote assets hydrated from DB.
 *
 * Convention DB Odyssey:
 *   - owner_user_id (NOT NULL) — not user_id
 *   - tenant_id (NOT NULL)
 */

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

export type MediaItemOrigin = "local" | "remote";

/** Single tile in the wizard media grid (queue + persisted assets). */
export type MediaGridItem = {
  /**
   * Identifiant stable de tuile UI.
   * - File locale : UUID client (ne pas remplacer par `assetId` à l'upload).
   * - Hydratation remote : égal à `assetId`.
   */
  id: string;
  origin: MediaItemOrigin;
  status: MediaUploadStatus;
  orderIndex: number;
  attempts: number;
  error?: string | null;
  storagePath?: string | null;
  /** Present for local queue items awaiting or during upload. */
  file?: File;
  /** `media_assets.id` — set after DB insert or server hydration. */
  assetId?: string;
  mimeType?: string | null;
  sizeBytes?: number;
  displayName?: string;
  /** Signed Storage URL — remote items (thumb when available). */
  previewUrl?: string | null;
  /** Full-resolution signed URL — modal / director view. */
  fullPreviewUrl?: string | null;
  ownerUserId?: string;
  tenantId?: string;
  source?: MediaUploadSource | string;
};

/** Backward-compatible alias used by upload hooks and services. */
export type UploadQueueItem = MediaGridItem;

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
  owner_user_id?: string;
  tenant_id?: string;
};

/** Row shape returned by GET /api/projects/[id]/media */
export type HydratedMediaApiItem = {
  id: string;
  assetId: string;
  storagePath: string;
  mimeType: string | null;
  sizeBytes: number;
  orderIndex: number;
  displayName: string;
  previewUrl: string | null;
  fullPreviewUrl: string | null;
  source: string;
  ownerUserId: string;
  tenantId: string;
};

export type HydratedMediaListResponse = {
  items: HydratedMediaApiItem[];
};

export function isLocalMediaItem(
  item: MediaGridItem,
): item is MediaGridItem & { file: File; origin: "local" } {
  return item.origin === "local" && item.file instanceof File;
}

export function isRemoteMediaItem(
  item: MediaGridItem,
): item is MediaGridItem & { origin: "remote"; assetId: string } {
  return item.origin === "remote" && typeof item.assetId === "string";
}

export function getItemDisplayName(item: MediaGridItem): string {
  if (item.displayName?.trim()) return item.displayName.trim();
  if (item.file?.name) return item.file.name;
  if (item.storagePath) {
    const segment = item.storagePath.split("/").pop();
    if (segment) return segment;
  }
  return "media";
}

export function getItemSizeBytes(item: MediaGridItem): number {
  if (typeof item.sizeBytes === "number" && item.sizeBytes >= 0) {
    return item.sizeBytes;
  }
  if (item.file) return item.file.size;
  return 0;
}

export function getItemMimeType(item: MediaGridItem): string {
  if (item.mimeType?.trim()) return item.mimeType.trim();
  if (item.file?.type) return item.file.type;
  return "";
}

export function createLocalQueueItem(
  file: File,
  orderIndex: number,
): MediaGridItem {
  return {
    id: crypto.randomUUID(),
    origin: "local",
    file,
    status: "queued",
    attempts: 0,
    error: null,
    storagePath: null,
    orderIndex,
    displayName: file.name,
    sizeBytes: file.size,
    mimeType: file.type || null,
    source: "local",
  };
}

export function hydratedApiItemToGridItem(
  item: HydratedMediaApiItem,
): MediaGridItem {
  return {
    id: item.assetId,
    origin: "remote",
    assetId: item.assetId,
    status: "uploaded",
    orderIndex: item.orderIndex,
    attempts: 0,
    error: null,
    storagePath: item.storagePath,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    displayName: item.displayName,
    previewUrl: item.previewUrl,
    fullPreviewUrl: item.fullPreviewUrl,
    ownerUserId: item.ownerUserId,
    tenantId: item.tenantId,
    source: item.source,
  };
}

export function displayNameFromStoragePath(storagePath: string): string {
  const segment = storagePath.split("/").pop();
  return segment && segment.length > 0 ? segment : "media";
}

export function computeUploadProgress(items: MediaGridItem[]): UploadProgress {
  return {
    total: items.length,
    queued: items.filter((i) => i.status === "queued").length,
    uploading: items.filter((i) => i.status === "uploading").length,
    uploaded: items.filter((i) => i.status === "uploaded").length,
    failed: items.filter((i) => i.status === "failed").length,
    cancelled: items.filter((i) => i.status === "cancelled").length,
  };
}
