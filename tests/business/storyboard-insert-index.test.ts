import { describe, expect, it } from "vitest";

import {
  resolveGridInsertIndex,
  resolveGridInsertLine,
} from "@/src/lib/wizard/storyboardDnd";

const tile = (left: number, top: number) => ({
  left,
  top,
  width: 100,
  height: 80,
});

describe("resolveGridInsertIndex", () => {
  it("returns 0 on an empty grid", () => {
    expect(resolveGridInsertIndex([], 10, 10)).toBe(0);
  });

  it("inserts before a tile when the pointer is on its left half", () => {
    const slots = [tile(0, 0), tile(120, 0)];
    expect(resolveGridInsertIndex(slots, 20, 40)).toBe(0);
  });

  it("inserts between two tiles when the pointer is on the right half of the first", () => {
    const slots = [tile(0, 0), tile(120, 0)];
    expect(resolveGridInsertIndex(slots, 80, 40)).toBe(1);
  });

  it("inserts after the last tile when the pointer is on its right half", () => {
    const slots = [tile(0, 0), tile(120, 0)];
    expect(resolveGridInsertIndex(slots, 190, 40)).toBe(2);
  });
});

describe("resolveGridInsertLine", () => {
  it("places the bar in the gap between two side-by-side tiles", () => {
    const slots = [tile(0, 0), tile(120, 0)];
    const line = resolveGridInsertLine(slots, 1);
    expect(line).not.toBeNull();
    expect(line?.left).toBe(108);
    expect(line?.top).toBe(0);
    expect(line?.height).toBe(80);
  });

  it("places the bar after the last tile", () => {
    const slots = [tile(0, 0), tile(120, 0)];
    const line = resolveGridInsertLine(slots, 2);
    expect(line?.left).toBe(220);
  });
});
