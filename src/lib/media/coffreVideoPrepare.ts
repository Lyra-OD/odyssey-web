/**
 * Commit 11 — préparation vidéo du Coffre.
 * La source est `originalFile`. Seul le fichier préparé peut partir au Storage.
 */

import { isQueueVideoFile } from "@/src/lib/media/videoPrepareQueue";
import {
  prepareVideoForUpload,
  type PrepareVideoErrorCode,
  type PrepareVideoResult,
} from "@/src/lib/media/prepareVideoForUpload";
import {
  VIDEO_DURATION_CEILING_SEC,
  assessOutputDuration,
} from "@/src/lib/media/videoDurationContract";
import { UploadChainCancelledError } from "@/src/lib/uploads/uploadChainGate";

export type CoffreEnqueueEntry = {
  file: File;
  trimStartSec?: number;
  contentSha256?: string | null;
};

export type CoffreDropMeasure = {
  file: File;
  durationSec: number | null;
};

const VIDEO_PREPARE_FAILURES = new Set<PrepareVideoErrorCode>([
  "video_duration_unknown",
  "video_duration_exceeds_limit",
  "video_output_duration_exceeds_limit",
  "video_fast_path_ineligible",
  "video_decode_failed",
  "video_dimensions_invalid",
  "video_dimensions_exceed_limit",
  "video_encode_failed",
]);

export function isVideoPrepareFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    VIDEO_PREPARE_FAILURES.has(error.message as PrepareVideoErrorCode)
  );
}

/**
 * Un film plus long que 10 secondes attend le choix d’extrait.
 * Une durée illisible part en file sans `trimStartSec` : la préparation
 * refuse un film trop long plutôt que de couper à zéro.
 */
export function splitDropForCoffre(entries: readonly CoffreDropMeasure[]): {
  immediate: CoffreEnqueueEntry[];
  needsTrim: Array<{ file: File; durationSec: number }>;
} {
  const immediate: CoffreEnqueueEntry[] = [];
  const needsTrim: Array<{ file: File; durationSec: number }> = [];

  for (const entry of entries) {
    if (!isQueueVideoFile(entry.file)) {
      immediate.push({ file: entry.file });
      continue;
    }
    if (
      entry.durationSec !== null &&
      entry.durationSec > VIDEO_DURATION_CEILING_SEC
    ) {
      needsTrim.push({ file: entry.file, durationSec: entry.durationSec });
      continue;
    }
    if (entry.durationSec !== null) {
      immediate.push({ file: entry.file, trimStartSec: 0 });
      continue;
    }
    immediate.push({ file: entry.file });
  }

  return { immediate, needsTrim };
}

export function takePreparedFileForUpload(result: PrepareVideoResult): File {
  if (!result.ok) {
    if (result.error === "video_prepare_cancelled") {
      throw new UploadChainCancelledError("prepare");
    }
    throw new Error(result.error);
  }
  const duration = assessOutputDuration(result.effectiveDurationSec);
  if (!duration.ok) throw new Error(duration.error);
  if (!result.audioPreserved) throw new Error("video_encode_failed");
  const file = result.preparedFile;
  if (!(file instanceof File) || file.size < 1) {
    throw new Error("video_encode_failed");
  }
  return file;
}

export async function prepareCoffreVideoFile(params: {
  source: File;
  trimStartSec?: number;
  signal?: AbortSignal;
  prepare?: typeof prepareVideoForUpload;
}): Promise<File> {
  const prepare = params.prepare ?? prepareVideoForUpload;
  const result = await prepare(params.source, {
    signal: params.signal,
    trimStartSec: params.trimStartSec ?? 0,
    explicitTrimStart: params.trimStartSec !== undefined,
  });
  return takePreparedFileForUpload(result);
}

export function readLocalVideoDurationSec(file: File): Promise<number | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      try {
        video.load();
      } catch {
        // ignore
      }
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), 8000);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      finish(Number.isFinite(duration) && duration > 0 ? duration : null);
    };
    video.onerror = () => finish(null);
    video.src = url;
  });
}

export type VideoPrepareErrorCopy = {
  videoPrepareErrorDurationUnknown: string;
  videoPrepareErrorDurationExceeds: string;
  videoPrepareErrorOutputExceeds: string;
  videoPrepareErrorFastPath: string;
  videoPrepareErrorDecode: string;
  videoPrepareErrorDimensionsInvalid: string;
  videoPrepareErrorDimensionsExceed: string;
  videoPrepareErrorEncode: string;
};

export function videoPrepareErrorMessages(
  copy: VideoPrepareErrorCopy,
): Record<string, string> {
  return {
    video_duration_unknown: copy.videoPrepareErrorDurationUnknown,
    video_duration_exceeds_limit: copy.videoPrepareErrorDurationExceeds,
    video_output_duration_exceeds_limit: copy.videoPrepareErrorOutputExceeds,
    video_fast_path_ineligible: copy.videoPrepareErrorFastPath,
    video_decode_failed: copy.videoPrepareErrorDecode,
    video_dimensions_invalid: copy.videoPrepareErrorDimensionsInvalid,
    video_dimensions_exceed_limit: copy.videoPrepareErrorDimensionsExceed,
    video_encode_failed: copy.videoPrepareErrorEncode,
  };
}
