import { describe, expect, it } from "vitest";

import { evenDimension, fitVideoEncodeSize } from "@/src/lib/media/fitVideoEncodeSize";

describe("fitVideoEncodeSize", () => {
  it("ne grossit pas une vidéo déjà sous les plafonds", () => {
    expect(fitVideoEncodeSize(1280, 720)).toEqual({ width: 1280, height: 720 });
    expect(fitVideoEncodeSize(720, 1280)).toEqual({ width: 720, height: 1280 });
  });

  it("réduit un 4K paysage dans 1920×1080 sans déformation", () => {
    const size = fitVideoEncodeSize(3840, 2160);
    expect(size.width).toBeLessThanOrEqual(1920);
    expect(size.height).toBeLessThanOrEqual(1080);
    expect(size.width % 2).toBe(0);
    expect(size.height % 2).toBe(0);
    expect(size.width / size.height).toBeCloseTo(3840 / 2160, 2);
  });

  it("réduit un portrait large dans 1080×1920", () => {
    const size = fitVideoEncodeSize(2160, 3840);
    expect(size.width).toBeLessThanOrEqual(1080);
    expect(size.height).toBeLessThanOrEqual(1920);
    expect(size.width / size.height).toBeCloseTo(2160 / 3840, 2);
  });

  it("evenDimension force un pair ≥ 2", () => {
    expect(evenDimension(1)).toBe(2);
    expect(evenDimension(3)).toBe(2);
    expect(evenDimension(4)).toBe(4);
  });
});
