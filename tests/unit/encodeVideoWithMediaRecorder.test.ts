import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  createSilentAudioTrack,
  encodeVideoWithMediaRecorder,
  pickMediaRecorderMimeType,
} from "@/src/lib/media/encodeVideoWithMediaRecorder";
import { looksLikeIsoBmff } from "@/src/lib/media/ensurePreparedMp4Bytes";

const FIXTURES = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/mp4",
);

function loadBytes(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(FIXTURES, name)));
}

function mp4Blob(): Blob {
  const bytes = loadBytes("h264-landscape-1280x720.mp4");
  return new Blob(
    [bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer],
    { type: "video/mp4" },
  );
}

describe("createSilentAudioTrack", () => {
  it("route le silence vers MediaStreamDestination, jamais vers les haut-parleurs", async () => {
    const connected: string[] = [];
    const audioTrack = {
      stop: () => {
        connected.push("track.stop");
      },
    };
    const dest = {
      stream: { getAudioTracks: () => [audioTrack] },
    };
    const gain = {
      gain: { value: 1 },
      connect: (node: unknown) => {
        connected.push(node === dest ? "gain→dest" : "gain→other");
      },
      disconnect: () => connected.push("gain.disconnect"),
    };
    const osc = {
      connect: (node: unknown) => {
        connected.push(node === gain ? "osc→gain" : "osc→other");
      },
      start: () => connected.push("osc.start"),
      stop: () => connected.push("osc.stop"),
      disconnect: () => connected.push("osc.disconnect"),
    };
    const ctx = {
      state: "running" as AudioContextState,
      resume: async () => {
        connected.push("resume");
      },
      createMediaStreamDestination: () => dest,
      createOscillator: () => osc,
      createGain: () => gain,
      destination: { id: "speakers" },
    };

    const silent = await createSilentAudioTrack(ctx as unknown as AudioContext);
    expect(gain.gain.value).toBe(0);
    expect(connected).toEqual(["osc→gain", "gain→dest", "osc.start"]);
    expect(connected).not.toContain("gain→other");
    silent.stop();
    expect(connected).toContain("osc.stop");
    expect(connected).toContain("osc.disconnect");
    expect(connected).toContain("gain.disconnect");
    expect(connected).toContain("track.stop");
  });

  it("appelle resume() si le contexte est suspendu", async () => {
    let resumed = false;
    const dest = {
      stream: {
        getAudioTracks: () => [{ stop: () => undefined }],
      },
    };
    const gain = {
      gain: { value: 1 },
      connect: () => undefined,
    };
    const osc = {
      connect: () => undefined,
      start: () => undefined,
      stop: () => undefined,
    };
    const ctx = {
      state: "suspended" as AudioContextState,
      resume: async () => {
        resumed = true;
      },
      createMediaStreamDestination: () => dest,
      createOscillator: () => osc,
      createGain: () => gain,
      destination: {},
    };
    await createSilentAudioTrack(ctx as unknown as AudioContext);
    expect(resumed).toBe(true);
  });
});

describe("pickMediaRecorderMimeType", () => {
  it("préfère video/mp4 quand supporté", () => {
    expect(
      pickMediaRecorderMimeType((m) => m === "video/mp4" || m.startsWith("video/webm")),
    ).toBe("video/mp4");
  });

  it("retombe sur webm si mp4 indisponible", () => {
    expect(
      pickMediaRecorderMimeType((m) => m.startsWith("video/webm")),
    ).toBe("video/webm;codecs=vp9,opus");
  });

  it("null si aucun mime supporté", () => {
    expect(pickMediaRecorderMimeType(() => false)).toBeNull();
  });
});

describe("encodeVideoWithMediaRecorder", () => {
  it("fallback disponible : normalise en MP4 et mesure la durée effective", async () => {
    const result = await encodeVideoWithMediaRecorder(new Blob(), {
      sourceDurationSec: 5,
      orientedWidth: 1280,
      orientedHeight: 720,
      host: {
        isSupported: () => true,
        record: async () => mp4Blob(),
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preparedFile.type).toBe("video/mp4");
    expect(result.effectiveDurationSec).toBeGreaterThan(0);
    expect(result.effectiveDurationSec).toBeLessThanOrEqual(10);
    // jamais déduite de la consigne d'enregistrement
    expect(result.effectiveDurationSec).not.toBe(result.requestedEncodeSec);
    expect(result.recorderMimeType).toContain("mp4");
  });

  it("échec remux/ensureMp4 → video_encode_failed, aucun blob brut retourné", async () => {
    const result = await encodeVideoWithMediaRecorder(new Blob(), {
      sourceDurationSec: 5,
      orientedWidth: 640,
      orientedHeight: 360,
      host: {
        isSupported: () => true,
        record: async () =>
          new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])], {
            type: "video/webm",
          }),
      },
      ensureMp4: async () => {
        throw new Error("remux_invalid");
      },
    });
    expect(result).toMatchObject({ ok: false, error: "video_encode_failed" });
    expect(result).not.toHaveProperty("preparedFile");
  });

  it("fallback indisponible → video_encode_failed", async () => {
    const result = await encodeVideoWithMediaRecorder(new Blob(), {
      sourceDurationSec: 5,
      orientedWidth: 640,
      orientedHeight: 360,
      host: {
        isSupported: () => false,
        record: async () => mp4Blob(),
      },
    });
    expect(result).toMatchObject({ ok: false, error: "video_encode_failed" });
  });

  it("échec d'enregistrement → video_encode_failed, pas d'original", async () => {
    const result = await encodeVideoWithMediaRecorder(new Blob([new Uint8Array([9, 9, 9])]), {
      sourceDurationSec: 5,
      orientedWidth: 640,
      orientedHeight: 360,
      host: {
        isSupported: () => true,
        record: async () => {
          throw new Error("recorder_boom");
        },
      },
    });
    expect(result).toMatchObject({ ok: false, error: "video_encode_failed" });
    expect(result).not.toHaveProperty("preparedFile");
  });

  it("WebM brut : refuse de le traiter comme MP4 sans ensureMp4", async () => {
    // ensureMp4 mock qui échoue = pipeline refuse le WebM nu
    const result = await encodeVideoWithMediaRecorder(new Blob(), {
      sourceDurationSec: 5,
      orientedWidth: 640,
      orientedHeight: 360,
      host: {
        isSupported: () => true,
        record: async () =>
          new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])], {
            type: "video/webm",
          }),
      },
      ensureMp4: async () => {
        throw new Error("remux_failed");
      },
    });
    expect(result).toMatchObject({ ok: false, error: "video_encode_failed" });
  });

  it("annulation pendant l'enregistrement → video_prepare_cancelled", async () => {
    const controller = new AbortController();
    const pending = encodeVideoWithMediaRecorder(new Blob(), {
      sourceDurationSec: 5,
      orientedWidth: 640,
      orientedHeight: 360,
      signal: controller.signal,
      host: {
        isSupported: () => true,
        record: async () => {
          controller.abort();
          throw new Error("video_prepare_cancelled");
        },
      },
    });
    await expect(pending).resolves.toEqual({
      ok: false,
      error: "video_prepare_cancelled",
    });
  });

  it("annulation après record réussi invalide le résultat tardif", async () => {
    const controller = new AbortController();
    const result = await encodeVideoWithMediaRecorder(new Blob(), {
      sourceDurationSec: 5,
      orientedWidth: 640,
      orientedHeight: 360,
      signal: controller.signal,
      host: {
        isSupported: () => true,
        record: async () => {
          controller.abort();
          return mp4Blob();
        },
      },
    });
    expect(result).toEqual({ ok: false, error: "video_prepare_cancelled" });
    expect(result).not.toHaveProperty("preparedFile");
  });

  it("échec de mesure après finalisation → aucun preparedFile", async () => {
    const result = await encodeVideoWithMediaRecorder(new Blob(), {
      sourceDurationSec: 5,
      orientedWidth: 640,
      orientedHeight: 360,
      host: {
        isSupported: () => true,
        record: async () => mp4Blob(),
      },
      ensureMp4: async () => loadBytes("h264-landscape-1280x720.mp4"),
      measureDuration: async () => ({ ok: false, error: "video_duration_unknown" }),
    });
    expect(result).toEqual({ ok: false, error: "video_duration_unknown" });
    expect(result).not.toHaveProperty("preparedFile");
  });

  it("durée effective > 10 s → video_output_duration_exceeds_limit", async () => {
    const result = await encodeVideoWithMediaRecorder(new Blob(), {
      sourceDurationSec: 10,
      orientedWidth: 640,
      orientedHeight: 360,
      host: {
        isSupported: () => true,
        record: async () => mp4Blob(),
      },
      ensureMp4: async (blob) => {
        const buf = new Uint8Array(await blob.arrayBuffer());
        expect(looksLikeIsoBmff(buf)).toBe(true);
        return buf;
      },
      measureDuration: async () => ({ ok: true, seconds: 10.05 }),
    });
    expect(result).toEqual({
      ok: false,
      error: "video_output_duration_exceeds_limit",
    });
  });
});
