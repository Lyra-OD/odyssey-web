import { describe, expect, it } from "vitest";

import {
  resolveCinemaChapterTitle,
  type CinemaChapterTitlesCopy,
} from "@/src/lib/wizard/teaserHelpers";
import {
  resolveMontageChapterTabLabel,
  type MontageChapterTabsCopy,
} from "@/src/surfaces/livre/storyboard/MontageChapterTabs";

/** Défauts S5-L2 (valeurs FR de référence pour les tests de résolution). */
const CHAPTER_TABS: MontageChapterTabsCopy = {
  ariaLabel: "Chapitres du film",
  tabSpark: "Racines & Premiers Pas",
  tabEpic: "Au Cœur de la Vie",
  tabLegacy: "Passions & Lumière",
  tabHorizons: "Liens & Partages",
  tabLegacyMemory: "Souvenirs & Héritage",
  tabFallback: "Chapitre {index}",
};

const CINEMA_TITLES: CinemaChapterTitlesCopy = {
  chapter1: CHAPTER_TABS.tabSpark,
  chapter2: CHAPTER_TABS.tabEpic,
  chapter3: CHAPTER_TABS.tabLegacy,
  chapter4: CHAPTER_TABS.tabHorizons,
  chapter5Plus: CHAPTER_TABS.tabLegacyMemory,
  trackCredit: "Piste : {title} — {artist}",
  trackCreditTitleOnly: "Piste : {title}",
};

describe("S5-L2 titres chapitre défaut", () => {
  it("resolveMontageChapterTabLabel mappe les 5 défauts universels par index", () => {
    expect(resolveMontageChapterTabLabel(0, CHAPTER_TABS)).toBe(
      "Racines & Premiers Pas",
    );
    expect(resolveMontageChapterTabLabel(1, CHAPTER_TABS)).toBe(
      "Au Cœur de la Vie",
    );
    expect(resolveMontageChapterTabLabel(2, CHAPTER_TABS)).toBe(
      "Passions & Lumière",
    );
    expect(resolveMontageChapterTabLabel(3, CHAPTER_TABS)).toBe(
      "Liens & Partages",
    );
    expect(resolveMontageChapterTabLabel(4, CHAPTER_TABS)).toBe(
      "Souvenirs & Héritage",
    );
    expect(resolveMontageChapterTabLabel(7, CHAPTER_TABS)).toBe(
      "Souvenirs & Héritage",
    );
  });

  it("resolveCinemaChapterTitle préfère le titre personnalisé au défaut", () => {
    expect(
      resolveCinemaChapterTitle(0, "Notre histoire", CINEMA_TITLES),
    ).toBe("Notre histoire");
    expect(resolveCinemaChapterTitle(0, "  ", CINEMA_TITLES)).toBe(
      "Racines & Premiers Pas",
    );
    expect(resolveCinemaChapterTitle(0, null, CINEMA_TITLES)).toBe(
      "Racines & Premiers Pas",
    );
    expect(resolveCinemaChapterTitle(3, undefined, CINEMA_TITLES)).toBe(
      "Liens & Partages",
    );
    expect(resolveCinemaChapterTitle(5, "  Famille  ", CINEMA_TITLES)).toBe(
      "Famille",
    );
  });
});
