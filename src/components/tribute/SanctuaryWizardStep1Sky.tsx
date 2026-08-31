"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, type MutableRefObject } from "react";

import { SkyBackdrop } from "@/src/components/contribute/SkyBackdrop";
import {
  DEFAULT_HERO_GLOBAL_SCALE,
  DEFAULT_HERO_SPIKES,
  DEFAULT_HERO_TEAL,
  DEFAULT_HERO_WHITE,
} from "@/src/components/contribute/constellation/HeroStar";
import { HUB_HERO_BREATH_SPEED } from "@/src/components/contribute/constellation/graphs/hubIdle";
import type { ScreenAnchor } from "@/src/components/contribute/constellation/StarScreenReporter";
import {
  allGhostSlotLit,
  resolveConstellationTemplate,
  resolveStrokeSequence,
} from "@/src/components/contribute/constellation/graphs/resolveConstellation";
import type { ConstellationRevealCraft } from "@/src/components/contribute/SanctuaryUniverse";
import { SKY_HUB_LITE_LAYERS } from "@/src/components/contribute/constellation/skyCraftLayers";
import { birthDateToZodiacSign } from "@/src/lib/contribute/zodiacSign";
import { WIZARD_IDLE_REVEAL_T } from "@/src/lib/contribute/wizardBirthReveal";
import type { Locale } from "@/i18n.config";

const SanctuaryUniverse = dynamic(
  () =>
    import("@/src/components/contribute/SanctuaryUniverse").then(
      (m) => m.SanctuaryUniverse,
    ),
  {
    ssr: false,
    loading: () => <SkyBackdrop opacity={1} />,
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
  /** hub-lite = ciel test-ciel + dolly Hero · ritual = reveal Continuer. */
  variant?: "hub-lite" | "ritual";
  /** Opacité crossfade hub ↔ panneau (0–1). */
  layerOpacity?: number;
  /** Hub WebGL : premier frame prêt. */
  onHubReady?: () => void;
  /** Durée crossfade A/D. */
  fadeMs?: number;
  /** Courbe CSS (KEEP thaw). */
  fadeEase?: string;
  /** Hub — invite accrochée à l’étoile (dictionnaire). */
  hubPrompt?: string;
  hubTapHint?: string;
  onStarAnchorChange?: (anchor: ScreenAnchor | null) => void;
};

const HUB_IDLE_REVEAL_REF = { current: WIZARD_IDLE_REVEAL_T } as MutableRefObject<number>;

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
  variant = "ritual",
  layerOpacity = 1,
  onHubReady,
  fadeMs = 560,
  fadeEase = "cubic-bezier(0.4, 0, 0.2, 1)",
  hubPrompt,
  hubTapHint,
  onStarAnchorChange,
}: SanctuaryWizardStep1SkyProps) {
  const isHubLite = variant === "hub-lite";
  const handleCanvasReady = useCallback(() => {
    if (isHubLite) onHubReady?.();
  }, [isHubLite, onHubReady]);
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
    const heroName = isHubLite
      ? (hubPrompt?.trim() || "Margaret")
      : firstName.trim() || "Margaret";
    return {
      controlled: true,
      revealT: isHubLite ? WIZARD_IDLE_REVEAL_T : revealT,
      revealTRef: isHubLite ? HUB_IDLE_REVEAL_REF : revealTRef,
      hideHeroName: isHubLite ? false : hideHeroName,
      hubPrompt: isHubLite,
      hubTapHint: isHubLite ? hubTapHint : undefined,
      heroName,
      skyActive,
      silhouetteIdle: isHubLite ? false : showSilhouetteIdle,
      skyWakeKey: isHubLite
        ? "hub-lite-sky"
        : `${template.id}|${showSilhouetteIdle ? 1 : 0}|${firstName.trim()}|${birthDate}`,
      template,
      strokeSequence,
      heroAtom: {
        white: isHubLite
          ? { ...DEFAULT_HERO_WHITE, breath: HUB_HERO_BREATH_SPEED }
          : DEFAULT_HERO_WHITE,
        teal: isHubLite
          ? { ...DEFAULT_HERO_TEAL, breath: HUB_HERO_BREATH_SPEED }
          : DEFAULT_HERO_TEAL,
        spikes: isHubLite
          ? { ...DEFAULT_HERO_SPIKES, breath: HUB_HERO_BREATH_SPEED }
          : DEFAULT_HERO_SPIKES,
        embedScale: 0.42,
        globalScale: DEFAULT_HERO_GLOBAL_SCALE,
      },
      slotLit: allGhostSlotLit(template),
      graphScale: 1,
      tipStrength: 1.2,
      tipStyle: "orb",
      tipColor: "#5eead4",
      heroParallax: isHubLite ? 1 : undefined,
    };
  }, [
    isHubLite,
    hubPrompt,
    hubTapHint,
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
        "pointer-events-none fixed inset-0 z-0 transition-opacity ease-out",
        panelFading ? "opacity-90" : "opacity-100",
      ].join(" ")}
      style={{
        transitionDuration: `${fadeMs}ms`,
        transitionTimingFunction: fadeEase,
        opacity: layerOpacity,
      }}
      aria-hidden
    >
      <SanctuaryUniverse
        mode="background"
        locale={locale === "en" ? "en" : "fr"}
        constellationVisible
        craftLite={false}
        hubSkyCamera={isHubLite}
        skyLayers={isHubLite ? SKY_HUB_LITE_LAYERS : undefined}
        craftReveal={craftReveal}
        onCanvasReady={isHubLite ? handleCanvasReady : undefined}
        onStarAnchorChange={isHubLite ? onStarAnchorChange : undefined}
        className="h-full w-full"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50"
        aria-hidden
      />
    </div>
  );
}
