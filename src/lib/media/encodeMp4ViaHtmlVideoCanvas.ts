/**
 * Fallback Safari / iOS : vidéo via `<video>` + canvas → H.264 @ 30 fps,
 * audio : copie paquets AAC (sans re-decode WebCodecs) sur la fenêtre trim.
 *
 * Capture : lecture temps réel + sample 30 fps (downsample 60/120 iPhone),
 * seek discret en secours si `play()` impossible. Pas de `captureStream`.
 * Si pas d’AAC copiable / pas d’audio : vidéo seule (mieux que l’échec total).
 */

import {
  ALL_FORMATS,
  AudioSampleSink,
  AudioSampleSource,
  BlobSource,
  BufferTarget,
  CanvasSource,
  EncodedAudioPacketSource,
  EncodedPacketSink,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  type EncodedPacket,
  type InputAudioTrack,
} from "mediabunny";

import { VIDEO_DURATION_CEILING_SEC } from "@/src/lib/media/videoDurationContract";

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
/** Évite un moov mesuré > 10,0 s (arrondis timestamps / dernière frame). */
const OUTPUT_DURATION_SAFE_SEC = VIDEO_DURATION_CEILING_SEC - 0.05;

type AttachedAudio = {
  input: Input;
  close: () => void;
  pump: (
    windowStart: number,
    encodeDurationSec: number,
    signal?: AbortSignal,
  ) => Promise<void>;
};

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

function waitSeeked(
  video: HTMLVideoElement,
  timeSec: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (aborted(signal)) {
      reject(new Error("video_prepare_cancelled"));
      return;
    }
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, 2_000);
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      pauseVideoSafe(video);
      reject(new Error("video_prepare_cancelled"));
    };
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("video_seek_failed"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    try {
      video.currentTime = timeSec;
    } catch {
      cleanup();
      resolve();
    }
  });
}

/**
 * Attend que currentTime atteigne target (lecture temps réel).
 * Fiable sur sources 60/120 fps iPhone où le seek discret rate souvent.
 */
function waitUntilPlaybackTime(
  video: HTMLVideoElement,
  targetSec: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (aborted(signal)) {
      reject(new Error("video_prepare_cancelled"));
      return;
    }
    if (video.currentTime >= targetSec - 0.005) {
      resolve();
      return;
    }

    let raf = 0;
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, 4_000);

    const cleanup = () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      video.removeEventListener("timeupdate", onTick);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };

    const onAbort = () => {
      cleanup();
      pauseVideoSafe(video);
      reject(new Error("video_prepare_cancelled"));
    };
    const onError = () => {
      cleanup();
      reject(new Error("video_playback_failed"));
    };
    const onEnded = () => {
      cleanup();
      resolve();
    };
    const onTick = () => {
      if (aborted(signal)) {
        onAbort();
        return;
      }
      if (video.currentTime >= targetSec - 0.005) {
        cleanup();
        resolve();
      }
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    video.addEventListener("timeupdate", onTick);
    video.addEventListener("ended", onEnded, { once: true });
    video.addEventListener("error", onError, { once: true });

    const pump = () => {
      onTick();
      if (video.currentTime < targetSec - 0.005) {
        raf = requestAnimationFrame(pump);
      }
    };
    raf = requestAnimationFrame(pump);
  });
}

type CanvasVideoSource = {
  add: (timestamp: number, duration: number) => Promise<void>;
};

/**
 * Capture à 30 fps pendant lecture (downsample 60/120 → 30).
 * Retourne le nombre de frames ; 0 si play() impossible.
 */
async function captureFramesViaPlayback(
  video: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  videoSource: CanvasVideoSource,
  windowStart: number,
  encodeDurationSec: number,
  signal?: AbortSignal,
): Promise<number> {
  await waitSeeked(video, windowStart, signal);
  video.muted = true;
  try {
    await video.play();
  } catch {
    return 0;
  }

  let frameIndex = 0;
  try {
    for (
      let timestamp = 0;
      timestamp < encodeDurationSec - 1e-4;
      timestamp += FRAME_DURATION
    ) {
      if (aborted(signal)) {
        throw new Error("video_prepare_cancelled");
      }
      const targetMediaTime = windowStart + timestamp;
      await waitUntilPlaybackTime(video, targetMediaTime, signal);

      ctx.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
      const remaining = encodeDurationSec - timestamp;
      if (remaining <= 1e-4) break;
      const sampleDuration = Math.min(FRAME_DURATION, remaining);
      await videoSource.add(timestamp, sampleDuration);
      frameIndex += 1;

      if (frameIndex >= Math.ceil(OUTPUT_DURATION_SAFE_SEC * TARGET_FPS) + 1) {
        break;
      }
    }
  } finally {
    pauseVideoSafe(video);
  }
  return frameIndex;
}

function pauseVideoSafe(video: HTMLVideoElement) {
  try {
    video.pause();
  } catch {
    // ignore
  }
}

/** Secours : seek discret (moins fiable sur 120 fps). */
async function captureFramesViaSeek(
  video: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  videoSource: CanvasVideoSource,
  windowStart: number,
  encodeDurationSec: number,
  signal?: AbortSignal,
): Promise<number> {
  let frameIndex = 0;
  for (
    let t = windowStart;
    t < windowStart + encodeDurationSec - 1e-4;
    t += FRAME_DURATION
  ) {
    if (aborted(signal)) {
      throw new Error("video_prepare_cancelled");
    }
    await waitSeeked(video, t, signal);
    ctx.drawImage(video, 0, 0, ctx.canvas.width, ctx.canvas.height);
    const timestamp = Math.max(0, t - windowStart);
    const remaining = encodeDurationSec - timestamp;
    if (remaining <= 1e-4) break;
    const sampleDuration = Math.min(FRAME_DURATION, remaining);
    await videoSource.add(timestamp, sampleDuration);
    frameIndex += 1;
    if (frameIndex >= Math.ceil(OUTPUT_DURATION_SAFE_SEC * TARGET_FPS) + 1) {
      break;
    }
  }
  return frameIndex;
}

/**
 * Préfère la copie de paquets AAC (pas de AudioDecoder — fiable iOS/HEVC).
 * Sinon re-encode via AudioSampleSource si canDecode.
 */
async function tryAttachAudio(
  output: Output,
  source: Blob,
): Promise<AttachedAudio | null> {
  const input = new Input({
    source: new BlobSource(source),
    formats: ALL_FORMATS,
  });

  let audioTrack: InputAudioTrack | null;
  try {
    audioTrack = await input.getPrimaryAudioTrack();
  } catch {
    return null;
  }
  if (!audioTrack) return null;

  const codec = await audioTrack.getCodec();

  // 1) Copie paquets AAC (chemin iPhone HEVC typique).
  if (codec === "aac") {
    const packetSource = new EncodedAudioPacketSource("aac");
    output.addAudioTrack(packetSource);
    const packetSink = new EncodedPacketSink(audioTrack);
    const decoderConfig = await audioTrack.getDecoderConfig();

    return {
      input,
      close: () => {
        try {
          packetSource.close();
        } catch {
          // ignore
        }
      },
      pump: async (windowStart, encodeDurationSec, signal) => {
        const windowEnd = windowStart + encodeDurationSec;
        const startPacket =
          (await packetSink.getPacket(windowStart)) ??
          (await packetSink.getFirstPacket());
        if (!startPacket) return;

        let wroteMeta = false;
        let count = 0;

        for await (const packet of packetSink.packets(startPacket)) {
          if (aborted(signal)) {
            throw new Error("video_prepare_cancelled");
          }
          if (packet.timestamp >= windowEnd) break;
          if (packet.timestamp + packet.duration <= windowStart) continue;

          const shiftedTs = Math.max(0, packet.timestamp - windowStart);
          if (shiftedTs >= encodeDurationSec) break;

          const shifted: EncodedPacket = packet.clone({
            timestamp: shiftedTs,
          });

          if (!wroteMeta && decoderConfig) {
            await packetSource.add(shifted, { decoderConfig });
            wroteMeta = true;
          } else {
            await packetSource.add(shifted);
          }
          count += 1;
        }

        if (count < 1) {
          throw new Error("audio_packet_copy_empty");
        }
        packetSource.close();
      },
    };
  }

  // 2) Re-encode si WebCodecs AudioDecoder dispo.
  const canDecode = await audioTrack.canDecode();
  if (!canDecode) return null;

  const sampleSource = new AudioSampleSource({
    codec: "aac",
    quality: QUALITY_HIGH,
  });
  output.addAudioTrack(sampleSource);
  const sampleSink = new AudioSampleSink(audioTrack);

  return {
    input,
    close: () => {
      try {
        sampleSource.close();
      } catch {
        // ignore
      }
    },
    pump: async (windowStart, encodeDurationSec, signal) => {
      const windowEnd = windowStart + encodeDurationSec;
      let count = 0;
      for await (const sample of sampleSink.samples(windowStart, windowEnd)) {
        if (aborted(signal)) {
          sample.close();
          throw new Error("video_prepare_cancelled");
        }
        const shifted = sample.timestamp - windowStart;
        if (shifted + sample.duration <= 0) {
          sample.close();
          continue;
        }
        if (shifted >= encodeDurationSec) {
          sample.close();
          break;
        }
        sample.setTimestamp(Math.max(0, shifted));
        await sampleSource.add(sample);
        sample.close();
        count += 1;
      }
      if (count < 1) {
        throw new Error("audio_sample_empty");
      }
      sampleSource.close();
    },
  };
}

/**
 * Encode une fenêtre [trimStart, trimStart+duration] en MP4 H.264 (+ AAC si possible).
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

  let attachedAudio: AttachedAudio | null = null;
  try {
    attachedAudio = await tryAttachAudio(output, plan.source);
  } catch {
    attachedAudio = null;
  }

  const cleanup = () => {
    plan.signal?.removeEventListener("abort", onAbortPause);
    pauseVideoSafe(video);
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  };

  const onAbortPause = () => {
    pauseVideoSafe(video);
  };
  plan.signal?.addEventListener("abort", onAbortPause);

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
    const requested = Math.min(
      Math.max(0, plan.requestedEncodeSec),
      OUTPUT_DURATION_SAFE_SEC,
    );
    const windowEnd = Math.min(
      windowStart + requested,
      mediaDuration > 0 ? mediaDuration : windowStart + requested,
    );
    const encodeDurationSec = Math.min(
      Math.max(0, windowEnd - windowStart),
      OUTPUT_DURATION_SAFE_SEC,
    );

    if (!(encodeDurationSec > 0)) {
      throw new Error("html_video_encode_empty_window");
    }

    await output.start();

    // 120/60 fps iPhone : lecture temps réel + sample 30 fps.
    // Si play() impossible (0 frame) → seek discret (ne pas mixer les deux).
    let frameIndex = 0;
    try {
      frameIndex = await captureFramesViaPlayback(
        video,
        ctx,
        videoSource,
        windowStart,
        encodeDurationSec,
        plan.signal,
      );
    } catch (err) {
      if (
        aborted(plan.signal) ||
        (err instanceof Error && err.message === "video_prepare_cancelled")
      ) {
        throw err instanceof Error
          ? err
          : new Error("video_prepare_cancelled");
      }
      frameIndex = 0;
    }

    if (frameIndex < 1) {
      try {
        frameIndex = await captureFramesViaSeek(
          video,
          ctx,
          videoSource,
          windowStart,
          encodeDurationSec,
          plan.signal,
        );
      } catch (seekErr) {
        const msg =
          seekErr instanceof Error ? seekErr.message : "canvas_encode_failed";
        throw new Error(`canvas_encode_failed:${msg}`);
      }
    }

    if (frameIndex < 1) {
      throw new Error("html_video_encode_no_frames");
    }

    videoSource.close();

    if (attachedAudio) {
      try {
        await attachedAudio.pump(
          windowStart,
          encodeDurationSec,
          plan.signal,
        );
      } catch (err) {
        if (
          aborted(plan.signal) ||
          (err instanceof Error && err.message === "video_prepare_cancelled")
        ) {
          throw err instanceof Error
            ? err
            : new Error("video_prepare_cancelled");
        }
        // Soft-fail audio : finalise vidéo seule.
        attachedAudio.close();
      }
    }

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
