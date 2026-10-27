import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { measurePreparedVideoDuration } from "@/src/lib/media/measurePreparedVideoDuration";

const FIXTURES = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/mp4",
);

function load(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(FIXTURES, name)));
}

describe("measurePreparedVideoDuration", () => {
  it("lit la durée dans le moov d'un MP4 réel (pas une estimation encodeur)", async () => {
    const result = await measurePreparedVideoDuration(
      load("h264-aac-moov-start.mp4"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.seconds).toBeGreaterThan(0.2);
    expect(result.seconds).toBeLessThan(1);
  });

  it("fonctionne aussi quand moov est en fin de fichier", async () => {
    const result = await measurePreparedVideoDuration(
      load("h264-aac-moov-end.mp4"),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.seconds).toBeGreaterThan(0.2);
  });

  it("refuse un buffer non mesurable (fail-closed)", async () => {
    expect(await measurePreparedVideoDuration(new Uint8Array([1, 2, 3]))).toEqual(
      { ok: false, error: "video_duration_unknown" },
    );
    expect(await measurePreparedVideoDuration(load("not-a-container.bin"))).toEqual(
      { ok: false, error: "video_duration_unknown" },
    );
  });
});
