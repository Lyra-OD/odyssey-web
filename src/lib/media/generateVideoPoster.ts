const DEFAULT_MAX_EDGE_PX = 400;
const DEFAULT_WEBP_QUALITY = 0.78;
const POSTER_TIMEOUT_MS = 10_000;
const VIDEO_FILE_EXT = /\.(mp4|mov)$/i;

function isVideoFile(file: File): boolean {
  const mime = file.type.trim().toLowerCase();
  if (mime.startsWith("video/")) return true;
  return VIDEO_FILE_EXT.test(file.name);
}

/**
 * Client-side WebP poster from a video frame (Coffre / banque grid).
 * Returns null for non-video or decode/seek failures — original upload still succeeds.
 */
export async function generateVideoPosterBlob(
  file: File,
  maxEdgePx = DEFAULT_MAX_EDGE_PX,
  quality = DEFAULT_WEBP_QUALITY,
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  if (!isVideoFile(file)) return null;

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const timeoutId = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("video_poster_timeout"));
      }, POSTER_TIMEOUT_MS);

      const finish = (err?: Error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        if (err) reject(err);
        else resolve();
      };

      video.onerror = () => finish(new Error("video_poster_decode_failed"));

      video.onloadeddata = () => {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        const seekTo =
          duration > 0 ? Math.min(0.1, Math.max(0.01, duration * 0.01)) : 0.1;

        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          finish();
        };

        video.addEventListener("seeked", onSeeked);
        try {
          video.currentTime = seekTo;
        } catch {
          video.removeEventListener("seeked", onSeeked);
          finish();
        }
      };

      video.src = objectUrl;
    });

    const vw = video.videoWidth || 0;
    const vh = video.videoHeight || 0;
    if (vw < 1 || vh < 1) return null;

    const scale = Math.min(1, maxEdgePx / Math.max(vw, vh));
    const width = Math.max(1, Math.round(vw * scale));
    const height = Math.max(1, Math.round(vh * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/webp", quality);
    });
  } catch {
    return null;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}
