/**
 * Fallback Safari / iOS : décoder via `<video>` (HEVC OK nativement) puis
 * encoder H.264 via mediabunny `CanvasSource` + WebCodecs.
 *
 * Parcours **seek frame-à-frame** (pas de `play()` / `captureStream`) :
 * plus fiable sur iOS que rAF pendant une lecture.
 *
 * V1 : piste vidéo seule (pas d’audio dans ce chemin).
 */

import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
} from "mediabunny";

export type HtmlVideoCanvasEncodePlan = {
  source: Blob;
  trimStartSec: number;
  requestedEncodeSec: number;
  outputWidth: number;
  outputHeight: number;
  signal?: AbortSignal;
};

const TARGET_FPS = 30;
const FRAME_DURATION = 1 / TARGET_FPS;

function aborted(signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted);
}

function waitLoadedData(video: HTMLVideoElement, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("video_load_timeout")), timeoutMs);
    const onError = () => {
      clearTimeout(timer);
      reject(new Error("video_load_failed"));
    };
    const onLoaded = () => {
      clearTimeout(timer);
      video.removeEventListener("error", onError);
      resolve();
    };
    video.addEventListener("error", onError, { once: true });
    video.addEventListener("loadeddata", onLoaded, { once: true });
  });
}

function waitSeeked(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(), 2_000);
    const onSeeked = () => {
      clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      reject(new Error("video_seek_failed"));
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    try {
      video.currentTime = timeSec;
    } catch {
      clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      resolve();
    }
  });
}

/**
 * Encode une fenêtre [trimStart, trimStart+duration] en MP4 H.264.
 */
export async function encodeMp4ViaHtmlVideoCanvas(
  plan: HtmlVideoCanvasEncodePlan,
): Promise<Uint8Array> {
  if (
    typeof document === "undefined" ||
    typeof VideoEncoder === "undefined" ||
    typeof HTMLVideoElement === "undefined"
  ) {
    throw new Error("html_video_canvas_unavailable");
  }

  if (aborted(plan.signal)) {
    throw new Error("video_prepare_cancelled");
  }

  const objectUrl = URL.createObjectURL(plan.source);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, plan.outputWidth);
  canvas.height = Math.max(2, plan.outputHeight);
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: false });
  if (!ctx) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("canvas_2d_unavailable");
  }

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });
  const videoSource = new CanvasSource(canvas, {
    codec: "avc",
    quality: QUALITY_HIGH,
    keyFrameInterval: 2,
    sizeChangeBehavior: "deny",
  });
  output.addVideoTrack(videoSource, { frameRate: TARGET_FPS });

  const cleanup = () => {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  };

  try {
    video.src = objectUrl;
    await waitLoadedData(video, 20_000);

    if (aborted(plan.signal)) {
      throw new Error("video_prepare_cancelled");
    }

    const mediaDuration = Number.isFinite(video.duration) ? video.duration : 0;
    const windowStart = Math.min(
      Math.max(0, plan.trimStartSec),
      Math.max(0, mediaDuration > 0 ? mediaDuration - FRAME_DURATION : 0),
    );
    const windowEnd = Math.min(
      windowStart + plan.requestedEncodeSec,
      mediaDuration > 0 ? mediaDuration : windowStart + plan.requestedEncodeSec,
    );

    if (!(windowEnd > windowStart)) {
      throw new Error("html_video_encode_empty_window");
    }

    await output.start();

    let frameIndex = 0;
    // Seek discret : une frame toutes les ~33 ms de timeline source.
    for (
      let t = windowStart;
      t < windowEnd - 1e-4;
      t += FRAME_DURATION
    ) {
      if (aborted(plan.signal)) {
        throw new Error("video_prepare_cancelled");
      }

      await waitSeeked(video, t);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const timestamp = Math.max(0, t - windowStart);
      try {
        await videoSource.add(timestamp, FRAME_DURATION);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "canvas_encode_failed";
        throw new Error(`canvas_encode_failed:${msg}`);
      }
      frameIndex += 1;

      // Plafond sécurité (~300 frames pour 10 s).
      if (frameIndex > TARGET_FPS * 12) {
        break;
      }
    }

    if (frameIndex < 1) {
      throw new Error("html_video_encode_no_frames");
    }

    videoSource.close();
    await output.finalize();

    if (aborted(plan.signal)) {
      throw new Error("video_prepare_cancelled");
    }

    const buffer = target.buffer;
    if (!buffer || buffer.byteLength < 8) {
      throw new Error("empty_output");
    }
    return new Uint8Array(buffer);
  } finally {
    cleanup();
  }
}
