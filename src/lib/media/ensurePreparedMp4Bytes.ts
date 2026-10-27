/**
 * Garantit des octets MP4 pour le contrat S7.
 * MediaRecorder peut produire WebM (Chrome) ou MP4 (Safari) :
 * - déjà ISO-BMFF → `probeMp4Container` (ftyp seul ne suffit pas)
 * - WebM / autre → remux/transcode mediabunny → MP4 puis même probe
 * - échec → throw (jamais accepter un non-MP4 / blob brut comme « préparé »)
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

import { probeMp4Container } from "@/src/lib/media/probeMp4Container";

export function looksLikeIsoBmff(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 8) return false;
  return (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ); // 'ftyp'
}

export function blobSuggestsMp4(blob: Blob): boolean {
  const type = blob.type.trim().toLowerCase();
  return type.includes("mp4") || type.includes("quicktime");
}

export function blobSuggestsWebm(blob: Blob): boolean {
  return blob.type.trim().toLowerCase().includes("webm");
}

/**
 * ftyp ≠ MP4 S7 : exige un conteneur parseable H.264 (+ AAC optionnel).
 */
export async function assertPreparedMp4Container(
  bytes: Uint8Array,
): Promise<void> {
  if (!looksLikeIsoBmff(bytes)) {
    throw new Error("prepared_not_mp4");
  }
  const probe = await probeMp4Container(bytes);
  if (!probe.eligibleForFastPath) {
    throw new Error(
      `prepared_container_invalid:${probe.reasons.join(",") || "unknown"}`,
    );
  }
}

/**
 * Remux / transcode vers MP4 via mediabunny (WebCodecs sous le capot).
 * Ne retourne jamais le blob d'entrée.
 */
export async function remuxBlobToMp4(
  blob: Blob,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (signal?.aborted) {
    throw new Error("video_prepare_cancelled");
  }

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });
  const input = new Input({
    source: new BlobSource(blob),
    formats: ALL_FORMATS,
  });

  const conversion = await Conversion.init({
    input,
    output,
    tracks: "primary",
    showWarnings: false,
    copy: false,
    video: {
      codec: "avc",
      quality: QUALITY_HIGH,
      forceTranscode: true,
      allowTransformationMetadata: false,
    },
    audio: {
      codec: "aac",
      quality: QUALITY_HIGH,
    },
  });

  if (!conversion.isValid) {
    throw new Error("remux_invalid");
  }

  const onAbort = () => {
    void conversion.cancel();
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    await conversion.execute();
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }

  if (signal?.aborted) {
    throw new Error("video_prepare_cancelled");
  }

  const buffer = target.buffer;
  if (!buffer || buffer.byteLength < 8) {
    throw new Error("remux_empty");
  }
  const bytes = new Uint8Array(buffer);
  await assertPreparedMp4Container(bytes);
  return bytes;
}

/**
 * Normalise le blob MediaRecorder en octets MP4 contractuels.
 */
export async function ensurePreparedMp4Bytes(
  blob: Blob,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (signal?.aborted) {
    throw new Error("video_prepare_cancelled");
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (looksLikeIsoBmff(bytes) || blobSuggestsMp4(blob)) {
    if (!looksLikeIsoBmff(bytes)) {
      // mime dit mp4 mais pas de ftyp → pas un MP4 fiable
      throw new Error("recorder_not_mp4");
    }
    await assertPreparedMp4Container(bytes);
    return bytes;
  }

  if (blobSuggestsWebm(blob) || bytes.byteLength > 0) {
    return remuxBlobToMp4(blob, signal);
  }

  throw new Error("recorder_empty");
}
