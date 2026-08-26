"use client";

import dynamic from "next/dynamic";
import { useMemo, type MutableRefObject } from "react";

import {
  DEFAULT_HERO_GLOBAL_SCALE,
  DEFAULT_HERO_SPIKES,
  DEFAULT_HERO_TEAL,
  DEFAULT_HERO_WHITE,
} from "@/src/components/contribute/constellation/HeroStar";
import {
  allGhostSlotLit,
} from "@/src/components/contribute/constellation/graphs/resolveConstellation";
import type { ConstellationRevealCraft } from "@/src/components/contribute/SanctuaryUniverse";
import type { Locale } from "@/i18n.config";

const SanctuaryUniverse = dynamic(
  () =>
    import("@/src/components/contribute/SanctuaryUniverse").then(
      (m) => m.SanctuaryUniverse,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-0 bg-black" aria-hidden />
    ),
  },
);

type SanctuaryWizardStep1SkyProps = {
  locale: Locale;
  firstName: string;
  revealT: number;
  revealTRef: MutableRefObject<number>;
  hideHeroName: boolean;
  panelFading?: boolean;
};

export function SanctuaryWizardStep1Sky({
  locale,
  firstName,
  revealT,
  revealTRef,
  hideHeroName,
  panelFading = false,
}: SanctuaryWizardStep1SkyProps) {
  const craftReveal = useMemo((): ConstellationRevealCraft => {
    const heroName = firstName.trim() || "Margaret";
    return {
      controlled: true,
      revealT,
      revealTRef,
      hideHeroName,
      heroName,
      heroAtom: {
        white: DEFAULT_HERO_WHITE,
        teal: DEFAULT_HERO_TEAL,
        spikes: DEFAULT_HERO_SPIKES,
        embedScale: 0.42,
        globalScale: DEFAULT_HERO_GLOBAL_SCALE,
      },
      slotLit: allGhostSlotLit(),
      graphScale: 1,
      tipStrength: 1.2,
      tipStyle: "orb",
      tipColor: "#5eead4",
    };
  }, [firstName, revealT, revealTRef, hideHeroName]);

  return (
    <div
      className={[
        "pointer-events-none fixed inset-0 z-0 transition-opacity duration-700 opacity-100",
      ].join(" ")}
      aria-hidden
    >
      <SanctuaryUniverse
        mode="background"
        locale={locale === "en" ? "en" : "fr"}
        constellationVisible
        craftReveal={craftReveal}
        className="h-full w-full"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50"
        aria-hidden
      />
    </div>
  );
}
