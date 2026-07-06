"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Film,
  Image as ImageIcon,
  Loader2,
  RefreshCcw,
  X,
} from "lucide-react";
import {
  MEDIA_QUOTA_EXCEEDED_ERROR,
  type UploadQueueItem,
} from "@/src/lib/uploads/mediaUploadService";
import { StoragePreviewImage } from "@/src/components/media/StoragePreviewImage";
import {
  getItemDisplayName,
  getItemMimeType,
  getItemSizeBytes,
  isRemoteMediaItem,
} from "@/src/lib/media/mediaTypes";

export type MediaQueueGridCopy = {
  emptyTitle: string;
  statusQueued: string;
  statusUploading: string;
  statusUploaded: string;
  statusFailed: string;
  statusCancelled: string;
  remove: string;
  retry: string;
  /** Message affiché quand item.error === MEDIA_QUOTA_EXCEEDED_ERROR (support `{max}`). */
  quotaExceededError?: string;
};

type Props = {
  items: UploadQueueItem[];
  isRunning: boolean;
  deletingId?: string | null;
  copy: MediaQueueGridCopy;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
};

function displayItemError(
  error: string,
  quotaExceededMessage: string | undefined,
): string {
  if (error === MEDIA_QUOTA_EXCEEDED_ERROR && quotaExceededMessage) {
    return quotaExceededMessage;
  }
  return error;
}

const VIDEO_PREFIX = "video/";

function isImageItem(item: UploadQueueItem): boolean {
  const mime = getItemMimeType(item);
  if (mime.startsWith("image/")) return true;
  const name = getItemDisplayName(item);
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(name);
}

function isVideoItem(item: UploadQueueItem): boolean {
  const mime = getItemMimeType(item);
  if (mime.startsWith(VIDEO_PREFIX)) return true;
  return /\.(mp4|mov)$/i.test(getItemDisplayName(item));
}

function isPreviewableImage(item: UploadQueueItem): boolean {
  if (isRemoteMediaItem(item) && item.previewUrl) {
    const name = getItemDisplayName(item);
    if (/\.(heic|heif)$/i.test(name)) return false;
    if (item.mimeType === "image/heic" || item.mimeType === "image/heif") {
      return false;
    }
    return isImageItem(item);
  }
  if (!item.file) return false;
  if (!isImageItem(item)) return false;
  const name = getItemDisplayName(item);
  if (/\.(heic|heif)$/i.test(name)) return false;
  if (item.file.type === "image/heic" || item.file.type === "image/heif") {
    return false;
  }
  return true;
}

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["o", "ko", "Mo", "Go"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1);
  return `${rounded} ${units[unit]}`;
}

function useImagePreviews(items: UploadQueueItem[]): Map<string, string> {
  const previewsRef = useRef<Map<string, string>>(new Map());
  const previews = useMemo(() => {
    const map = previewsRef.current;
    const seen = new Set<string>();
    items.forEach((item) => {
      seen.add(item.id);
      if (isRemoteMediaItem(item) && item.previewUrl) {
        map.set(item.id, item.previewUrl);
        return;
      }
      if (map.has(item.id)) return;
      if (!item.file || !isPreviewableImage(item)) return;
      try {
        map.set(item.id, URL.createObjectURL(item.file));
      } catch {
        // ignore preview creation errors
      }
    });
    Array.from(map.keys()).forEach((id) => {
      if (!seen.has(id)) {
        const url = map.get(id);
        const item = items.find((entry) => entry.id === id);
        if (url && item && !isRemoteMediaItem(item)) {
          URL.revokeObjectURL(url);
        }
        map.delete(id);
      }
    });
    return new Map(map);
  }, [items]);

  useEffect(() => {
    const map = previewsRef.current;
    return () => {
      map.forEach((url) => URL.revokeObjectURL(url));
      map.clear();
    };
  }, []);

  return previews;
}

export function MediaQueueGrid({
  items,
  isRunning,
  deletingId = null,
  copy,
  onRemove,
  onRetry,
}: Props) {
  const previews = useImagePreviews(items);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.orderIndex - b.orderIndex),
    [items],
  );

  if (!sortedItems.length) {
    return (
      <div
        className="mt-6 rounded-2xl border border-dashed border-white/8 bg-white/[0.02] px-4 py-8 text-center text-sm font-light text-zinc-500"
        aria-live="polite"
      >
        {copy.emptyTitle}
      </div>
    );
  }

  return (
    <ul
      className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      aria-label="Files queued for upload"
    >
      {sortedItems.map((item) => {
        const showPreview = isPreviewableImage(item) && previews.has(item.id);
        const previewUrl = previews.get(item.id);
        const displayName = getItemDisplayName(item);
        const isHeic =
          /\.(heic|heif)$/i.test(displayName) ||
          getItemMimeType(item) === "image/heic" ||
          getItemMimeType(item) === "image/heif";
        const removable = item.status !== "uploading";
        const retryable = item.status === "failed" || item.status === "cancelled";
        const isDeleting = deletingId === item.id;

        const statusLabel =
          item.status === "queued"
            ? copy.statusQueued
            : item.status === "uploading"
              ? copy.statusUploading
              : item.status === "uploaded"
                ? copy.statusUploaded
                : item.status === "cancelled"
                  ? copy.statusCancelled
                  : copy.statusFailed;

        const ringClass =
          item.status === "failed"
            ? "ring-1 ring-fuchsia-400/50"
            : item.status === "uploaded"
              ? "ring-1 ring-teal-400/40"
              : item.status === "uploading"
                ? "ring-1 ring-indigo-400/40"
                : "ring-1 ring-white/8";

        return (
          <li
            key={item.id}
            className={`group relative overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] transition-opacity duration-200 ${ringClass} ${
              isDeleting ? "pointer-events-none opacity-40" : ""
            }`}
          >
            <div className="relative aspect-square w-full overflow-hidden bg-black/40">
              {showPreview && previewUrl ? (
                isRemoteMediaItem(item) ? (
                  <StoragePreviewImage
                    src={previewUrl}
                    fallbackSrc={item.fullPreviewUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                )
              ) : isVideoItem(item) ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-zinc-300">
                  <Film className="h-8 w-8" strokeWidth={1.2} />
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                    {displayName.split(".").pop()?.toUpperCase() ?? "VIDEO"}
                  </span>
                </div>
              ) : isHeic ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-teal-200/85">
                  <ImageIcon className="h-8 w-8" strokeWidth={1.2} />
                  <span className="text-[10px] uppercase tracking-widest text-teal-300/70">
                    HEIC
                  </span>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-400">
                  <ImageIcon className="h-8 w-8" strokeWidth={1.2} />
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 pb-1.5 pt-4">
                <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-200">
                  {item.status === "uploading" ? (
                    <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                  ) : item.status === "uploaded" ? (
                    <CheckCircle2 className="h-3 w-3 text-teal-300" strokeWidth={1.5} />
                  ) : item.status === "failed" ? (
                    <AlertCircle className="h-3 w-3 text-fuchsia-300" strokeWidth={1.5} />
                  ) : null}
                  <span>{statusLabel}</span>
                </span>
                <span className="text-[10px] text-zinc-400">
                  {formatSize(getItemSizeBytes(item))}
                </span>
              </div>

              {removable ? (
                <button
                  type="button"
                  aria-label={`${copy.remove} ${displayName}`}
                  onClick={() => onRemove(item.id)}
                  disabled={isDeleting}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/55 text-zinc-200 opacity-0 transition-opacity hover:bg-black/80 focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-30"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              ) : null}
            </div>

            <div className="space-y-1 px-2 py-2">
              <p
                className="truncate text-xs font-light text-zinc-200"
                title={displayName}
              >
                {displayName}
              </p>

              {item.status === "failed" && item.error ? (
                <div className="space-y-1">
                  <p
                    className="max-h-28 overflow-y-auto whitespace-pre-wrap break-words text-[11px] leading-snug text-fuchsia-200/90"
                    title={item.error}
                  >
                    {displayItemError(item.error, copy.quotaExceededError)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.clipboard) {
                        navigator.clipboard.writeText(item.error ?? "").catch(() => {});
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-light text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                    aria-label="Copier le message d'erreur"
                  >
                    <Copy className="h-2.5 w-2.5" strokeWidth={1.5} />
                    Copier l&apos;erreur
                  </button>
                </div>
              ) : null}

              {retryable ? (
                <button
                  type="button"
                  onClick={() => onRetry(item.id)}
                  disabled={isRunning}
                  className="mt-1 inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-light text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-40"
                >
                  <RefreshCcw className="h-3 w-3" strokeWidth={1.5} />
                  {copy.retry}
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
