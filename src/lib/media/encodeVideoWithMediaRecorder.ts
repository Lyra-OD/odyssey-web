/**
 * Commit 6 S7 — fallback MediaRecorder + AudioContext silencieux.
 *
 * Quand WebCodecs n'est pas disponible / utilisable. Ne contourne pas le
 * contrat durée : après finalisation, `ensurePreparedMp4Bytes` (MP4 natif
 * ou remux WebM→MP4 via mediabunny) puis mesure moov + `assessOutputDuration`.
 *
 * Un blob WebM n'est **jamais** accepté comme fichier préparé S7.
 * AudioContext : destination muette (pas de haut-parleurs) ; `resume()`
 * appelé ici — l'appelant doit invoquer ce module depuis un geste utilisateur.
 *
 * @see docs/product/COFFRE_MONTAGE_MEDIA_INGEST.md §7.5
 */

import { ensurePreparedMp4Bytes } from "@/src/lib/media/ensurePreparedMp4Bytes";
import { fitVideoEncodeSize } from "@/src/lib/media/fitVideoEncodeSize";
import { measurePreparedVideoDuration } from "@/src/lib/media/measurePreparedVideoDuration";
import {
  VIDEO_DURATION_CEILING_SEC,
  assessOutputDuration,
  assessSourceDuration,
  requestedEncodeDurationSec,
} from "@/src/lib/media/videoDurationContract";

export type MediaRecorderEncodeErrorCode =
  | "video_duration_unknown"
  | "video_duration_exceeds_limit"
  | "video_output_duration_exceeds_limit"
  | "video_encode_failed"
  | "video_prepare_cancelled"
  | "video_dimensions_invalid";

export type MediaRecorderEncodeSuccess = {
  ok: true;
  preparedFile: File;
  requestedEncodeSec: number;
  effectiveDurationSec: number;
  outputWidth: number;
  outputHeight: number;
  /** Conteneur brut avant normalisation MP4 (diagnostic). */
  recorderMimeType: string;
};

export type MediaRecorderEncodeFailure = {
  ok: false;
  error: MediaRecorderEncodeErrorCode;
  /** Message technique (lab / logs) ; jamais affiché famille. */
  detail?: string;
};

export type MediaRecorderEncodeResult =
  | MediaRecorderEncodeSuccess
  | MediaRecorderEncodeFailure;

export type MediaRecorderEncodePlan = {
  source: Blob;
  trimStartSec: number;
  requestedEncodeSec: number;
  outputWidth: number;
  outputHeight: number;
  signal?: AbortSignal;
};

export type MediaRecorderEncodeHost = {
  isSupported: () => boolean;
  /** Enregistre et renvoie le blob brut (souvent WebM ou MP4). */
  record: (plan: MediaRecorderEncodePlan) => Promise<Blob>;
};

export type EncodeVideoWithMediaRecorderOptions = {
  signal?: AbortSignal;
  trimStartSec?: number;
  sourceDurationSec: number;
  orientedWidth: number;
  orientedHeight: number;
  host?: MediaRecorderEncodeHost;
  measureDuration?: typeof measurePreparedVideoDuration;
  ensureMp4?: typeof ensurePreparedMp4Bytes;
};

const PREFERRED_MIME_TYPES = [
  "video/mp4",
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
] as const;

function aborted(signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted);
}

export function pickMediaRecorderMimeType(
  isTypeSupported: (mime: string) => boolean = (m) =>
    typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m),
): string | null {
  for (const mime of PREFERRED_MIME_TYPES) {
    if (isTypeSupported(mime)) return mime;
  }
  return null;
}

function defaultIsSupported(): boolean {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLVideoElement !== "undefined" &&
    pickMediaRecorderMimeType() !== null
  );
}

/**
 * Piste audio silencieuse : GainNode à 0 → MediaStreamDestination.
 * Jamais connectée à `audioContext.destination` (haut-parleurs).
 */
export async function createSilentAudioTrack(
  audioContext: AudioContext,
): Promise<{ track: MediaStreamTrack; stop: () => void }> {
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  const dest = audioContext.createMediaStreamDestination();
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  gain.gain.value = 0;
  osc.connect(gain);
  gain.connect(dest);
  // Intentionnel : pas de `gain.connect(audioContext.destination)`.
  osc.start();
  const track = dest.stream.getAudioTracks()[0];
  if (!track) {
    osc.stop();
    throw new Error("silent_audio_track_missing");
  }
  return {
    track,
    stop: () => {
      try {
        osc.stop();
      } catch {
        // ignore
      }
      try {
        osc.disconnect();
      } catch {
        // ignore
      }
      try {
        gain.disconnect();
      } catch {
        // ignore
      }
      try {
        track.stop();
      } catch {
        // ignore
      }
    },
  };
}

async function defaultRecord(plan: MediaRecorderEncodePlan): Promise<Blob> {
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("mediarecorder_unavailable");
  }

  const mimeType = pickMediaRecorderMimeType();
  if (!mimeType) {
    throw new Error("mediarecorder_mime_unsupported");
  }

  const objectUrl = URL.createObjectURL(plan.source);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  let audioCtx: AudioContext | null = null;
  let stopSilent: (() => void) | null = null;
  let recorder: MediaRecorder | null = null;
  let composed: MediaStream | null = null;
  const recordedChunks: BlobPart[] = [];

  const cleanup = () => {
    try {
      if (recorder && recorder.state !== "inactive") recorder.stop();
    } catch {
      // ignore
    }
    stopSilent?.();
    stopSilent = null;
    composed?.getTracks().forEach((t) => {
      try {
        t.stop();
      } catch {
        // ignore
      }
    });
    composed = null;
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
    void audioCtx?.close().catch(() => undefined);
    audioCtx = null;
  };

  const onAbort = () => {
    cleanup();
  };
  plan.signal?.addEventListener("abort", onAbort, { once: true });

  try {
    if (aborted(plan.signal)) {
      throw new Error("video_prepare_cancelled");
    }

    await new Promise<void>((resolve, reject) => {
      video.onerror = () => reject(new Error("video_load_failed"));
      video.onloadeddata = () => resolve();
      video.src = objectUrl;
    });

    const seekTo = Math.min(
      plan.trimStartSec,
      Math.max(0, (Number.isFinite(video.duration) ? video.duration : 0) - 0.05),
    );
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked);
      try {
        video.currentTime = seekTo;
      } catch {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      }
    });

    if (aborted(plan.signal)) {
      throw new Error("video_prepare_cancelled");
    }

    const videoEl = video as HTMLVideoElement & {
      captureStream?: (frameRate?: number) => MediaStream;
    };
    const capture =
      typeof videoEl.captureStream === "function"
        ? videoEl.captureStream()
        : null;
    if (!capture) {
      throw new Error("capture_stream_unavailable");
    }

    composed = new MediaStream();
    for (const track of capture.getVideoTracks()) {
      composed.addTrack(track);
    }

    // Safari / certains moteurs exigent une piste audio pour `video/mp4`.
    if (capture.getAudioTracks().length === 0) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AC) {
        audioCtx = new AC();
        const silent = await createSilentAudioTrack(audioCtx);
        stopSilent = silent.stop;
        composed.addTrack(silent.track);
      }
    } else {
      for (const track of capture.getAudioTracks()) {
        composed.addTrack(track);
      }
    }

    recorder = new MediaRecorder(composed, { mimeType });
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) recordedChunks.push(ev.data);
    };

    const stopped = new Promise<void>((resolve, reject) => {
      recorder!.onerror = () => reject(new Error("mediarecorder_error"));
      recorder!.onstop = () => resolve();
    });

    recorder.start(200);
    await video.play().catch(() => undefined);

    await new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const abortWatch = () => {
        if (timer !== undefined) clearTimeout(timer);
        reject(new Error("video_prepare_cancelled"));
      };
      timer = setTimeout(() => {
        plan.signal?.removeEventListener("abort", abortWatch);
        resolve();
      }, plan.requestedEncodeSec * 1000);
      plan.signal?.addEventListener("abort", abortWatch, { once: true });
    });

    video.pause();
    if (recorder.state !== "inactive") {
      recorder.stop();
    }
    await stopped;

    if (aborted(plan.signal)) {
      throw new Error("video_prepare_cancelled");
    }

    const blob = new Blob(recordedChunks, { type: mimeType });
    if (blob.size < 1) {
      throw new Error("recorder_empty");
    }
    return blob;
  } finally {
    plan.signal?.removeEventListener("abort", onAbort);
    cleanup();
  }
}

/**
 * Fallback MediaRecorder → normalisation MP4 → validation durée effective.
 */
export async function encodeVideoWithMediaRecorder(
  source: Blob,
  options: EncodeVideoWithMediaRecorderOptions,
): Promise<MediaRecorderEncodeResult> {
  const {
    signal,
    trimStartSec = 0,
    sourceDurationSec,
    orientedWidth,
    orientedHeight,
  } = options;

  if (aborted(signal)) {
    return { ok: false, error: "video_prepare_cancelled" };
  }

  const host = options.host ?? {
    isSupported: defaultIsSupported,
    record: defaultRecord,
  };

  if (!host.isSupported()) {
    return {
      ok: false,
      error: "video_encode_failed",
      detail: "mediarecorder_unsupported",
    };
  }

  const sourceAssessment = assessSourceDuration(sourceDurationSec);
  if (!sourceAssessment.ok) {
    return { ok: false, error: sourceAssessment.error };
  }

  if (
    !Number.isFinite(trimStartSec) ||
    trimStartSec < 0 ||
    trimStartSec >= sourceAssessment.sourceSec
  ) {
    return { ok: false, error: "video_duration_unknown" };
  }

  const remaining = sourceAssessment.sourceSec - trimStartSec;
  if (!(remaining > 0)) {
    return { ok: false, error: "video_duration_unknown" };
  }

  const requestedEncodeSec = Math.min(
    requestedEncodeDurationSec(remaining),
    VIDEO_DURATION_CEILING_SEC,
  );

  if (
    !Number.isFinite(orientedWidth) ||
    !Number.isFinite(orientedHeight) ||
    orientedWidth < 1 ||
    orientedHeight < 1
  ) {
    return { ok: false, error: "video_dimensions_invalid" };
  }

  const size = fitVideoEncodeSize(orientedWidth, orientedHeight);
  const measure = options.measureDuration ?? measurePreparedVideoDuration;
  const ensureMp4 = options.ensureMp4 ?? ensurePreparedMp4Bytes;

  let recorderBlob: Blob;
  try {
    recorderBlob = await host.record({
      source,
      trimStartSec,
      requestedEncodeSec,
      outputWidth: size.width,
      outputHeight: size.height,
      signal,
    });
  } catch (err) {
    if (
      aborted(signal) ||
      (err instanceof Error && err.message === "video_prepare_cancelled")
    ) {
      return { ok: false, error: "video_prepare_cancelled" };
    }
    return {
      ok: false,
      error: "video_encode_failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (aborted(signal)) {
    return { ok: false, error: "video_prepare_cancelled" };
  }

  let mp4Bytes: Uint8Array;
  try {
    mp4Bytes = await ensureMp4(recorderBlob, signal);
  } catch (err) {
    if (
      aborted(signal) ||
      (err instanceof Error && err.message === "video_prepare_cancelled")
    ) {
      return { ok: false, error: "video_prepare_cancelled" };
    }
    return {
      ok: false,
      error: "video_encode_failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (aborted(signal)) {
    return { ok: false, error: "video_prepare_cancelled" };
  }

  const measured = await measure(mp4Bytes);
  if (!measured.ok) {
    return { ok: false, error: "video_duration_unknown" };
  }

  const outputAssessment = assessOutputDuration(measured.seconds);
  if (!outputAssessment.ok) {
    return { ok: false, error: outputAssessment.error };
  }

  if (aborted(signal)) {
    return { ok: false, error: "video_prepare_cancelled" };
  }

  const preparedFile = new File(
    [
      mp4Bytes.buffer.slice(
        mp4Bytes.byteOffset,
        mp4Bytes.byteOffset + mp4Bytes.byteLength,
      ) as ArrayBuffer,
    ],
    "prepared.mp4",
    { type: "video/mp4" },
  );

  return {
    ok: true,
    preparedFile,
    requestedEncodeSec,
    effectiveDurationSec: outputAssessment.effectiveSec,
    outputWidth: size.width,
    outputHeight: size.height,
    recorderMimeType: recorderBlob.type || "unknown",
  };
}
