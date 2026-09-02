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
import { HUB_HERO_BREATH_SPEED_INVITE } from "@/src/components/contribute/constellation/graphs/hubIdle";
import type { ScreenAnchor } from "@/src/components/contribute/constellation/StarScreenReporter";
import {
  resolveConstellationTemplate,
  resolveStrokeSequence,
} from "@/src/components/contribute/constellation/graphs/resolveConstellation";
import type { ConstellationRevealCraft } from "@/src/components/contribute/SanctuaryUniverse";
import { SKY_HUB_LITE_LAYERS, SKY_RITUAL_LAYERS } from "@/src/components/contribute/constellation/skyCraftLayers";
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
  /** T-close-5a — opacité live via CSS var (rituel close, sans re-render). */
  liveLayerOpacityVar?: string;
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
  /** Hub — canvas pour capture gel Plan B. */
  onHubCanvasMount?: (canvas: HTMLCanvasElement | null) => void;
  closeStreakFire?: boolean;
};

const HUB_IDLE_REVEAL_REF = { current: WIZARD_IDLE_REVEAL_T } as MutableRefObject<number>;

const HUB_LITE_TEMPLATE = resolveConstellationTemplate(null);
const HUB_LITE_STROKE = resolveStrokeSequence(null);

function buildHubLiteCraftReveal(
  skyActive: boolean,
  hubPrompt?: string,
  hubTapHint?: string,
): ConstellationRevealCraft {
  const heroName = hubPrompt?.trim() || "Margaret";
  return {
    controlled: true,
    revealT: WIZARD_IDLE_REVEAL_T,
    revealTRef: HUB_IDLE_REVEAL_REF,
    hideHeroName: false,
    hubPrompt: true,
    hubTapHint,
    hubHeroOnly: true,
    heroName,
    skyActive,
    silhouetteIdle: false,
    skyWakeKey: "hub-lite-sky",
    template: HUB_LITE_TEMPLATE,
    strokeSequence: HUB_LITE_STROKE,
    heroAtom: {
      white: { ...DEFAULT_HERO_WHITE, breath: HUB_HERO_BREATH_SPEED_INVITE },
      teal: { ...DEFAULT_HERO_TEAL, breath: HUB_HERO_BREATH_SPEED_INVITE },
      spikes: { ...DEFAULT_HERO_SPIKES, breath: HUB_HERO_BREATH_SPEED_INVITE },
      embedScale: 0.42,
      globalScale: DEFAULT_HERO_GLOBAL_SCALE,
    },
    graphScale: 1,
    tipStrength: 1.2,
    tipStyle: "orb",
    tipColor: "#5eead4",
    heroParallax: 1,
  };
}

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
  liveLayerOpacityVar,
  onHubReady,
  fadeMs = 560,
  fadeEase = "cubic-bezier(0.4, 0, 0.2, 1)",
  hubPrompt,
  hubTapHint,
  onStarAnchorChange,
  onHubCanvasMount,
  closeStreakFire = false,
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

  const hubLiteCraftReveal = useMemo(
    () => buildHubLiteCraftReveal(skyActive, hubPrompt, hubTapHint),
    [skyActive, hubPrompt, hubTapHint],
  );

  const ritualCraftReveal = useMemo((): ConstellationRevealCraft => {
    const heroName = firstName.trim() || "Margaret";
    return {
      controlled: true,
      revealT,
      revealTRef,
      hideHeroName,
      heroName,
      skyActive,
      silhouetteIdle: showSilhouetteIdle,
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
      heroParallax: 0,
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

  const craftReveal = isHubLite ? hubLiteCraftReveal : ritualCraftReveal;
  const resolvedLayerOpacity = liveLayerOpacityVar
    ? (`var(${liveLayerOpacityVar}, ${layerOpacity})` as const)
    : layerOpacity;

  return (
    <div
      className={[
        "parcours-sky-hub-layer pointer-events-none fixed inset-0",
        isHubLite ? "z-0" : "z-[1]",
        liveLayerOpacityVar ? "parcours-sky-opacity-live" : "transition-opacity ease-out",
        panelFading ? "opacity-90" : "opacity-100",
      ].join(" ")}
      style={{
        ...(liveLayerOpacityVar
          ? {}
          : {
              transitionDuration: `${fadeMs}ms`,
              transitionTimingFunction: fadeEase,
            }),
        opacity: resolvedLayerOpacity,
        ...(isHubLite
          ? {}
          : { background: "transparent" }),
      }}
      aria-hidden
    >
      <SanctuaryUniverse
        key={isHubLite ? "parcours-hub" : "parcours-ritual"}
        mode="background"
        locale={locale === "en" ? "en" : "fr"}
        constellationVisible
        craftLite={false}
        hubSkyCamera={isHubLite}
        skyLayers={isHubLite ? SKY_HUB_LITE_LAYERS : SKY_RITUAL_LAYERS}
        overlayOnBackdrop={!isHubLite}
        wizardRewardFullPerf={!isHubLite && skyActive}
        craftReveal={craftReveal}
        onCanvasReady={isHubLite ? handleCanvasReady : undefined}
        onStarAnchorChange={isHubLite ? onStarAnchorChange : undefined}
        onHubCanvasMount={isHubLite ? onHubCanvasMount : undefined}
        closeStreakFire={isHubLite ? closeStreakFire : false}
        className="h-full w-full"
      />
      {/** Dégradé seulement hub — en overlay ça noircit le gel PNG. */}
      {isHubLite && !liveLayerOpacityVar ? (
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
