import { describe, expect, it } from "vitest";

import {
  QUIET_LUXURY_END_BLACK_SEC,
  QUIET_LUXURY_PRE_MEMORY_BLACK_SEC,
  QUIET_LUXURY_TEASER_END_BLACK_SEC,
} from "@/src/components/tribute/QuietLuxuryPlayer";

describe("C4 QuietLuxuryPlayer garde-fous", () => {
  it("noir de fin cinéma ≥ 1.5 s (callback hub C8)", () => {
    expect(QUIET_LUXURY_END_BLACK_SEC).toBeGreaterThanOrEqual(1.5);
  });

  it("noir pré-carte mémoire cinéma = 1.5 s (C5-4)", () => {
    expect(QUIET_LUXURY_PRE_MEMORY_BLACK_SEC).toBe(1.5);
  });

  it("noir de fin teaser ≥ 1 s", () => {
    expect(QUIET_LUXURY_TEASER_END_BLACK_SEC).toBeGreaterThanOrEqual(1);
  });
});
