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
import type { UploadQueueItem } from "@/src/lib/uploads/mediaUploadService";

export type MediaQueueGridCopy = {
  emptyTitle: string;
  statusQueued: string;
  statusUploading: string;
  statusUploaded: string;
  statusFailed: string;
  statusCancelled: string;
  remove: string;
  retry: string;
};

type Props = {
  items: UploadQueueItem[];
  isRunning: boolean;
  copy: MediaQueueGridCopy;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
};

const VIDEO_PREFIX = "video/";

function isImageItem(item: UploadQueueItem): boolean {
  if (item.file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(item.file.name);
}

function isVideoItem(item: UploadQueueItem): boolean {
  if (item.file.type.startsWith(VIDEO_PREFIX)) return true;
  return /\.(mp4|mov)$/i.test(item.file.name);
}

/**
 * HEIC/HEIF ne sont pas affichables nativement par Chrome/Firefox/Edge.
 * On affiche une icône image + badge "HEIC" plutôt qu'une miniature cassée.
 * (Le fichier est bien uploadé — c'est seulement l'aperçu local qui n'est
 *  pas rendable en l'absence de conversion server-side.)
 */
function isPreviewableImage(item: UploadQueueItem): boolean {
  if (!isImageItem(item)) return false;
  if (/\.(heic|heif)$/i.test(item.file.name)) return false;
  if (item.file.type === "image/heic" || item.file.type === "image/heif") return false;
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
      if (map.has(item.id)) return;
      if (!isPreviewableImage(item)) return;
      try {
        map.set(item.id, URL.createObjectURL(item.file));
      } catch {
        // ignore preview creation errors (very large files / unsupported)
      }
    });
    // Revoke orphan previews.
    Array.from(map.keys()).forEach((id) => {
      if (!seen.has(id)) {
        const url = map.get(id);
        if (url) URL.revokeObjectURL(url);
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
  copy,
  onRemove,
  onRetry,
}: Props) {
  const previews = useImagePreviews(items);

  if (!items.length) {
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
      {items.map((item) => {
        const showPreview = isPreviewableImage(item) && previews.has(item.id);
        const previewUrl = previews.get(item.id);
        const isHeic = /\.(heic|heif)$/i.test(item.file.name) ||
          item.file.type === "image/heic" ||
          item.file.type === "image/heif";
        const removable = item.status !== "uploading";
        const retryable = item.status === "failed" || item.status === "cancelled";

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
            className={`group relative overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] ${ringClass}`}
          >
            <div className="relative aspect-square w-full overflow-hidden bg-black/40">
              {showPreview && previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={item.file.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : isVideoItem(item) ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-zinc-300">
                  <Film className="h-8 w-8" strokeWidth={1.2} />
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                    {item.file.name.split(".").pop()?.toUpperCase() ?? "VIDEO"}
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

              {/* Status badge */}
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
                  {formatSize(item.file.size)}
                </span>
              </div>

              {/* Remove button */}
              {removable ? (
                <button
                  type="button"
                  aria-label={`${copy.remove} ${item.file.name}`}
                  onClick={() => onRemove(item.id)}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/55 text-zinc-200 opacity-0 transition-opacity hover:bg-black/80 focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              ) : null}
            </div>

            <div className="space-y-1 px-2 py-2">
              <p
                className="truncate text-xs font-light text-zinc-200"
                title={item.file.name}
              >
                {item.file.name}
              </p>
              {item.status === "failed" && item.error ? (
                <div className="space-y-1">
                  <p
                    className="max-h-28 overflow-y-auto whitespace-pre-wrap break-words text-[11px] leading-snug text-fuchsia-200/90"
                    title={item.error}
                  >
                    {item.error}
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
