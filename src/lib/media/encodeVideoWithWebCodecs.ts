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

import { fitVideoEncodeSize } from "@/src/lib/media/fitVideoEncodeSize";
import { measurePreparedVideoDuration } from "@/src/lib/media/measurePreparedVideoDuration";
import {
  VIDEO_DURATION_CEILING_SEC,
  assessOutputDuration,
  assessSourceDuration,
  requestedEncodeDurationSec,
} from "@/src/lib/media/videoDurationContract";

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

function aborted(signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted);
}

async function defaultEncodeToMp4(plan: WebCodecsEncodePlan): Promise<Uint8Array> {
  if (typeof VideoEncoder === "undefined") {
    throw new Error("webcodecs_unavailable");
  }

  const trimEnd = plan.trimStartSec + plan.requestedEncodeSec;
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });

  const input = new Input({
    source: new BlobSource(plan.source),
    formats: ALL_FORMATS,
  });

  const conversion = await Conversion.init({
    input,
    output,
    tracks: "primary",
    showWarnings: false,
    // Toujours repasser par WebCodecs pour une sortie bornée / normalisée.
    copy: false,
    trim: {
      start: plan.trimStartSec,
      end: trimEnd,
    },
    video: {
      width: plan.outputWidth,
      height: plan.outputHeight,
      // Ratio déjà calculé par fitVideoEncodeSize → pas d'étirement.
      fit: "contain",
      codec: "avc",
      quality: QUALITY_HIGH,
      rotate: plan.rotationDegrees,
      // Orientation affichable sans dépendre seulement des métadonnées.
      allowTransformationMetadata: false,
      forceTranscode: true,
    },
    audio: {
      codec: "aac",
      quality: QUALITY_HIGH,
    },
  });

  if (!conversion.isValid) {
    throw new Error("conversion_invalid");
  }

  if (aborted(plan.signal)) {
    conversion.cancel();
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
  return new Uint8Array(buffer);
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
  } catch (err) {
    if (
      aborted(signal) ||
      (err instanceof Error && err.message === "video_prepare_cancelled")
    ) {
      return { ok: false, error: "video_prepare_cancelled" };
    }
    return { ok: false, error: "video_encode_failed" };
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
