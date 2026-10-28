import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  blobSuggestsMp4,
  blobSuggestsWebm,
  ensurePreparedMp4Bytes,
  looksLikeIsoBmff,
} from "@/src/lib/media/ensurePreparedMp4Bytes";

const FIXTURES = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/mp4",
);

function load(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(FIXTURES, name)));
}

describe("looksLikeIsoBmff / mime helpers", () => {
  it("détecte ftyp sur un MP4 réel", () => {
    expect(looksLikeIsoBmff(load("h264-landscape-1280x720.mp4"))).toBe(true);
    expect(looksLikeIsoBmff(new Uint8Array([1, 2, 3]))).toBe(false);
  });

  it("classifie les mime MediaRecorder", () => {
    expect(blobSuggestsMp4(new Blob([], { type: "video/mp4" }))).toBe(true);
    expect(blobSuggestsWebm(new Blob([], { type: "video/webm;codecs=vp8" }))).toBe(
      true,
    );
  });
});

describe("ensurePreparedMp4Bytes", () => {
  it("accepte un blob déjà MP4 (ftyp)", async () => {
    const bytes = load("h264-landscape-1280x720.mp4");
    const out = await ensurePreparedMp4Bytes(
      new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer], {
        type: "video/mp4",
      }),
    );
    expect(looksLikeIsoBmff(out)).toBe(true);
    expect(out.byteLength).toBe(bytes.byteLength);
  });

  it("refuse un mime mp4 sans ftyp (pas de faux positif)", async () => {
    await expect(
      ensurePreparedMp4Bytes(new Blob([new Uint8Array([0, 0, 0, 1])], { type: "video/mp4" })),
    ).rejects.toThrow(/recorder_not_mp4/);
  });

  it("ftyp seul → tente remux puis échoue (pas d'acceptation brute)", async () => {
    // boîte ftyp minimale, sans moov / piste H.264
    const ftypOnly = new Uint8Array([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, // ftyp
      0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x00, 0x00, // isom
      0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x00, 0x00,
    ]);
    expect(looksLikeIsoBmff(ftypOnly)).toBe(true);
    await expect(
      ensurePreparedMp4Bytes(new Blob([ftypOnly], { type: "video/mp4" })),
    ).rejects.toThrow();
  });

  it("MP4 HEVC → refuse le brut (tente remux, échoue hors navigateur encode)", async () => {
    const bytes = load("hevc-silent-moov-start.mp4");
    expect(looksLikeIsoBmff(bytes)).toBe(true);
    await expect(
      ensurePreparedMp4Bytes(
        new Blob(
          [
            bytes.buffer.slice(
              bytes.byteOffset,
              bytes.byteOffset + bytes.byteLength,
            ) as ArrayBuffer,
          ],
          { type: "video/mp4" },
        ),
      ),
    ).rejects.toThrow();
  });

  it("annulation avant remux → video_prepare_cancelled", async () => {
    await expect(
      ensurePreparedMp4Bytes(
        new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])], { type: "video/webm" }),
        AbortSignal.abort(),
      ),
    ).rejects.toThrow(/video_prepare_cancelled/);
  });
});
