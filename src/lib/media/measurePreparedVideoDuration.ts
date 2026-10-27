/**
 * Mesure la durée **effective** d'un MP4 déjà muxé (fichier préparé).
 * Indépendante du nombre de frames demandées et du temps d'encodage.
 * Fail-closed : durée absente / incohérente → `video_duration_unknown`.
 */

import { createFile, MP4BoxBuffer } from "mp4box";

import type { VideoDurationUnknownError } from "@/src/lib/media/videoDurationContract";

export type MeasuredDurationResult =
  | { ok: true; seconds: number }
  | { ok: false; error: VideoDurationUnknownError };

function parseMovieDuration(bytes: Uint8Array): Promise<number | null> {
  return new Promise((resolve) => {
    const file = createFile(false);
    let settled = false;
    const done = (value: number | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    file.onError = () => done(null);
    file.onReady = (info) => {
      const timescale = info.timescale;
      const duration = info.duration;
      if (
        !Number.isFinite(timescale) ||
        timescale <= 0 ||
        !Number.isFinite(duration) ||
        duration <= 0
      ) {
        done(null);
        return;
      }
      done(duration / timescale);
    };

    try {
      const copy = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      file.appendBuffer(MP4BoxBuffer.fromArrayBuffer(copy, 0));
      file.flush();
    } catch {
      done(null);
      return;
    }

    queueMicrotask(() => done(null));
  });
}

/**
 * Lit la durée dans le conteneur produit (moov), pas une estimation encodeur.
 */
export async function measurePreparedVideoDuration(
  input: ArrayBuffer | Uint8Array,
): Promise<MeasuredDurationResult> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.byteLength < 8) {
    return { ok: false, error: "video_duration_unknown" };
  }

  const seconds = await parseMovieDuration(bytes);
  if (seconds === null || !(Number.isFinite(seconds) && seconds > 0)) {
    return { ok: false, error: "video_duration_unknown" };
  }

  return { ok: true, seconds };
}
