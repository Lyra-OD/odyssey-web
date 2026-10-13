const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp)$/i;
const VIDEO_EXT = /\.(mp4|mov)$/i;
/** Path or signed URL whose pathname ends with an image extension (e.g. *-thumb.webp). */
const IMAGE_SRC_EXT = /\.(jpe?g|png|webp|gif|bmp)(?:\?|#|$)/i;

export function thumbStoragePathFor(storagePath: string): string {
  const dot = storagePath.lastIndexOf(".");
  if (dot <= 0) return `${storagePath}-thumb.webp`;
  return `${storagePath.slice(0, dot)}-thumb.webp`;
}

export function isImageStoragePath(storagePath: string): boolean {
  return IMAGE_EXT.test(storagePath);
}

export function isVideoStoragePath(storagePath: string): boolean {
  return VIDEO_EXT.test(storagePath);
}

/**
 * True when `src` is an image path/URL (thumb WebP, photo), not a video blob/MP4.
 * Video tiles with a poster must render as img, never video src=webp.
 */
export function looksLikeImageSrc(src: string | null | undefined): boolean {
  if (!src) return false;
  try {
    if (src.includes("://")) {
      return IMAGE_EXT.test(new URL(src).pathname);
    }
  } catch {
    // fall through
  }
  return IMAGE_SRC_EXT.test(src);
}

export function isPreviewableImageMime(
  mimeType: string | null | undefined,
): boolean {
  const mime = mimeType?.trim().toLowerCase() ?? "";
  if (!mime.startsWith("image/")) return false;
  return mime !== "image/heic" && mime !== "image/heif";
}

export function shouldGenerateThumbnail(file: File): boolean {
  return isPreviewableImageMime(file.type || null);
}
