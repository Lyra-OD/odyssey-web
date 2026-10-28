/**
 * Commit 9 S7 — états de file par vidéo (préparation / annulation / reprise).
 * Pas d’appel encode ici : le branchement upload est le Commit 11.
 */

import type { MediaGridItem } from "@/src/lib/media/mediaTypes";

const VIDEO_EXT = /\.(mp4|mov|m4v|webm)$/i;

export function isQueueVideoFile(file: File | undefined): boolean {
  if (!file) return false;
  if (file.type.startsWith("video/")) return true;
  return VIDEO_EXT.test(file.name);
}

/** Passe une vidéo en file `queued` → `preparing` et mémorise l’original. */
export function beginVideoPrepare(item: MediaGridItem): MediaGridItem {
  if (item.origin !== "local" || item.status !== "queued") return item;
  if (!isQueueVideoFile(item.file)) return item;
  return {
    ...item,
    status: "preparing",
    originalFile: item.originalFile ?? item.file,
    error: null,
  };
}

/** Préparation OK : le fichier à uploader devient le préparé, statut `queued`. */
export function finishVideoPrepare(
  item: MediaGridItem,
  preparedFile: File,
): MediaGridItem {
  if (item.status !== "preparing") return item;
  return {
    ...item,
    status: "queued",
    file: preparedFile,
    originalFile: item.originalFile ?? item.file,
    displayName: preparedFile.name,
    mimeType: preparedFile.type || "video/mp4",
    sizeBytes: preparedFile.size,
    error: null,
  };
}

export function failVideoPrepare(
  item: MediaGridItem,
  error: string,
): MediaGridItem {
  if (item.status !== "preparing") return item;
  const source = item.originalFile ?? item.file;
  return {
    ...item,
    status: "failed",
    error,
    file: source,
    displayName: source?.name ?? item.displayName,
    mimeType: source?.type ?? item.mimeType,
    sizeBytes: source?.size ?? item.sizeBytes,
  };
}

/** Reprise : revient à l’original en mémoire, pas au fichier déjà préparé. */
export function requeueVideoAfterFailure(item: MediaGridItem): MediaGridItem {
  if (item.status !== "failed" && item.status !== "cancelled") return item;
  const source = item.originalFile ?? item.file;
  return {
    ...item,
    status: "queued",
    error: null,
    file: source,
    displayName: source?.name ?? item.displayName,
    mimeType: source?.type ?? item.mimeType,
    sizeBytes: source?.size ?? item.sizeBytes,
  };
}
