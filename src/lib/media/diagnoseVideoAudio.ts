/**
 * Lab S7 — diagnostic audio (source vs préparé).
 * Pas un chemin d’upload : lit pistes / codecs pour trancher muted UI vs piste absente.
 */

import {
  ALL_FORMATS,
  BlobSource,
  Input,
} from "mediabunny";

import { probeMp4Container } from "@/src/lib/media/probeMp4Container";

export type VideoAudioDiagnosis = {
  label: string;
  fileName: string | null;
  mime: string;
  sizeBytes: number;
  containerProbe: {
    videoTrackCount: number;
    audioTrackCount: number;
    videoCodec: string | null;
    audioCodec: string | null;
    eligibleForFastPath: boolean;
    reasons: string[];
    looksHevc: boolean;
  } | null;
  mediabunny: {
    hasAudioTrack: boolean;
    audioCodec: string | null;
    audioCanDecode: boolean | null;
    hasVideoTrack: boolean;
    videoCodec: string | null;
    videoCanDecode: boolean | null;
    /** Estimation fps source (null si indisponible). */
    bestGuessFrameRate: number | null;
  } | null;
  error: string | null;
};

function isHevcCodecString(codec: string | null): boolean {
  if (!codec) return false;
  const c = codec.toLowerCase();
  return c.includes("hvc1") || c.includes("hev1") || c.includes("hevc");
}

async function diagnoseViaMediabunny(blob: Blob): Promise<
  VideoAudioDiagnosis["mediabunny"]
> {
  try {
    const input = new Input({
      source: new BlobSource(blob),
      formats: ALL_FORMATS,
    });
    const videoTrack = await input.getPrimaryVideoTrack();
    const audioTrack = await input.getPrimaryAudioTrack();

    const videoCodec = videoTrack ? await videoTrack.getCodec() : null;
    const audioCodec = audioTrack ? await audioTrack.getCodec() : null;
    const videoCanDecode = videoTrack ? await videoTrack.canDecode() : null;
    const audioCanDecode = audioTrack ? await audioTrack.canDecode() : null;

    let bestGuessFrameRate: number | null = null;
    if (videoTrack) {
      try {
        const metrics = await videoTrack.computeFrameRateMetrics();
        bestGuessFrameRate = metrics.bestGuessFrameRate ?? null;
      } catch {
        bestGuessFrameRate = null;
      }
    }

    return {
      hasAudioTrack: Boolean(audioTrack),
      audioCodec,
      audioCanDecode,
      hasVideoTrack: Boolean(videoTrack),
      videoCodec,
      videoCanDecode,
      bestGuessFrameRate,
    };
  } catch {
    return null;
  }
}

/**
 * Diagnostique un Blob (source utilisateur ou MP4 préparé).
 */
export async function diagnoseVideoAudio(
  blob: Blob,
  options: { label: string; fileName?: string | null },
): Promise<VideoAudioDiagnosis> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let containerProbe: VideoAudioDiagnosis["containerProbe"] = null;

  try {
    const probe = await probeMp4Container(bytes);
    if (probe.container === "iso_bmff" || probe.hasFtyp || probe.hasMoov) {
      containerProbe = {
        videoTrackCount: probe.videoTrackCount,
        audioTrackCount: probe.audioTrackCount,
        videoCodec: probe.videoCodec,
        audioCodec: probe.audioCodec,
        eligibleForFastPath: probe.eligibleForFastPath,
        reasons: probe.reasons,
        looksHevc:
          isHevcCodecString(probe.videoCodec) ||
          probe.reasons.includes("video_codec_unsupported"),
      };
    }
  } catch {
    containerProbe = null;
  }

  const mediabunny = await diagnoseViaMediabunny(blob);

  return {
    label: options.label,
    fileName: options.fileName ?? null,
    mime: blob.type || "unknown",
    sizeBytes: blob.size,
    containerProbe,
    mediabunny,
    error: null,
  };
}
