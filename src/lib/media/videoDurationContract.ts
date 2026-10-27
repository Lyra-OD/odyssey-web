import { VIDEO_TRIM_DURATION_SEC } from "@/src/lib/wizard/storyboardPacing";

/**
 * Contrat S7 v2.3 — durée vidéo (garanties A).
 * La durée effective du fichier préparé fait foi. Une consigne d'encode
 * de 10 s ne prouve pas que la sortie respecte le plafond.
 *
 * @see docs/product/COFFRE_MONTAGE_MEDIA_INGEST.md §7.1
 */

/** Plafond produit strict (secondes). Alias explicite de `VIDEO_TRIM_DURATION_SEC`. */
export const VIDEO_DURATION_CEILING_SEC = VIDEO_TRIM_DURATION_SEC;

export type VideoDurationUnknownError = "video_duration_unknown";
export type VideoDurationExceedsLimitError = "video_duration_exceeds_limit";
export type VideoOutputDurationExceedsLimitError =
  "video_output_duration_exceeds_limit";

export type VideoDurationErrorCode =
  | VideoDurationUnknownError
  | VideoDurationExceedsLimitError
  | VideoOutputDurationExceedsLimitError;

export function isFinitePositiveDuration(seconds: number): boolean {
  return Number.isFinite(seconds) && seconds > 0;
}

/**
 * Durée demandée à l'encodeur : min(source, plafond).
 * Prérequis : `sourceSec` déjà validé (`isFinitePositiveDuration`).
 */
export function requestedEncodeDurationSec(sourceSec: number): number {
  return Math.min(sourceSec, VIDEO_DURATION_CEILING_SEC);
}

export type SourceDurationAssessment =
  | {
      ok: true;
      sourceSec: number;
      /** true si source > plafond → découpe / réencodage obligatoire */
      requiresTrim: boolean;
      requestedEncodeSec: number;
    }
  | { ok: false; error: VideoDurationUnknownError };

/**
 * Évalue la durée source.
 * 9,98 s → admissible ; 10,02 s → requiresTrim ; inconnue → refus.
 */
export function assessSourceDuration(seconds: number): SourceDurationAssessment {
  if (!isFinitePositiveDuration(seconds)) {
    return { ok: false, error: "video_duration_unknown" };
  }
  const requiresTrim = seconds > VIDEO_DURATION_CEILING_SEC;
  return {
    ok: true,
    sourceSec: seconds,
    requiresTrim,
    requestedEncodeSec: requestedEncodeDurationSec(seconds),
  };
}

export type OutputDurationAssessment =
  | { ok: true; effectiveSec: number }
  | {
      ok: false;
      error: VideoDurationUnknownError | VideoOutputDurationExceedsLimitError;
    };

/**
 * Évalue la durée effective du fichier préparé.
 * Rejet absolu si > 10,0 s (même si l'encodeur a reçu 10 s).
 */
export function assessOutputDuration(seconds: number): OutputDurationAssessment {
  if (!isFinitePositiveDuration(seconds)) {
    return { ok: false, error: "video_duration_unknown" };
  }
  if (seconds > VIDEO_DURATION_CEILING_SEC) {
    return { ok: false, error: "video_output_duration_exceeds_limit" };
  }
  return { ok: true, effectiveSec: seconds };
}

/**
 * Refus explicite quand une source trop longue ne peut pas être découpée /
 * réencodée (encodeur indisponible, annulation, etc.).
 */
export function sourceExceedsLimitWithoutEncode(): VideoDurationExceedsLimitError {
  return "video_duration_exceeds_limit";
}
