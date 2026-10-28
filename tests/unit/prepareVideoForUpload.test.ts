import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import {
  isRecoverableWebCodecsFailure,
  prepareVideoForUpload,
} from "@/src/lib/media/prepareVideoForUpload";
import type { Mp4ContainerProbeResult } from "@/src/lib/media/probeMp4Container";
import type { VideoDecodeResult } from "@/src/lib/media/verifyBrowserVideoDecode";

const FIXTURES = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/mp4",
);

function loadBytes(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(FIXTURES, name)));
}

function mp4File(name = "h264-landscape-1280x720.mp4"): File {
  const bytes = loadBytes(name);
  return new File(
    [bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer],
    name,
    { type: "video/mp4" },
  );
}

function eligibleProbe(
  overrides: Partial<Mp4ContainerProbeResult> = {},
): Mp4ContainerProbeResult {
  return {
    eligibleForFastPath: true,
    reasons: [],
    container: "iso_bmff",
    brands: ["isom"],
    moovPosition: "start",
    hasFtyp: true,
    hasMoov: true,
    hasMdat: true,
    isFragmented: false,
    videoTrackCount: 1,
    audioTrackCount: 0,
    videoCodec: "avc1.64001f",
    audioCodec: null,
    bitDepthVerified: false,
    unverifiedFields: ["bit_depth"],
    mime: "video/mp4",
    ...overrides,
  };
}

function decodeOk(
  overrides: Partial<Extract<VideoDecodeResult, { ok: true }>> = {},
): VideoDecodeResult {
  return {
    ok: true,
    orientedWidth: 1280,
    orientedHeight: 720,
    orientation: "landscape",
    frameDecoded: true,
    durationSec: 5,
    ...overrides,
  };
}

/** Source puis sortie préparée (2ᵉ appel = toujours admissible). */
function probeSourceThenPrepared(
  source: Mp4ContainerProbeResult,
): typeof import("@/src/lib/media/probeMp4Container").probeMp4Container {
  let calls = 0;
  return async () => {
    calls += 1;
    return calls === 1 ? source : eligibleProbe();
  };
}

describe("isRecoverableWebCodecsFailure", () => {
  it("seul video_encode_failed est récupérable", () => {
    expect(isRecoverableWebCodecsFailure("video_encode_failed")).toBe(true);
    expect(isRecoverableWebCodecsFailure("video_prepare_cancelled")).toBe(false);
    expect(
      isRecoverableWebCodecsFailure("video_output_duration_exceeds_limit"),
    ).toBe(false);
    expect(isRecoverableWebCodecsFailure("video_duration_unknown")).toBe(false);
  });
});

describe("prepareVideoForUpload", () => {
  it("fast-path : conteneur + décodage + dims V1 + durée ≤ 10 → réutilise l’original", async () => {
    const file = mp4File();
    const result = await prepareVideoForUpload(file, {
      deps: {
        probe: async () => eligibleProbe(),
        decode: async () => decodeOk({ durationSec: 5 }),
        measureDuration: async () => ({ ok: true, seconds: 5 }),
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.path).toBe("fast");
    expect(result.reusedOriginal).toBe(true);
    expect(result.preparedFile).toBe(file);
    expect(result.effectiveDurationSec).toBe(5);
    expect(result.effectiveDurationSec).toBeLessThanOrEqual(10);
    expect(result.audioPreserved).toBe(true);
  });

  it("source sonore dont la sortie n’a plus d’audio : aucun fichier à envoyer", async () => {
    const file = mp4File();
    let probeCalls = 0;
    const result = await prepareVideoForUpload(file, {
      deps: {
        probe: async () => {
          probeCalls += 1;
          const sourcePass = probeCalls === 1;
          return eligibleProbe({
            audioTrackCount: sourcePass ? 1 : 0,
            audioCodec: sourcePass ? "mp4a.40.2" : null,
          });
        },
        decode: async () => decodeOk({ durationSec: 5 }),
        measureDuration: async () => ({ ok: true, seconds: 5 }),
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("video_encode_failed");
  });

  it("source > 10 s → encode WebCodecs (pas fast-path)", async () => {
    let measureCalls = 0;
    const encoded = mp4File();
    const encodeWebCodecs = vi.fn(async () => ({
      ok: true as const,
      preparedFile: encoded,
      requestedEncodeSec: 10,
      effectiveDurationSec: 9.8,
      outputWidth: 1280,
      outputHeight: 720,
    }));
    const result = await prepareVideoForUpload(mp4File(), {
      deps: {
        probe: async () => eligibleProbe(),
        decode: async () => decodeOk({ durationSec: 45 }),
        measureDuration: async () => {
          measureCalls += 1;
          return measureCalls === 1
            ? { ok: true, seconds: 45 }
            : { ok: true, seconds: 9.8 };
        },
        encodeWebCodecs,
      },
    });
    expect(encodeWebCodecs).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.path).toBe("webcodecs");
    expect(result.reusedOriginal).toBe(false);
    expect(result.sourceDurationSec).toBe(45);
    expect(result.effectiveDurationSec).toBe(9.8);
  });

  it("probe ineligible → encode (pas de fast-path sur conteneur seul)", async () => {
    const encoded = mp4File();
    const result = await prepareVideoForUpload(mp4File(), {
      deps: {
        probe: probeSourceThenPrepared(
          eligibleProbe({
            eligibleForFastPath: false,
            reasons: ["video_codec_unsupported"],
            videoCodec: "hvc1",
          }),
        ),
        decode: async () => decodeOk(),
        measureDuration: async () => ({ ok: true, seconds: 5 }),
        encodeWebCodecs: async () => ({
          ok: true,
          preparedFile: encoded,
          requestedEncodeSec: 5,
          effectiveDurationSec: 5,
          outputWidth: 1280,
          outputHeight: 720,
        }),
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.path).toBe("webcodecs");
  });

  it("dimensions > V1 → encode (pas fast-path)", async () => {
    const encoded = mp4File();
    let decodeCalls = 0;
    const result = await prepareVideoForUpload(mp4File(), {
      deps: {
        probe: async () => eligibleProbe(),
        decode: async () => {
          decodeCalls += 1;
          // source 4K → final = sortie redimensionnée
          return decodeCalls === 1
            ? decodeOk({ orientedWidth: 3840, orientedHeight: 2160 })
            : decodeOk({ orientedWidth: 1920, orientedHeight: 1080 });
        },
        measureDuration: async () => ({ ok: true, seconds: 4 }),
        encodeWebCodecs: async () => ({
          ok: true,
          preparedFile: encoded,
          requestedEncodeSec: 4,
          effectiveDurationSec: 4,
          outputWidth: 1920,
          outputHeight: 1080,
        }),
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.path).toBe("webcodecs");
    expect(result.orientedWidth).toBe(1920);
  });

  it("WebCodecs échoue → fallback MediaRecorder", async () => {
    const encoded = mp4File();
    const result = await prepareVideoForUpload(mp4File(), {
      deps: {
        probe: probeSourceThenPrepared(
          eligibleProbe({
            eligibleForFastPath: false,
            reasons: ["parse_failed"],
          }),
        ),
        decode: async () => decodeOk(),
        measureDuration: async () => ({ ok: true, seconds: 5 }),
        encodeWebCodecs: async () => ({
          ok: false,
          error: "video_encode_failed",
        }),
        encodeMediaRecorder: async () => ({
          ok: true,
          preparedFile: encoded,
          requestedEncodeSec: 5,
          effectiveDurationSec: 5,
          outputWidth: 1280,
          outputHeight: 720,
          recorderMimeType: "video/webm",
        }),
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.path).toBe("mediarecorder");
  });

  it("les deux encodeurs échouent → video_encode_failed, pas d’original", async () => {
    const original = mp4File();
    const result = await prepareVideoForUpload(original, {
      deps: {
        probe: probeSourceThenPrepared(
          eligibleProbe({
            eligibleForFastPath: false,
            reasons: ["parse_failed"],
          }),
        ),
        decode: async () => decodeOk(),
        measureDuration: async () => ({ ok: true, seconds: 5 }),
        encodeWebCodecs: async () => ({
          ok: false,
          error: "video_encode_failed",
        }),
        encodeMediaRecorder: async () => ({
          ok: false,
          error: "video_encode_failed",
        }),
      },
    });
    expect(result).toMatchObject({ ok: false, error: "video_encode_failed" });
    expect(result).not.toHaveProperty("preparedFile");
  });

  it("source > 10 s et encodeurs KO → video_duration_exceeds_limit", async () => {
    const result = await prepareVideoForUpload(mp4File(), {
      deps: {
        probe: async () => eligibleProbe(),
        decode: async () => decodeOk({ durationSec: 40 }),
        measureDuration: async () => ({ ok: true, seconds: 40 }),
        encodeWebCodecs: async () => ({
          ok: false,
          error: "video_encode_failed",
        }),
        encodeMediaRecorder: async () => ({
          ok: false,
          error: "video_encode_failed",
        }),
      },
    });
    expect(result).toEqual({
      ok: false,
      error: "video_duration_exceeds_limit",
    });
  });

  it("annulation après probe source → video_prepare_cancelled", async () => {
    const controller = new AbortController();
    const result = await prepareVideoForUpload(mp4File(), {
      signal: controller.signal,
      deps: {
        probe: async () => {
          controller.abort();
          return eligibleProbe();
        },
        decode: async () => decodeOk(),
        measureDuration: async () => ({ ok: true, seconds: 5 }),
      },
    });
    expect(result).toEqual({
      ok: false,
      error: "video_prepare_cancelled",
    });
  });

  it("validation finale durée > 10 → refus, pas d’original", async () => {
    let measureCalls = 0;
    const result = await prepareVideoForUpload(mp4File(), {
      deps: {
        probe: async () => eligibleProbe(),
        decode: async () => decodeOk({ durationSec: 5 }),
        measureDuration: async () => {
          measureCalls += 1;
          return measureCalls === 1
            ? { ok: true, seconds: 5 }
            : { ok: true, seconds: 10.05 };
        },
      },
    });
    expect(result).toEqual({
      ok: false,
      error: "video_output_duration_exceeds_limit",
    });
    expect(result).not.toHaveProperty("preparedFile");
  });

  it("échec décodage source → video_decode_failed", async () => {
    const result = await prepareVideoForUpload(mp4File(), {
      deps: {
        probe: async () => eligibleProbe(),
        decode: async () => ({ ok: false, error: "video_decode_failed" }),
        measureDuration: async () => ({ ok: true, seconds: 5 }),
      },
    });
    expect(result).toEqual({ ok: false, error: "video_decode_failed" });
  });

  it("durée source inconnue → video_duration_unknown (pas de fast-path)", async () => {
    const result = await prepareVideoForUpload(mp4File(), {
      deps: {
        probe: async () => eligibleProbe(),
        decode: async () => decodeOk({ durationSec: null }),
        measureDuration: async () => ({
          ok: false,
          error: "video_duration_unknown",
        }),
      },
    });
    expect(result).toEqual({ ok: false, error: "video_duration_unknown" });
  });

  it("annulation WebCodecs → MediaRecorder non appelé", async () => {
    const encodeMediaRecorder = vi.fn(async () => ({
      ok: true as const,
      preparedFile: mp4File(),
      requestedEncodeSec: 5,
      effectiveDurationSec: 5,
      outputWidth: 1280,
      outputHeight: 720,
      recorderMimeType: "video/mp4",
    }));
    const result = await prepareVideoForUpload(mp4File(), {
      deps: {
        probe: probeSourceThenPrepared(
          eligibleProbe({
            eligibleForFastPath: false,
            reasons: ["parse_failed"],
          }),
        ),
        decode: async () => decodeOk(),
        measureDuration: async () => ({ ok: true, seconds: 5 }),
        encodeWebCodecs: async () => ({
          ok: false,
          error: "video_prepare_cancelled",
        }),
        encodeMediaRecorder,
      },
    });
    expect(encodeMediaRecorder).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      error: "video_prepare_cancelled",
    });
  });

  it("WebCodecs durée sortie > 10 → pas de MediaRecorder, erreur propagée", async () => {
    const encodeMediaRecorder = vi.fn();
    const result = await prepareVideoForUpload(mp4File(), {
      deps: {
        probe: probeSourceThenPrepared(
          eligibleProbe({
            eligibleForFastPath: false,
            reasons: ["parse_failed"],
          }),
        ),
        decode: async () => decodeOk(),
        measureDuration: async () => ({ ok: true, seconds: 5 }),
        encodeWebCodecs: async () => ({
          ok: false,
          error: "video_output_duration_exceeds_limit",
        }),
        encodeMediaRecorder,
      },
    });
    expect(encodeMediaRecorder).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      error: "video_output_duration_exceeds_limit",
    });
  });

  it("fast-path : validation finale mesure la durée du préparé (pas la consigne)", async () => {
    let measureCalls = 0;
    const measureDuration = vi.fn(async () => {
      measureCalls += 1;
      return { ok: true as const, seconds: measureCalls === 1 ? 8 : 7.5 };
    });
    const result = await prepareVideoForUpload(mp4File(), {
      deps: {
        probe: async () => eligibleProbe(),
        decode: async () => decodeOk({ durationSec: 8 }),
        measureDuration,
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.path).toBe("fast");
    // 2 mesures : source + fichier préparé (fast-path = même octets)
    expect(measureDuration).toHaveBeenCalledTimes(2);
    expect(result.effectiveDurationSec).toBe(7.5);
  });

  it("sortie finale hors dims V1 → video_dimensions_exceed_limit", async () => {
    const encoded = mp4File();
    let decodeCalls = 0;
    const result = await prepareVideoForUpload(mp4File(), {
      deps: {
        probe: async () => eligibleProbe(),
        decode: async () => {
          decodeCalls += 1;
          // source 4K autorisée (enforceDimensionLimits=false) ;
          // final refuse si l’encode n’a pas ramené dans V1
          return decodeCalls === 1
            ? decodeOk({ orientedWidth: 3840, orientedHeight: 2160 })
            : ({
                ok: false,
                error: "video_dimensions_exceed_limit",
              } as const);
        },
        measureDuration: async () => ({ ok: true, seconds: 4 }),
        encodeWebCodecs: async () => ({
          ok: true,
          preparedFile: encoded,
          requestedEncodeSec: 4,
          effectiveDurationSec: 4,
          outputWidth: 3840,
          outputHeight: 2160,
        }),
      },
    });
    expect(result).toEqual({
      ok: false,
      error: "video_dimensions_exceed_limit",
    });
  });
});
