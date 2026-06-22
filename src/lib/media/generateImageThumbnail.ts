const DEFAULT_MAX_EDGE_PX = 400;
const DEFAULT_WEBP_QUALITY = 0.78;

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
      reject(new Error("thumbnail_image_decode_failed"));
    };
    image.src = url;
  });
}

/**
 * Client-side WebP thumbnail for grid previews (reduces Storage egress).
 * Returns null for non-images, HEIC/HEIF, or decode failures — original upload still succeeds.
 */
export async function generateImageThumbnailBlob(
  file: File,
  maxEdgePx = DEFAULT_MAX_EDGE_PX,
  quality = DEFAULT_WEBP_QUALITY,
): Promise<Blob | null> {
  if (!file.type.startsWith("image/")) return null;
  if (file.type === "image/heic" || file.type === "image/heif") return null;

  try {
    const image = await loadImageFromFile(file);
    const scale = Math.min(1, maxEdgePx / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (result) => resolve(result),
        "image/webp",
        quality,
      );
    });

    return blob;
  } catch {
    return null;
  }
}
