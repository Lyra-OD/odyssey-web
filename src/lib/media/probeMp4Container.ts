/**
 * Commit 3 S7 — probe conteneur MP4 (ISO BMFF).
 *
 * Choix de dépendance : `mp4box` (GPAC) v2.5.
 * - Parse `moov` en début **ou** en fin de fichier.
 * - Expose codecs / pistes sans réencodage.
 * - Déjà typé côté package ; usage browser + Node (tests).
 *
 * Ce module ne remplace pas un parseur codec maison pour les atomes
 * top-level : un localisateur minimal (ftyp / moov / mdat) complète
 * mp4box pour la position de `moov`. Aucun décodage frame, aucun
 * encode, aucun verdict « prêt à uploader ».
 *
 * @see docs/product/COFFRE_MONTAGE_MEDIA_INGEST.md §7.4
 */

import { createFile, MP4BoxBuffer, type Movie, type Track } from "mp4box";

export type MoovPosition = "start" | "end" | "unknown";

export type Mp4ProbeRefuseReason =
  | "not_iso_bmff"
  | "moov_missing"
  | "parse_incomplete"
  | "parse_failed"
  | "fragmented"
  | "video_track_count_invalid"
  | "audio_track_count_invalid"
  | "video_codec_unsupported"
  | "audio_codec_unsupported"
  | "codec_metadata_ambiguous";

export type Mp4ContainerProbeResult = {
  /**
   * true = le conteneur est assez vérifiable pour **envisager** le fast-path
   * (prochaine étape = décodage Commit 4 : frames, orientation, dimensions).
   * Ce n'est **pas** « prêt à uploader », et ce n'est **pas** une conformité
   * au contrat H.264 8-bit (voir `bitDepthVerified`).
   */
  eligibleForFastPath: boolean;
  reasons: Mp4ProbeRefuseReason[];
  container: "iso_bmff" | "unknown";
  brands: string[];
  moovPosition: MoovPosition;
  hasFtyp: boolean;
  hasMoov: boolean;
  hasMdat: boolean;
  isFragmented: boolean;
  videoTrackCount: number;
  audioTrackCount: number;
  videoCodec: string | null;
  audioCodec: string | null;
  /**
   * Toujours false au Commit 3 : le conteneur ne prouve pas la profondeur 8-bit.
   * Interdit d'affirmer la conformité H.264 8-bit sur la seule base du probe.
   */
  bitDepthVerified: false;
  /** Champs que le conteneur ne prouve pas de façon fiable. */
  unverifiedFields: string[];
  mime: string | null;
};

const EMPTY_RESULT = (
  overrides: Partial<Mp4ContainerProbeResult>,
): Mp4ContainerProbeResult => ({
  eligibleForFastPath: false,
  reasons: [],
  container: "unknown",
  brands: [],
  moovPosition: "unknown",
  hasFtyp: false,
  hasMoov: false,
  hasMdat: false,
  isFragmented: false,
  videoTrackCount: 0,
  audioTrackCount: 0,
  videoCodec: null,
  audioCodec: null,
  bitDepthVerified: false,
  unverifiedFields: [],
  mime: null,
  ...overrides,
});

type TopLevelBox = {
  type: string;
  offset: number;
  size: number;
};

/**
 * Localisateur d'atomes ISO BMFF de premier niveau uniquement
 * (pas un parseur de codecs). Gère size=1 (64-bit) et size=0 (jusqu'à EOF).
 */
export function locateTopLevelBoxes(bytes: Uint8Array): TopLevelBox[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const boxes: TopLevelBox[] = [];
  let offset = 0;

  while (offset + 8 <= bytes.byteLength) {
    let size = view.getUint32(offset);
    const type = String.fromCharCode(
      bytes[offset + 4]!,
      bytes[offset + 5]!,
      bytes[offset + 6]!,
      bytes[offset + 7]!,
    );
    let headerSize = 8;

    if (size === 1) {
      if (offset + 16 > bytes.byteLength) break;
      const size64 = Number(view.getBigUint64(offset + 8));
      if (!Number.isSafeInteger(size64) || size64 < 16) break;
      size = size64;
      headerSize = 16;
    } else if (size === 0) {
      size = bytes.byteLength - offset;
    }

    if (size < headerSize || offset + size > bytes.byteLength) {
      break;
    }

    boxes.push({ type, offset, size });
    offset += size;
  }

  return boxes;
}

export function moovPositionFromBoxes(boxes: TopLevelBox[]): MoovPosition {
  const moov = boxes.find((b) => b.type === "moov");
  const mdat = boxes.find((b) => b.type === "mdat");
  if (!moov) return "unknown";
  if (!mdat) return moov.offset <= 8 ? "start" : "end";
  return moov.offset < mdat.offset ? "start" : "end";
}

function isAvc1Codec(codec: string): boolean {
  return /^avc1(\.|$)/i.test(codec);
}

function isHevcCodec(codec: string): boolean {
  return /^(hvc1|hev1)(\.|$)/i.test(codec);
}

function isAacCodec(codec: string): boolean {
  return /^mp4a(\.|$)/i.test(codec);
}

function parseWithMp4Box(bytes: Uint8Array): Promise<Movie> {
  return new Promise((resolve, reject) => {
    const file = createFile(false);
    let settled = false;

    const fail = (reason: unknown) => {
      if (settled) return;
      settled = true;
      reject(reason instanceof Error ? reason : new Error(String(reason)));
    };

    file.onError = (err) => fail(err);
    file.onReady = (info) => {
      if (settled) return;
      settled = true;
      resolve(info);
    };

    try {
      const copy = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      const buffer = MP4BoxBuffer.fromArrayBuffer(copy, 0);
      file.appendBuffer(buffer);
      file.flush();
    } catch (err) {
      fail(err);
    }

    // Conteneur tronqué : onReady ne vient jamais.
    queueMicrotask(() => {
      if (!settled) {
        fail(new Error("mp4box_no_ready"));
      }
    });
  });
}

function primaryCodec(tracks: Track[]): string | null {
  if (tracks.length === 0) return null;
  const codec = tracks[0]?.codec?.trim() ?? "";
  return codec || null;
}

/**
 * Inspecte un buffer MP4. L'extension `.mp4` du nom de fichier est ignorée.
 */
export async function probeMp4Container(
  input: ArrayBuffer | Uint8Array,
): Promise<Mp4ContainerProbeResult> {
  const bytes =
    input instanceof Uint8Array
      ? input
      : new Uint8Array(input);

  if (bytes.byteLength < 8) {
    return EMPTY_RESULT({ reasons: ["not_iso_bmff", "parse_incomplete"] });
  }

  const boxes = locateTopLevelBoxes(bytes);
  const hasFtyp = boxes.some((b) => b.type === "ftyp");
  const hasMoov = boxes.some((b) => b.type === "moov");
  const hasMdat = boxes.some((b) => b.type === "mdat");
  const moovPosition = moovPositionFromBoxes(boxes);

  if (!hasFtyp) {
    return EMPTY_RESULT({
      reasons: ["not_iso_bmff"],
      hasFtyp,
      hasMoov,
      hasMdat,
      moovPosition,
    });
  }

  if (!hasMoov) {
    return EMPTY_RESULT({
      container: "iso_bmff",
      reasons: hasMdat ? ["moov_missing", "parse_incomplete"] : ["moov_missing"],
      hasFtyp: true,
      hasMoov: false,
      hasMdat,
      moovPosition,
    });
  }

  let movie: Movie;
  try {
    movie = await parseWithMp4Box(bytes);
  } catch {
    return EMPTY_RESULT({
      container: "iso_bmff",
      reasons: ["parse_failed"],
      hasFtyp: true,
      hasMoov: true,
      hasMdat,
      moovPosition,
    });
  }

  if (!movie.hasMoov) {
    return EMPTY_RESULT({
      container: "iso_bmff",
      reasons: ["moov_missing"],
      brands: movie.brands ?? [],
      hasFtyp: true,
      hasMoov: false,
      hasMdat,
      moovPosition,
      mime: movie.mime ?? null,
    });
  }

  const videoTracks = movie.videoTracks ?? [];
  const audioTracks = movie.audioTracks ?? [];
  const videoCodec = primaryCodec(videoTracks);
  const audioCodec = primaryCodec(audioTracks);
  const reasons: Mp4ProbeRefuseReason[] = [];
  const unverifiedFields: string[] = ["bit_depth", "color_primaries"];

  if (movie.isFragmented) {
    reasons.push("fragmented");
  }

  if (videoTracks.length !== 1) {
    reasons.push("video_track_count_invalid");
  }

  if (audioTracks.length > 1) {
    reasons.push("audio_track_count_invalid");
  }

  if (!videoCodec) {
    reasons.push("codec_metadata_ambiguous");
  } else if (isHevcCodec(videoCodec)) {
    reasons.push("video_codec_unsupported");
  } else if (!isAvc1Codec(videoCodec)) {
    reasons.push("video_codec_unsupported");
  }

  if (audioTracks.length === 1) {
    if (!audioCodec) {
      reasons.push("codec_metadata_ambiguous");
    } else if (!isAacCodec(audioCodec)) {
      reasons.push("audio_codec_unsupported");
    }
  }

  const eligibleForFastPath = reasons.length === 0;

  return {
    eligibleForFastPath,
    reasons,
    container: "iso_bmff",
    brands: movie.brands ?? [],
    moovPosition,
    hasFtyp: true,
    hasMoov: true,
    hasMdat,
    isFragmented: Boolean(movie.isFragmented),
    videoTrackCount: videoTracks.length,
    audioTrackCount: audioTracks.length,
    videoCodec,
    audioCodec,
    bitDepthVerified: false,
    unverifiedFields,
    mime: movie.mime ?? null,
  };
}
