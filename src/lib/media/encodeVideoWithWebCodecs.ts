/**
 * Commit 5 S7 — encodage WebCodecs → MP4 muxé.
 *
 * Mux / encode : `mediabunny` (Conversion API, WebCodecs sous le capot) →
 * `Mp4OutputFormat` + `BufferTarget`. Remplace le déprécié `mp4-muxer`.
 *
 * Contrat durée :
 * - durée **demandée** ≤ `VIDEO_DURATION_CEILING_SEC` (Commit 2)
 * - durée **effective** mesurée sur le fichier muxé via
 *   `measurePreparedVideoDuration` (moov), puis `assessOutputDuration`
 * - jamais déduite du nombre de frames ni du temps d'encodage
 * - fail-closed si non mesurable ; jamais d'original brut en fallback
 *
 * @see docs/product/COFFRE_MONTAGE_MEDIA_INGEST.md §7.1 · §7.5
 */

import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
} from "mediabunny";

import { encodeMp4ViaHtmlVideoCanvas } from "@/src/lib/media/encodeMp4ViaHtmlVideoCanvas";
import {
  assertPreparedMp4Container,
  remuxBlobToMp4,
} from "@/src/lib/media/ensurePreparedMp4Bytes";
import { fitVideoEncodeSize } from "@/src/lib/media/fitVideoEncodeSize";
import { measurePreparedVideoDuration } from "@/src/lib/media/measurePreparedVideoDuration";
import { probeMp4Container } from "@/src/lib/media/probeMp4Container";
import {
  VIDEO_DURATION_CEILING_SEC,
  assessOutputDuration,
  assessSourceDuration,
  requestedEncodeDurationSec,
} from "@/src/lib/media/videoDurationContract";

function aborted(signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted);
}

/** Sortie V1 : ~30 fps (sources 60/120 downsamplées, même durée). */
export const PREPARE_OUTPUT_FRAME_RATE = 30;

/**
 * Politique Conversion : ne jamais discard l’audio si la source en a
 * (QA IMG_4679 : discard pour passer 10 s → MP4 muet).
 */
export function conversionEncodePolicy(sourceHasAudio: boolean): {
  discardAudio: boolean;
  durationMarginsSec: number[];
  outputFrameRate: number;
} {
  return {
    discardAudio: !sourceHasAudio,
    durationMarginsSec: sourceHasAudio ? [0.05, 0.12, 0.25, 0.4] : [0.05],
    outputFrameRate: PREPARE_OUTPUT_FRAME_RATE,
  };
}

function bytesToMp4Blob(bytes: Uint8Array): Blob {
  return new Blob(
    [
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer,
    ],
    { type: "video/mp4" },
  );
}

/**
 * Garantit un MP4 H.264 admissible. Si le mux WebCodecs sort du HEVC
 * (ou autre hors contrat), tente un remux/transcode forcé ; sinon échec
 * pour laisser le fallback MediaRecorder tourner.
 */
async function ensureAdmissibleMp4Bytes(
  mp4Bytes: Uint8Array,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  try {
    await assertPreparedMp4Container(mp4Bytes);
    return mp4Bytes;
  } catch (err) {
    if (
      aborted(signal) ||
      (err instanceof Error && err.message === "video_prepare_cancelled")
    ) {
      throw new Error("video_prepare_cancelled");
    }
  }

  return remuxBlobToMp4(bytesToMp4Blob(mp4Bytes), signal);
}

export type WebCodecsEncodeErrorCode =
  | "video_duration_unknown"
  | "video_duration_exceeds_limit"
  | "video_output_duration_exceeds_limit"
  | "video_encode_failed"
  | "video_prepare_cancelled"
  | "video_dimensions_invalid";

export type WebCodecsEncodeSuccess = {
  ok: true;
  preparedFile: File;
  /** Consigne passée à l'encodeur (≤ 10). Ce n'est pas une preuve produit. */
  requestedEncodeSec: number;
  /** Durée lue dans le fichier muxé, validée ≤ 10,0 s. */
  effectiveDurationSec: number;
  outputWidth: number;
  outputHeight: number;
};

export type WebCodecsEncodeFailure = {
  ok: false;
  error: WebCodecsEncodeErrorCode;
  /** Message technique (lab / logs) ; jamais affiché famille. */
  detail?: string;
};

export type WebCodecsEncodeResult = WebCodecsEncodeSuccess | WebCodecsEncodeFailure;

export type WebCodecsEncodePlan = {
  source: Blob;
  trimStartSec: number;
  requestedEncodeSec: number;
  outputWidth: number;
  outputHeight: number;
  /** Rotation additionnelle (sens horaire), en plus des métadonnées source. */
  rotationDegrees: 0 | 90 | 180 | 270;
  signal?: AbortSignal;
};

export type WebCodecsEncodeHost = {
  /**
   * Produit les octets MP4 muxés. Ne doit PAS servir de source de vérité
   * pour la durée produit (mesurée ensuite sur le buffer).
   */
  encodeToMp4: (plan: WebCodecsEncodePlan) => Promise<Uint8Array>;
};

export type EncodeVideoWithWebCodecsOptions = {
  signal?: AbortSignal;
  /** Début de la fenêtre dans la source (s). Défaut 0. */
  trimStartSec?: number;
  /** Durée source déjà connue (s). Obligatoire pour le contrat. */
  sourceDurationSec: number;
  orientedWidth: number;
  orientedHeight: number;
  rotationDegrees?: 0 | 90 | 180 | 270;
  /** Injection tests. */
  host?: WebCodecsEncodeHost;
  /** Injection tests : mesure post-mux (défaut = moov via mp4box). */
  measureDuration?: typeof measurePreparedVideoDuration;
};

function discardedReasons(conversion: Conversion): string {
  return conversion.discardedTracks
    .map((d) => d.reason)
    .filter(Boolean)
    .join(",");
}

async function encodeMp4ViaConversion(
  plan: WebCodecsEncodePlan,
): Promise<Uint8Array> {
  const input = new Input({
    source: new BlobSource(plan.source),
    formats: ALL_FORMATS,
  });

  // QA lab IMG_4679 : discard audio pour « sauver » la durée → MP4 muet.
  // Si la source a de l’audio, on ne jette plus la piste : marges plus
  // serrées, puis échec → secours canvas (copie AAC). Muet seulement si
  // la source n’a pas d’audio.
  const sourceAudio = await input.getPrimaryAudioTrack();
  const sourceHasAudio = Boolean(sourceAudio);
  const policy = conversionEncodePolicy(sourceHasAudio);

  // V1 : plafonner à 30 fps (sources iPhone 60/120). Sans ça, Conversion
  // conserve le framerate source → encode lourd / preview bizarre.
  const baseVideo = {
    width: plan.outputWidth,
    height: plan.outputHeight,
    fit: "contain" as const,
    codec: "avc" as const,
    quality: QUALITY_HIGH,
    rotate: plan.rotationDegrees,
    allowTransformationMetadata: false,
    forceTranscode: true,
    frameRate: policy.outputFrameRate,
  };

  type AudioAttempt =
    | { codec: "aac"; quality: typeof QUALITY_HIGH; forceTranscode: true }
    | { discard: true };

  const audioAttempts: AudioAttempt[] = policy.discardAudio
    ? [{ discard: true }]
    : [
        {
          codec: "aac",
          quality: QUALITY_HIGH,
          forceTranscode: true,
        },
      ];

  const durationMarginsSec = policy.durationMarginsSec;

  let lastReasons = "unknown";

  for (const margin of durationMarginsSec) {
    const safeEncodeSec = Math.min(
      plan.requestedEncodeSec,
      VIDEO_DURATION_CEILING_SEC - margin,
    );
    if (!(safeEncodeSec > 0)) continue;
    const trimEnd = plan.trimStartSec + safeEncodeSec;

    for (const audio of audioAttempts) {
      const target = new BufferTarget();
      const output = new Output({
        format: new Mp4OutputFormat({ fastStart: "in-memory" }),
        target,
      });

      const conversion = await Conversion.init({
        input,
        output,
        tracks: "primary",
        showWarnings: false,
        copy: false,
        trim: {
          start: plan.trimStartSec,
          end: trimEnd,
        },
        video: baseVideo,
        audio,
      });

      if (!conversion.isValid) {
        lastReasons = discardedReasons(conversion) || lastReasons;
        continue;
      }

      // HEVC souvent : vidéo discardée, seule l’audio reste → isValid true
      // mais MP4 sans piste vidéo (QA : video_track_count_invalid).
      const hasVideoTrack = conversion.utilizedTracks.some((t) =>
        t.isVideoTrack(),
      );
      if (!hasVideoTrack) {
        lastReasons =
          discardedReasons(conversion) || "no_utilized_video_track";
        continue;
      }

      if (aborted(plan.signal)) {
        void conversion.cancel();
        throw new Error("video_prepare_cancelled");
      }

      const onAbort = () => {
        void conversion.cancel();
      };
      plan.signal?.addEventListener("abort", onAbort, { once: true });

      try {
        await conversion.execute();
      } finally {
        plan.signal?.removeEventListener("abort", onAbort);
      }

      if (aborted(plan.signal)) {
        throw new Error("video_prepare_cancelled");
      }

      const buffer = target.buffer;
      if (!buffer || buffer.byteLength < 8) {
        throw new Error("empty_output");
      }

      const bytes = new Uint8Array(buffer);
      // Refuse un mux « réussi » hors contrat (ex. audio-only) → canvas.
      try {
        await assertPreparedMp4Container(bytes);
      } catch {
        lastReasons = discardedReasons(conversion) || "container_ineligible";
        continue;
      }

      const measured = await measurePreparedVideoDuration(bytes);
      if (
        !measured.ok ||
        measured.seconds > VIDEO_DURATION_CEILING_SEC
      ) {
        lastReasons = measured.ok
          ? `output_duration:${measured.seconds.toFixed(3)}`
          : "output_duration_unknown";
        continue;
      }

      // Garde-fou : source sonore → refuse un succès sans piste audio.
      if (sourceHasAudio) {
        const probe = await probeMp4Container(bytes);
        if (probe.audioTrackCount < 1) {
          lastReasons = "audio_stripped";
          continue;
        }
      }

      return bytes;
    }
  }

  throw new Error(`conversion_invalid:${lastReasons}`);
}

/**
 * 1) Conversion mediabunny si VideoDecoder OK (H.264/HEVC selon device).
 * 2) Sinon `<video>` + canvas (HEVC/ProRes HTML-only : VideoDecoder KO).
 * ProRes / codecs hors WebCodecs : on saute Conversion (évite hang) → canvas.
 */
async function defaultEncodeToMp4(plan: WebCodecsEncodePlan): Promise<Uint8Array> {
  if (typeof VideoEncoder === "undefined") {
    throw new Error("webcodecs_unavailable");
  }

  if (aborted(plan.signal)) {
    throw new Error("video_prepare_cancelled");
  }

  let webCodecsVideoDecodable = true;
  let sourceVideoCodec: string | null = null;
  try {
    const probeInput = new Input({
      source: new BlobSource(plan.source),
      formats: ALL_FORMATS,
    });
    const videoTrack = await probeInput.getPrimaryVideoTrack();
    if (videoTrack) {
      sourceVideoCodec = await videoTrack.getCodec();
      webCodecsVideoDecodable = await videoTrack.canDecode();
    }
  } catch {
    webCodecsVideoDecodable = true; // tenter Conversion quand même
  }

  let conversionError = "conversion_skipped";
  if (webCodecsVideoDecodable) {
    try {
      return await encodeMp4ViaConversion(plan);
    } catch (err) {
      if (
        aborted(plan.signal) ||
        (err instanceof Error && err.message === "video_prepare_cancelled")
      ) {
        throw new Error("video_prepare_cancelled");
      }
      conversionError = err instanceof Error ? err.message : String(err);
    }
  } else {
    conversionError = `video_undecodable_webcodecs:${sourceVideoCodec ?? "unknown"}`;
  }

  if (aborted(plan.signal)) {
    throw new Error("video_prepare_cancelled");
  }

  try {
    const bytes = await encodeMp4ViaHtmlVideoCanvas({
      source: plan.source,
      trimStartSec: plan.trimStartSec,
      requestedEncodeSec: plan.requestedEncodeSec,
      outputWidth: plan.outputWidth,
      outputHeight: plan.outputHeight,
      signal: plan.signal,
    });
    await assertPreparedMp4Container(bytes);
    return bytes;
  } catch (err) {
    if (
      aborted(plan.signal) ||
      (err instanceof Error && err.message === "video_prepare_cancelled")
    ) {
      throw new Error("video_prepare_cancelled");
    }
    const canvasError = err instanceof Error ? err.message : String(err);
    throw new Error(`${conversionError} || canvas:${canvasError}`);
  }
}

/**
 * Encode + mux MP4, puis valide la durée **effective** du fichier produit.
 */
export async function encodeVideoWithWebCodecs(
  source: Blob,
  options: EncodeVideoWithWebCodecsOptions,
): Promise<WebCodecsEncodeResult> {
  const {
    signal,
    trimStartSec = 0,
    sourceDurationSec,
    orientedWidth,
    orientedHeight,
    rotationDegrees = 0,
  } = options;

  if (aborted(signal)) {
    return { ok: false, error: "video_prepare_cancelled" };
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
  if (!(requestedEncodeSec > 0) || requestedEncodeSec > VIDEO_DURATION_CEILING_SEC) {
    return { ok: false, error: "video_duration_exceeds_limit" };
  }

  if (
    !Number.isFinite(orientedWidth) ||
    !Number.isFinite(orientedHeight) ||
    orientedWidth < 1 ||
    orientedHeight < 1
  ) {
    return { ok: false, error: "video_dimensions_invalid" };
  }

  const size = fitVideoEncodeSize(orientedWidth, orientedHeight);
  const host = options.host ?? { encodeToMp4: defaultEncodeToMp4 };
  const measure = options.measureDuration ?? measurePreparedVideoDuration;

  let mp4Bytes: Uint8Array;
  try {
    mp4Bytes = await host.encodeToMp4({
      source,
      trimStartSec,
      requestedEncodeSec,
      outputWidth: size.width,
      outputHeight: size.height,
      rotationDegrees,
      signal,
    });
    mp4Bytes = await ensureAdmissibleMp4Bytes(mp4Bytes, signal);
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

  // Vérité produit : durée lue dans le fichier muxé, pas la consigne encodeur.
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
    [mp4Bytes.buffer.slice(mp4Bytes.byteOffset, mp4Bytes.byteOffset + mp4Bytes.byteLength) as ArrayBuffer],
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
  };
}
