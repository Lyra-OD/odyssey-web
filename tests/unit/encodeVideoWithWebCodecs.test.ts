import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  encodeVideoWithWebCodecs,
  type WebCodecsEncodePlan,
} from "@/src/lib/media/encodeVideoWithWebCodecs";
import { VIDEO_DURATION_CEILING_SEC } from "@/src/lib/media/videoDurationContract";

const FIXTURES = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/mp4",
);

function loadBytes(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(FIXTURES, name)));
}

describe("encodeVideoWithWebCodecs", () => {
  it("valide la durée effective du fichier muxé, pas la consigne encodeur", async () => {
    const muxed = loadBytes("h264-landscape-1280x720.mp4");
    let captured: WebCodecsEncodePlan | undefined;
    const encodeToMp4 = async (plan: WebCodecsEncodePlan) => {
      captured = plan;
      return muxed;
    };

    const result = await encodeVideoWithWebCodecs(new Blob(), {
      sourceDurationSec: 8,
      orientedWidth: 1280,
      orientedHeight: 720,
      host: { encodeToMp4 },
    });

    expect(captured).toBeDefined();
    expect(captured!.requestedEncodeSec).toBe(8);
    expect(captured!.requestedEncodeSec).toBeLessThanOrEqual(VIDEO_DURATION_CEILING_SEC);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.requestedEncodeSec).toBe(8);
    expect(result.effectiveDurationSec).toBeGreaterThan(0);
    expect(result.effectiveDurationSec).toBeLessThanOrEqual(VIDEO_DURATION_CEILING_SEC);
    expect(result.effectiveDurationSec).not.toBe(result.requestedEncodeSec);
    expect(result.preparedFile.type).toBe("video/mp4");
  });

  it("plafonne la durée demandée à 10 s même si la source est plus longue", async () => {
    let captured: WebCodecsEncodePlan | undefined;
    await encodeVideoWithWebCodecs(new Blob(), {
      sourceDurationSec: 45,
      orientedWidth: 1280,
      orientedHeight: 720,
      host: {
        encodeToMp4: async (plan) => {
          captured = plan;
          return loadBytes("h264-landscape-1280x720.mp4");
        },
      },
    });
    expect(captured?.requestedEncodeSec).toBe(10);
  });

  it("rejette si la durée effective mesurée dépasse 10,0 s", async () => {
    const result = await encodeVideoWithWebCodecs(new Blob(), {
      sourceDurationSec: 10,
      orientedWidth: 1280,
      orientedHeight: 720,
      host: {
        encodeToMp4: async () => loadBytes("h264-landscape-1280x720.mp4"),
      },
      measureDuration: async () => ({ ok: true, seconds: 10.03 }),
    });
    expect(result).toEqual({
      ok: false,
      error: "video_output_duration_exceeds_limit",
    });
  });

  it("fail-closed si la durée effective est inconnue (pas d'original brut)", async () => {
    const result = await encodeVideoWithWebCodecs(new Blob([new Uint8Array([1, 2, 3])]), {
      sourceDurationSec: 5,
      orientedWidth: 640,
      orientedHeight: 360,
      host: {
        encodeToMp4: async () => new Uint8Array([0, 0, 0, 8, 102, 116, 121, 112]),
      },
      measureDuration: async () => ({ ok: false, error: "video_duration_unknown" }),
    });
    expect(result).toEqual({ ok: false, error: "video_duration_unknown" });
    expect(result).not.toHaveProperty("preparedFile");
  });

  it("annulation → video_prepare_cancelled", async () => {
    const result = await encodeVideoWithWebCodecs(new Blob(), {
      sourceDurationSec: 5,
      orientedWidth: 640,
      orientedHeight: 360,
      signal: AbortSignal.abort(),
      host: { encodeToMp4: async () => loadBytes("h264-landscape-1280x720.mp4") },
    });
    expect(result).toEqual({ ok: false, error: "video_prepare_cancelled" });
  });

  it("échec encodeur → video_encode_failed", async () => {
    const result = await encodeVideoWithWebCodecs(new Blob(), {
      sourceDurationSec: 5,
      orientedWidth: 640,
      orientedHeight: 360,
      host: {
        encodeToMp4: async () => {
          throw new Error("boom");
        },
      },
    });
    expect(result).toEqual({ ok: false, error: "video_encode_failed" });
  });
});
