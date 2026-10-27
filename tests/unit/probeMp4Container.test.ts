import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  locateTopLevelBoxes,
  moovPositionFromBoxes,
  probeMp4Container,
} from "@/src/lib/media/probeMp4Container";

const FIXTURES = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/mp4",
);

function load(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(FIXTURES, name)));
}

function box(type: string, payload: Uint8Array = new Uint8Array()): Uint8Array {
  const size = 8 + payload.byteLength;
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  view.setUint32(0, size);
  for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i);
  out.set(payload, 8);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.byteLength, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.byteLength;
  }
  return out;
}

describe("locateTopLevelBoxes / moovPositionFromBoxes", () => {
  it("détecte moov avant mdat (début)", () => {
    const bytes = concat([
      box("ftyp", new Uint8Array([0, 0, 0, 0])),
      box("moov", new Uint8Array([1])),
      box("mdat", new Uint8Array([2, 3])),
    ]);
    const boxes = locateTopLevelBoxes(bytes);
    expect(boxes.map((b) => b.type)).toEqual(["ftyp", "moov", "mdat"]);
    expect(moovPositionFromBoxes(boxes)).toBe("start");
  });

  it("détecte moov après mdat (fin)", () => {
    const bytes = concat([
      box("ftyp", new Uint8Array([0, 0, 0, 0])),
      box("mdat", new Uint8Array([2, 3])),
      box("moov", new Uint8Array([1])),
    ]);
    expect(moovPositionFromBoxes(locateTopLevelBoxes(bytes))).toBe("end");
  });

  it("s'arrête sur une lecture partielle / size incohérente", () => {
    const broken = new Uint8Array([0, 0, 0, 20, 102, 116, 121, 112]); // size 20 but only 8 bytes
    expect(locateTopLevelBoxes(broken)).toEqual([]);
  });
});

describe("probeMp4Container", () => {
  it("H.264 + AAC, moov en début → eligible conteneur, pas conformité 8-bit", async () => {
    const result = await probeMp4Container(load("h264-aac-moov-start.mp4"));
    expect(result.container).toBe("iso_bmff");
    expect(result.hasFtyp).toBe(true);
    expect(result.hasMoov).toBe(true);
    expect(result.hasMdat).toBe(true);
    expect(result.moovPosition).toBe("start");
    expect(result.videoTrackCount).toBe(1);
    expect(result.audioTrackCount).toBe(1);
    expect(result.videoCodec).toMatch(/^avc1/i);
    expect(result.audioCodec).toMatch(/^mp4a/i);
    expect(result.eligibleForFastPath).toBe(true);
    expect(result.reasons).toEqual([]);
    expect(result.bitDepthVerified).toBe(false);
    expect(result.unverifiedFields).toContain("bit_depth");
    expect(result).not.toHaveProperty("readyForUpload");
  });

  it("H.264 + AAC, moov en fin (fichier complet) → eligible, position end", async () => {
    const result = await probeMp4Container(load("h264-aac-moov-end.mp4"));
    expect(result.hasMoov).toBe(true);
    expect(result.moovPosition).toBe("end");
    expect(result.videoCodec).toMatch(/^avc1/i);
    expect(result.audioCodec).toMatch(/^mp4a/i);
    expect(result.eligibleForFastPath).toBe(true);
    expect(result.bitDepthVerified).toBe(false);
  });

  it("moov en fin mais buffer tronqué avant moov → pas eligible", async () => {
    const result = await probeMp4Container(
      load("h264-aac-moov-end-truncated-before-moov.bin"),
    );
    expect(result.hasFtyp).toBe(true);
    expect(result.hasMdat).toBe(true);
    expect(result.hasMoov).toBe(false);
    expect(result.eligibleForFastPath).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining(["moov_missing"]),
    );
  });

  it("H.264 muet (0 piste audio) → eligible", async () => {
    const result = await probeMp4Container(load("h264-silent-moov-start.mp4"));
    expect(result.videoTrackCount).toBe(1);
    expect(result.audioTrackCount).toBe(0);
    expect(result.audioCodec).toBeNull();
    expect(result.videoCodec).toMatch(/^avc1/i);
    expect(result.eligibleForFastPath).toBe(true);
    expect(result.bitDepthVerified).toBe(false);
  });

  it("HEVC → pas de fast-path (video_codec_unsupported)", async () => {
    const result = await probeMp4Container(load("hevc-silent-moov-start.mp4"));
    expect(result.hasMoov).toBe(true);
    expect(result.videoCodec).toMatch(/^(hvc1|hev1)/i);
    expect(result.eligibleForFastPath).toBe(false);
    expect(result.reasons).toContain("video_codec_unsupported");
    expect(result.bitDepthVerified).toBe(false);
  });

  it("fichier non conteneur → not_iso_bmff", async () => {
    const result = await probeMp4Container(load("not-a-container.bin"));
    expect(result.eligibleForFastPath).toBe(false);
    expect(result.reasons).toContain("not_iso_bmff");
    expect(result.container).toBe("unknown");
    expect(result.hasMoov).toBe(false);
  });

  it("lecture partielle (ftyp seul) → moov_missing", async () => {
    const result = await probeMp4Container(load("h264-aac-partial.bin"));
    expect(result.eligibleForFastPath).toBe(false);
    expect(result.hasFtyp).toBe(true);
    expect(result.hasMoov).toBe(false);
    expect(result.videoCodec).toBeNull();
    expect(result.reasons).toEqual(
      expect.arrayContaining(["moov_missing"]),
    );
  });

  it("métadonnées absentes / buffer vide → refus", async () => {
    const result = await probeMp4Container(new Uint8Array());
    expect(result.eligibleForFastPath).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining(["not_iso_bmff", "parse_incomplete"]),
    );
  });
});
