const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp)$/i;
const VIDEO_EXT = /\.(mp4|mov)$/i;

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
