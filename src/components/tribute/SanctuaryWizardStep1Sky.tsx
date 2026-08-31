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
  resolveConstellationTemplate,
  resolveStrokeSequence,
} from "@/src/components/contribute/constellation/graphs/resolveConstellation";
import type { ConstellationRevealCraft } from "@/src/components/contribute/SanctuaryUniverse";
import { birthDateToZodiacSign } from "@/src/lib/contribute/zodiacSign";
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
  birthDate: string;
  revealT: number;
  revealTRef: MutableRefObject<number>;
  hideHeroName: boolean;
  skyActive: boolean;
  /** Phase typing = silhouette idle ; reward/done = play A→F (pas de settled forcé). */
  silhouetteIdle: boolean;
  panelFading?: boolean;
};

export function SanctuaryWizardStep1Sky({
  locale,
  firstName,
  birthDate,
  revealT,
  revealTRef,
  hideHeroName,
  skyActive,
  silhouetteIdle,
  panelFading = false,
}: SanctuaryWizardStep1SkyProps) {
  const zodiacSign = useMemo(
    () => birthDateToZodiacSign(birthDate),
    [birthDate],
  );
  const template = useMemo(
    () => resolveConstellationTemplate(zodiacSign),
    [zodiacSign],
  );
  const strokeSequence = useMemo(
    () => resolveStrokeSequence(zodiacSign),
    [zodiacSign],
  );
  /** Silhouette settled seulement si date valide + panneau saisie. */
  const showSilhouetteIdle = silhouetteIdle && zodiacSign != null;

  const craftReveal = useMemo((): ConstellationRevealCraft => {
    const heroName = firstName.trim() || "Margaret";
    return {
      controlled: true,
      revealT,
      revealTRef,
      hideHeroName,
      heroName,
      skyActive,
      silhouetteIdle: showSilhouetteIdle,
      /** Une paint même ciel gelé — date / prénom / template. */
      skyWakeKey: `${template.id}|${showSilhouetteIdle ? 1 : 0}|${firstName.trim()}|${birthDate}`,
      template,
      strokeSequence,
      heroAtom: {
        white: DEFAULT_HERO_WHITE,
        teal: DEFAULT_HERO_TEAL,
        spikes: DEFAULT_HERO_SPIKES,
        embedScale: 0.42,
        globalScale: DEFAULT_HERO_GLOBAL_SCALE,
      },
      slotLit: allGhostSlotLit(template),
      graphScale: 1,
      tipStrength: 1.2,
      tipStyle: "orb",
      tipColor: "#5eead4",
    };
  }, [
    firstName,
    birthDate,
    revealT,
    revealTRef,
    hideHeroName,
    skyActive,
    showSilhouetteIdle,
    template,
    strokeSequence,
  ]);

  return (
    <div
      className={[
        "pointer-events-none fixed inset-0 z-0 transition-opacity duration-700",
        panelFading ? "opacity-90" : "opacity-100",
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
