import { describe, expect, it } from "vitest";

import {
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
  it("constants FIGÉ 5s ouverture · 8s outro dernier", () => {
    expect(CHAPTER1_OPENING_TAX_SEC).toBe(5);
    expect(LAST_CHAPTER_ENDING_OUTRO_SEC).toBe(8);
    expect(CHAPTER_INTRO_MARGIN_SEC).toBe(5);
    expect(CHAPTER_OUTRO_MARGIN_SEC).toBe(5);
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

  it("overhead: milieu 10 · premier 15 · dernier 13 · seul 18", () => {
    expect(chapterOverheadSeconds()).toBe(10);
    expect(
      chapterOverheadSeconds({ isFirstChapter: false, isLastChapter: false }),
    ).toBe(10);
    expect(
      chapterOverheadSeconds({ isFirstChapter: true, isLastChapter: false }),
    ).toBe(15);
    expect(
      chapterOverheadSeconds({ isFirstChapter: false, isLastChapter: true }),
    ).toBe(13);
    expect(
      chapterOverheadSeconds({ isFirstChapter: true, isLastChapter: true }),
    ).toBe(18);
  });

  it("210s song: milieu 28 photos · premier 27 · dernier 28", () => {
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
    // 210-10=200 → 28 ; 210-15=195 → 27 ; 210-13=197 → 28
    expect(mid).toBe(28);
    expect(first).toBe(27);
    expect(last).toBe(28);
    expect(chapterAvailableSecondsForMedia(210, chapterPacingRole(0, 3))).toBe(
      195,
    );
  });
});
