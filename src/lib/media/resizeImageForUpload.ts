/** Canon ingest S6 — côté long max avant upload Coffre. */
export const MAX_UPLOAD_EDGE_PX = 2048;
/** Qualité JPEG objet principal (~0.82 — COFFRE_MONTAGE_MEDIA_INGEST §3). */
export const UPLOAD_JPEG_QUALITY = 0.82;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("resize_image_decode_failed"));
    };
    image.src = url;
  });
}

function jpegFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "photo";
  return `${base}.jpg`;
}

/**
 * Client-side JPEG resize for Coffre upload (S6).
 * Returns the same File if already ≤2048, non-image, HEIC/HEIF, or on failure.
 */
export async function resizeImageForUploadFile(
  file: File,
  maxEdgePx = MAX_UPLOAD_EDGE_PX,
  quality = UPLOAD_JPEG_QUALITY,
): Promise<File> {
  if (typeof document === "undefined") return file;

  const mime = (file.type || "").toLowerCase();
  if (!mime.startsWith("image/")) return file;
  if (mime === "image/heic" || mime === "image/heif") return file;

  try {
    const image = await loadImageFromFile(file);
    const longest = Math.max(image.width, image.height);
    if (longest <= maxEdgePx) return file;

    const scale = maxEdgePx / longest;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", quality);
    });
    if (!blob) return file;

    return new File([blob], jpegFileName(file.name), { type: "image/jpeg" });
  } catch {
    return file;
  }
}
