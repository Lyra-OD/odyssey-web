/**
 * Commit 7 S7 — orchestrateur `prepareVideoForUpload`.
 *
 * Réunit les briques Commits 2–6 : probe, décodage, fast-path ou encode
 * (WebCodecs puis MediaRecorder), validation finale obligatoire.
 *
 * - Jamais d’`originalFile` en fallback si la préparation échoue.
 * - Fast-path seulement si conteneur admissible **et** décodable **et**
 *   dimensions V1 **et** durée source ≤ 10,0 s **et** trimStart = 0 ;
 *   la durée **effective** du candidat est re-mesurée en validation finale.
 * - Durée source inconnue / incohérente → refus (`video_duration_unknown`).
 * - MediaRecorder seulement si WebCodecs échoue de façon **récupérable**
 *   (`video_encode_failed`) ; jamais après annulation.
 * - Annulation : aucun résultat tardif ne devient un succès.
 *
 * Tranche 1 QA device (Safari iPhone) : **non validée** par ce module seul.
 * Branché au Coffre (Commit 11). S7 reste ⏳ jusqu’à l’épreuve Storage et base.
 *
 * @see docs/product/COFFRE_MONTAGE_MEDIA_INGEST.md §7
 */

import { encodeVideoWithMediaRecorder } from "@/src/lib/media/encodeVideoWithMediaRecorder";
import {
  encodeVideoWithWebCodecs,
  type WebCodecsEncodeErrorCode,
} from "@/src/lib/media/encodeVideoWithWebCodecs";
import { measurePreparedVideoDuration } from "@/src/lib/media/measurePreparedVideoDuration";
import { assessOrientedDimensions } from "@/src/lib/media/orientedVideoDimensions";
import { probeMp4Container } from "@/src/lib/media/probeMp4Container";
import {
  verifyBrowserVideoDecode,
  type BrowserVideoDecodeHost,
} from "@/src/lib/media/verifyBrowserVideoDecode";
import {
  assessOutputDuration,
  assessSourceDuration,
  sourceExceedsLimitWithoutEncode,
} from "@/src/lib/media/videoDurationContract";

/**
 * Erreurs WebCodecs pour lesquelles un secours MediaRecorder a du sens.
 * Annulation et échecs de contrat (durée / dims) ne sont **pas** récupérables.
 */
export function isRecoverableWebCodecsFailure(
  error: WebCodecsEncodeErrorCode,
): boolean {
  return error === "video_encode_failed";
}

export type PrepareVideoPath = "fast" | "webcodecs" | "mediarecorder";

export type PrepareVideoErrorCode =
  | "video_duration_unknown"
  | "video_duration_exceeds_limit"
  | "video_output_duration_exceeds_limit"
  | "video_fast_path_ineligible"
  | "video_decode_failed"
  | "video_dimensions_invalid"
  | "video_dimensions_exceed_limit"
  | "video_encode_failed"
  | "video_prepare_cancelled";

export type PrepareVideoSuccess = {
  ok: true;
  preparedFile: File;
  path: PrepareVideoPath;
  sourceDurationSec: number;
  effectiveDurationSec: number;
  orientedWidth: number;
  orientedHeight: number;
  /** true seulement si le File d’entrée a été réutilisé (fast-path). */
  reusedOriginal: boolean;
  /** true si la source était muette, ou si la sortie a encore une piste audio. */
  audioPreserved: boolean;
};

export type PrepareVideoFailure = {
  ok: false;
  error: PrepareVideoErrorCode;
  /** Message technique (lab / logs) ; jamais affiché famille. */
  detail?: string;
};

export type PrepareVideoResult = PrepareVideoSuccess | PrepareVideoFailure;

export type PrepareVideoDeps = {
  probe?: typeof probeMp4Container;
  decode?: typeof verifyBrowserVideoDecode;
  measureDuration?: typeof measurePreparedVideoDuration;
  encodeWebCodecs?: typeof encodeVideoWithWebCodecs;
  encodeMediaRecorder?: typeof encodeVideoWithMediaRecorder;
  /** Host décodage (tests Node). */
  decodeHost?: BrowserVideoDecodeHost;
};

export type PrepareVideoForUploadOptions = {
  signal?: AbortSignal;
  trimStartSec?: number;
  /**
   * Coffre : `false` tant que la famille n’a pas choisi l’extrait.
   * Un film trop long ne démarre pas à 0 en silence.
   */
  explicitTrimStart?: boolean;
  deps?: PrepareVideoDeps;
};

function aborted(signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted);
}

function asFile(source: Blob, preferredName: string): File {
  if (source instanceof File) return source;
  return new File([source], preferredName, {
    type: source.type || "video/mp4",
  });
}

async function resolveSourceDurationSec(
  sourceBytes: Uint8Array,
  decodeDurationSec: number | null,
  measure: typeof measurePreparedVideoDuration,
): Promise<number | null> {
  const measured = await measure(sourceBytes);
  if (measured.ok) return measured.seconds;
  if (
    decodeDurationSec !== null &&
    Number.isFinite(decodeDurationSec) &&
    decodeDurationSec > 0
  ) {
    return decodeDurationSec;
  }
  return null;
}

async function validatePreparedOutput(
  prepared: File,
  signal: AbortSignal | undefined,
  deps: Required<
    Pick<PrepareVideoDeps, "probe" | "decode" | "measureDuration">
  > &
    Pick<PrepareVideoDeps, "decodeHost">,
): Promise<
  | {
      ok: true;
      effectiveDurationSec: number;
      orientedWidth: number;
      orientedHeight: number;
      audioTrackCount: number;
    }
  | { ok: false; error: PrepareVideoErrorCode }
> {
  if (aborted(signal)) {
    return { ok: false, error: "video_prepare_cancelled" };
  }

  const bytes = new Uint8Array(await prepared.arrayBuffer());
  const probe = await deps.probe(bytes);
  if (!probe.eligibleForFastPath) {
    return { ok: false, error: "video_fast_path_ineligible" };
  }

  if (aborted(signal)) {
    return { ok: false, error: "video_prepare_cancelled" };
  }

  const decode = await deps.decode(prepared, {
    signal,
    enforceDimensionLimits: true,
    host: deps.decodeHost,
  });
  if (!decode.ok) {
    return { ok: false, error: decode.error };
  }

  if (aborted(signal)) {
    return { ok: false, error: "video_prepare_cancelled" };
  }

  const measured = await deps.measureDuration(bytes);
  if (!measured.ok) {
    return { ok: false, error: "video_duration_unknown" };
  }
  const output = assessOutputDuration(measured.seconds);
  if (!output.ok) {
    return { ok: false, error: output.error };
  }

  if (aborted(signal)) {
    return { ok: false, error: "video_prepare_cancelled" };
  }

  return {
    ok: true,
    effectiveDurationSec: output.effectiveSec,
    orientedWidth: decode.orientedWidth,
    orientedHeight: decode.orientedHeight,
    audioTrackCount: probe.audioTrackCount,
  };
}

/**
 * Prépare une vidéo pour upload Coffre (contrat S7).
 * Ne doit pas être branché tant que la porte QA tranche 1 n’est pas verte.
 */
export async function prepareVideoForUpload(
  source: Blob,
  options: PrepareVideoForUploadOptions = {},
): Promise<PrepareVideoResult> {
  const { signal, trimStartSec = 0, explicitTrimStart = true, deps: injected } = options;

  if (aborted(signal)) {
    return { ok: false, error: "video_prepare_cancelled" };
  }

  const probe = injected?.probe ?? probeMp4Container;
  const decode = injected?.decode ?? verifyBrowserVideoDecode;
  const measureDuration =
    injected?.measureDuration ?? measurePreparedVideoDuration;
  const encodeWebCodecs = injected?.encodeWebCodecs ?? encodeVideoWithWebCodecs;
  const encodeMediaRecorder =
    injected?.encodeMediaRecorder ?? encodeVideoWithMediaRecorder;

  // --- 1. Décodage d’abord (WebCodecs, sans geste play), puis probe bytes ---
  // Ne pas lire arrayBuffer() avant : gros fichiers + await tuent le geste iOS
  // si un fallback HTML play était encore nécessaire.
  const sourceDecode = await decode(source, {
    signal,
    enforceDimensionLimits: false,
    host: injected?.decodeHost,
  });
  if (!sourceDecode.ok) {
    return { ok: false, error: sourceDecode.error };
  }

  if (aborted(signal)) {
    return { ok: false, error: "video_prepare_cancelled" };
  }

  const sourceBytes = new Uint8Array(await source.arrayBuffer());
  const sourceProbe = await probe(sourceBytes);

  if (aborted(signal)) {
    return { ok: false, error: "video_prepare_cancelled" };
  }

  const sourceDurationSec = await resolveSourceDurationSec(
    sourceBytes,
    sourceDecode.durationSec,
    measureDuration,
  );
  if (aborted(signal)) {
    return { ok: false, error: "video_prepare_cancelled" };
  }
  if (sourceDurationSec === null) {
    return { ok: false, error: "video_duration_unknown" };
  }

  const sourceAssessment = assessSourceDuration(sourceDurationSec);
  if (!sourceAssessment.ok) {
    return { ok: false, error: sourceAssessment.error };
  }
  if (sourceAssessment.requiresTrim && !explicitTrimStart) {
    return { ok: false, error: "video_duration_exceeds_limit" };
  }

  const dimsOk = assessOrientedDimensions(
    sourceDecode.orientedWidth,
    sourceDecode.orientedHeight,
  );

  // Fast-path : durée source déjà ≤ 10 ; la durée effective du fichier
  // réutilisé est re-mesurée en validation finale (refuse si > 10 ou inconnue).
  const canFastPath =
    sourceProbe.eligibleForFastPath &&
    !sourceAssessment.requiresTrim &&
    dimsOk.ok &&
    sourceDecode.frameDecoded &&
    trimStartSec === 0;

  let path: PrepareVideoPath;
  let candidate: File;
  let reusedOriginal = false;

  if (canFastPath) {
    path = "fast";
    candidate = asFile(source, "prepared.mp4");
    // Contenu source réutilisé (même File si l’entrée en était un).
    reusedOriginal = true;
  } else {
    if (aborted(signal)) {
      return { ok: false, error: "video_prepare_cancelled" };
    }

    const encodeOpts = {
      signal,
      trimStartSec,
      sourceDurationSec: sourceAssessment.sourceSec,
      orientedWidth: sourceDecode.orientedWidth,
      orientedHeight: sourceDecode.orientedHeight,
    };

    const web = await encodeWebCodecs(source, encodeOpts);
    if (web.ok) {
      path = "webcodecs";
      candidate = web.preparedFile;
    } else if (web.error === "video_prepare_cancelled" || aborted(signal)) {
      // Ne jamais enchaîner MediaRecorder après une annulation.
      return { ok: false, error: "video_prepare_cancelled" };
    } else if (!isRecoverableWebCodecsFailure(web.error)) {
      // Échec de contrat (durée / dims) : propager, pas de secours MediaRecorder.
      return {
        ok: false,
        error: web.error,
        detail: "detail" in web ? web.detail : undefined,
      };
    } else {
      if (aborted(signal)) {
        return { ok: false, error: "video_prepare_cancelled" };
      }
      const rec = await encodeMediaRecorder(source, encodeOpts);
      if (rec.ok) {
        path = "mediarecorder";
        candidate = rec.preparedFile;
      } else if (rec.error === "video_prepare_cancelled" || aborted(signal)) {
        return { ok: false, error: "video_prepare_cancelled" };
      } else if (sourceAssessment.requiresTrim) {
        return { ok: false, error: sourceExceedsLimitWithoutEncode() };
      } else if (rec.error === "video_output_duration_exceeds_limit") {
        return { ok: false, error: "video_output_duration_exceeds_limit" };
      } else if (rec.error === "video_duration_unknown") {
        return { ok: false, error: "video_duration_unknown" };
      } else {
        const webDetail = "detail" in web ? web.detail : undefined;
        const recDetail = "detail" in rec ? rec.detail : undefined;
        return {
          ok: false,
          error: "video_encode_failed",
          detail: [webDetail, recDetail].filter(Boolean).join(" | ") || undefined,
        };
      }
    }
  }

  if (aborted(signal)) {
    return { ok: false, error: "video_prepare_cancelled" };
  }

  // --- 2. Validation finale obligatoire (même en fast-path) ---
  const final = await validatePreparedOutput(candidate, signal, {
    probe,
    decode,
    measureDuration,
    decodeHost: injected?.decodeHost,
  });
  if (!final.ok) {
    // Fast-path qui rate la validation finale : pas d’original en secours.
    return { ok: false, error: final.error };
  }

  if (aborted(signal)) {
    return { ok: false, error: "video_prepare_cancelled" };
  }

  const sourceHadAudio = sourceProbe.audioTrackCount >= 1;
  if (sourceHadAudio && final.audioTrackCount < 1) {
    return { ok: false, error: "video_encode_failed" };
  }

  return {
    ok: true,
    preparedFile: candidate,
    path,
    sourceDurationSec: sourceAssessment.sourceSec,
    effectiveDurationSec: final.effectiveDurationSec,
    orientedWidth: final.orientedWidth,
    orientedHeight: final.orientedHeight,
    reusedOriginal,
    audioPreserved: true,
  };
}
