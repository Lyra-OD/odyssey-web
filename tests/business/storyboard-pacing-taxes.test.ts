import { describe, expect, it } from "vitest";

import {
  BREATH_CHAPTER_END_HOLD_SEC,
  BREATH_FINALE_DEEP_TO_BLACK_SEC,
  BREATH_FINALE_HOLD_SEC,
  CHAPTER1_OPENING_TAX_SEC,
  CHAPTER_INTRO_MARGIN_SEC,
  CHAPTER_OUTRO_MARGIN_SEC,
  LAST_CHAPTER_ENDING_OUTRO_SEC,
  chapterAvailableSecondsForMedia,
  chapterOverheadSeconds,
  chapterPacingRole,
  chapterRecommendedCapacity,
} from "@/src/lib/wizard/storyboardPacing";

describe("Quiet Luxury pacing taxes (commit 0)", () => {
  it("constants FIGÉ 5s ouverture · 9s outro dernier · Breath holds + deep-to-black", () => {
    expect(CHAPTER1_OPENING_TAX_SEC).toBe(5);
    expect(LAST_CHAPTER_ENDING_OUTRO_SEC).toBe(9);
    expect(CHAPTER_INTRO_MARGIN_SEC).toBe(5);
    expect(CHAPTER_OUTRO_MARGIN_SEC).toBe(5);
    expect(BREATH_CHAPTER_END_HOLD_SEC).toBe(2.5);
    expect(BREATH_FINALE_HOLD_SEC).toBe(3);
    expect(BREATH_FINALE_DEEP_TO_BLACK_SEC).toBe(2.2);
  });

  it("role first / middle / last / alone", () => {
    expect(chapterPacingRole(0, 3)).toEqual({
      isFirstChapter: true,
      isLastChapter: false,
    });
    expect(chapterPacingRole(1, 3)).toEqual({
      isFirstChapter: false,
      isLastChapter: false,
    });
    expect(chapterPacingRole(2, 3)).toEqual({
      isFirstChapter: false,
      isLastChapter: true,
    });
    expect(chapterPacingRole(0, 1)).toEqual({
      isFirstChapter: true,
      isLastChapter: true,
    });
  });

  it("overhead: sans role 10 · milieu 12.5 · premier 17.5 · dernier 19.2 · seul 24.2", () => {
    expect(chapterOverheadSeconds()).toBe(10);
    expect(
      chapterOverheadSeconds({ isFirstChapter: false, isLastChapter: false }),
    ).toBe(12.5);
    expect(
      chapterOverheadSeconds({ isFirstChapter: true, isLastChapter: false }),
    ).toBe(17.5);
    expect(
      chapterOverheadSeconds({ isFirstChapter: false, isLastChapter: true }),
    ).toBe(19.2);
    expect(
      chapterOverheadSeconds({ isFirstChapter: true, isLastChapter: true }),
    ).toBe(24.2);
  });

  it("210s song: milieu 28 → 28 · premier 27 → 27 · dernier 27 (taxe Breath + deep)", () => {
    const target = 7;
    const mid = chapterRecommendedCapacity(
      210,
      target,
      chapterPacingRole(1, 3),
    );
    const first = chapterRecommendedCapacity(
      210,
      target,
      chapterPacingRole(0, 3),
    );
    const last = chapterRecommendedCapacity(
      210,
      target,
      chapterPacingRole(2, 3),
    );
    // 210-12.5=197.5 → 28 ; 210-17.5=192.5 → 27 ; 210-19.2=190.8 → 27
    expect(mid).toBe(28);
    expect(first).toBe(27);
    expect(last).toBe(27);
    expect(chapterAvailableSecondsForMedia(210, chapterPacingRole(0, 3))).toBe(
      192.5,
    );
  });
});
