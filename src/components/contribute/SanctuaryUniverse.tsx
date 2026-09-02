"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { WebGLRenderer, Vector3, Color } from "three";

import {
  LueurHitTarget,
  LueurNode,
} from "@/src/components/contribute/LueurNode";
import {
  HeroStar,
  DEFAULT_HERO_PARALLAX,
  type HeroLayerKnobs,
} from "@/src/components/contribute/constellation/HeroStar";
import { useHeroNameSeparation } from "@/src/components/contribute/constellation/useHeroNameSeparation";
import { CameraRig } from "@/src/components/contribute/constellation/CameraRig";
import { CosmicDust } from "@/src/components/contribute/constellation/CosmicDust";
import { ZodiacalLight } from "@/src/components/contribute/constellation/ZodiacalLight";
import { AuroraVeil } from "@/src/components/contribute/constellation/AuroraVeil";
import { MilkyDustLanes } from "@/src/components/contribute/constellation/MilkyDustLanes";
import { SkyPanorama } from "@/src/components/contribute/constellation/SkyPanorama";
import { FocusCamera } from "@/src/components/contribute/constellation/FocusCamera";
import { IdleCameraDrift } from "@/src/components/contribute/constellation/IdleCameraDrift";
import { HubSkyCamera } from "@/src/components/contribute/constellation/HubSkyCamera";
import { RevealCamera } from "@/src/components/contribute/constellation/RevealCamera";
import { LightBridges } from "@/src/components/contribute/constellation/LightBridges";
import {
  DEFAULT_BRIDGES,
  DEFAULT_SLOT_STARS,
  type BridgesCraft,
  type SlotStarsCraft,
} from "@/src/components/contribute/constellation/craftDefaults";
import { MemoryReveal } from "@/src/components/contribute/constellation/MemoryReveal";
import { NebulaGasFar } from "@/src/components/contribute/constellation/NebulaGasFar";
import { NebulaGasMauve } from "@/src/components/contribute/constellation/NebulaGasMauve";
import { NebulaGasRose } from "@/src/components/contribute/constellation/NebulaGasRose";
import { NebulaGasTeal } from "@/src/components/contribute/constellation/NebulaGasTeal";
import { GhostStars } from "@/src/components/contribute/constellation/GhostStars";
import { ParallaxLayer, ParallaxProvider, useParallaxPointerRef } from "@/src/components/contribute/constellation/ParallaxLayer";
import { ParcoursCloseStreak } from "@/src/components/contribute/constellation/ParcoursCloseStreak";
import { ShootingStars } from "@/src/components/contribute/constellation/ShootingStars";
import { StarDust } from "@/src/components/contribute/constellation/StarDust";
import {
  StarScreenReporter,
  type ScreenAnchor,
} from "@/src/components/contribute/constellation/StarScreenReporter";
import { WheelZoom } from "@/src/components/contribute/constellation/WheelZoom";
import {
  ConstellationLeash,
  SkyWander,
  skyWanderWasDrag,
} from "@/src/components/contribute/constellation/SkyWander";
import {
  defaultSkyTheme,
  SkyThemeProvider,
  useSkyTheme,
  type SkyTheme,
} from "@/src/components/contribute/constellation/skyTheme";
import {
  ACTIVE_TEMPLATE,
  buildCraftSlotFills,
  constellationPositions,
  getResolvedStar,
  MOCK_SLOT_FILLS,
  resolveConstellation,
} from "@/src/components/contribute/constellation/graphs/resolveConstellation";
import type { ConstellationTemplate } from "@/src/components/contribute/constellation/graphs/types";
import {
  LEO_STROKE_SEQUENCE,
  undirectedEdgeKey,
  type LeoStrokeStep,
} from "@/src/components/contribute/constellation/graphs/leo";
import { resolveBirth } from "@/src/components/contribute/constellation/graphs/birth";
import {
  hubHeroBreath,
  hubProximityActive,
  hubTapHintVisible,
  HUB_HERO_BREATH_SPEED_INVITE,
  HUB_HERO_SIZE_BREATH,
  resolveHubBirth,
} from "@/src/components/contribute/constellation/graphs/hubIdle";
import { hubFreezeFxRef, tickHubThawAppear } from "@/src/lib/parcours/hubFreezeTimeline";
import { parcoursCloseStreakLockRef } from "@/src/components/tribute/hubStarAnchorRef";
import { hubSkyApproachRef } from "@/src/components/contribute/constellation/HubSkyCamera";
import {
  DEFAULT_LINE_WHISPER,
  DEFAULT_WHISPER_EMPHASIS,
  ndcFieldStrength,
  ndcSegmentField,
  PROXIMITY_FIELD_RADIUS,
  PROXIMITY_RELIGHT,
  resolveDrawPhase,
  slotWakeAppear,
} from "@/src/components/contribute/constellation/graphs/drawPhase";
import { CONSTELLATION_GROUP_OFFSET } from "@/src/components/contribute/constellation/graphs/revealCamera";
import {
  DEFAULT_CONSTELLATION_REVEAL_MS,
  DEFAULT_HERO_SHARE,
  DEFAULT_STROKE_OVERLAP,
  resolveStrokeDraw,
} from "@/src/components/contribute/constellation/graphs/reveal";
import {
  tierDpr,
  useVisualTier,
} from "@/src/components/contribute/constellation/useVisualTier";
import { ClientWebGLGate } from "@/src/components/contribute/constellation/webglGate";
import {
  isSkyLayerOn,
  type SkyCraftLayerMap,
} from "@/src/components/contribute/constellation/skyCraftLayers";

const APPROACH_MS = 680;
const CLOSE_SETTLE_MS = 980;

/** Lab craft — drive Leo reveal from outside (scrub / play-pause). */
export type ConstellationRevealCraft = {
  controlled: true;
  /** UI / scrub snapshot — may lag during play (throttled). */
  revealT: number;
  /**
   * Live progress written every RAF by the lab — read inside Canvas via useFrame.
   * Avoids setState-every-frame on the lab shell (main stutter source).
   */
  revealTRef?: MutableRefObject<number>;
  heroShare?: number;
  strokeOverlap?: number;
  /** Filament / node boost while drawing (default 0.25 × revealT) */
  emphasisDuring?: number;
  /** Filament boost when reveal complete (default whisper ~10 %) */
  emphasisIdle?: number;
  /** World scale of Leo graph (default 1) */
  graphScale?: number;
  /** Lit filament line width multiplier (default 1) */
  lineWidth?: number;
  /** Lit filament opacity multiplier (default 1) */
  lineOpacity?: number;
  /** Soft tip glow strength (default 1) */
  tipStrength?: number;
  /** Craft: ghost edge dim × (default 1) — lower = fainter ghosts */
  ghostDim?: number;
  /** Slot stars craft (bright / medium / dim / ghost) */
  slotStars?: SlotStarsCraft;
  /** Bridge families major / minor · style · colors */
  bridges?: BridgesCraft;
  /**
   * Lab only — per-slot lit map (true = allumé, false = ghost).
   * When set, overrides mock fills for craft visibility.
   */
  slotLit?: Record<string, boolean>;
  /** Current tip look: trail segment · diffraction star · soft orb+halo */
  tipStyle?: "trail" | "star" | "orb";
  tipColor?: string;
  tipSize?: number;
  /** Trail mode only — segment length along active edge (0–1). Default 0.14 */
  tipTrailLen?: number;
  /**
   * Live HeroStar from craft lab — replaces LueurNode hero when set.
   * Same knobs as onglet 1 so constellation mirrors the atom.
   */
  heroAtom?: {
    white: HeroLayerKnobs;
    teal: HeroLayerKnobs;
    spikes: HeroLayerKnobs;
    /** Extra size mul for mid-sky (lab is close-up). Default 0.4 */
    embedScale?: number;
    /** Master size from craft Hero tab (default 1) */
    globalScale?: number;
  };
  /** Intensité séparation Hero↔nom au survol (knob lab parallax). */
  heroParallax?: number;
  /** Prénom wizard — remplace le mock « Margaret ». */
  heroName?: string;
  /** Wizard step 1 — masquer le nom tant que le prénom est vide. */
  hideHeroName?: boolean;
  /** Chemin 1 hub — invite accrochée à l’étoile (birth hub, pas prénom). */
  hubPrompt?: boolean;
  /** Chemin 1 hub — sous-texte tap (Html sous l’invite). */
  hubTapHint?: string;
  /**
   * Wizard — `false` gèle le WebGL (stop ForceRenderLoop, dpr 1).
   * Défaut `true` (labs / immersive).
   */
  skyActive?: boolean;
  /**
   * Wizard — date valide + panneau saisie : graphe settled (whisper) sans play A→F.
   * Désactivé pendant reward (Continuer anime 0→1).
   */
  silhouetteIdle?: boolean;
  /**
   * Wizard — invalide une frame même si `skyActive=false` (date→silhouette, prénom).
   */
  skyWakeKey?: string | number;
  /** Silhouette zodiaque (wizard) — défaut Leo craft. */
  template?: ConstellationTemplate;
  /** Séquence de traits reveal — défaut Leo. */
  strokeSequence?: readonly LeoStrokeStep[];
};

type FocusSession = {
  soulId: string;
  pos: [number, number, number];
  /** approach → caméra ; open → portail ; closing → retour */
  phase: "approach" | "open" | "closing";
};

/** Garantit des frames même sans interaction souris (WebGL demand). */
function ForceRenderLoop({
  enabled = true,
  wakeKey,
}: {
  enabled?: boolean;
  /** Change → une paint (même ciel gelé) pour silhouette / prénom. */
  wakeKey?: string | number;
}) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
    if (!enabled) return;
    let raf = 0;
    let running = true;
    const tick = () => {
      if (!running) return;
      invalidate();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [invalidate, enabled, wakeKey]);
  return null;
}

/** T-close-6c — fond canvas transparent : Hero + filante au-dessus du verre. */
function CloseRitualClearAlpha({
  active,
  voidHex,
}: {
  active: boolean;
  voidHex: string;
}) {
  const { gl } = useThree();
  const voidColor = useMemo(() => new Color(voidHex), [voidHex]);
  useEffect(() => {
    if (active) {
      gl.setClearColor(0x000000, 0);
    } else {
      gl.setClearColor(voidColor, 1);
    }
  }, [active, gl, voidColor]);
  return null;
}

function Constellation({
  onSelectMemory,
  focusedSoulId,
  focusBoost,
  onStarScreen,
  revealT: revealTProp,
  revealTRef,
  silhouetteIdle = false,
  emphasisDuring = 0.25,
  emphasisIdle = DEFAULT_WHISPER_EMPHASIS,
  heroShare,
  strokeOverlap,
  graphScale = 1,
  lineWidthMul = 1,
  lineOpacityMul = 1,
  tipStrength = 1,
  ghostDim = 1,
  tipStyle = "orb",
  tipColor = "#ccfbf1",
  tipSize = 1,
  tipTrailLen = 0.14,
  heroAtom,
  heroParallax = DEFAULT_HERO_PARALLAX,
  heroName,
  hideHeroName = false,
  hubPrompt = false,
  hubTapHint,
  reportHeroScreen = false,
  hubBirthMode = false,
  slotStars = DEFAULT_SLOT_STARS,
  bridges = DEFAULT_BRIDGES,
  slotLit,
  template = ACTIVE_TEMPLATE,
  strokeSequence = LEO_STROKE_SEQUENCE,
}: {
  onSelectMemory: (
    soulId: string,
    position: [number, number, number],
  ) => void;
  focusedSoulId: string | null;
  focusBoost: number;
  onStarScreen: (anchor: ScreenAnchor | null) => void;
  revealT: number;
  /** When set, progress follows this ref every frame (smooth craft play). */
  revealTRef?: MutableRefObject<number>;
  /** Date valide — graphe settled whisper sans play A→F. */
  silhouetteIdle?: boolean;
  emphasisDuring?: number;
  emphasisIdle?: number;
  heroShare?: number;
  strokeOverlap?: number;
  graphScale?: number;
  lineWidthMul?: number;
  lineOpacityMul?: number;
  tipStrength?: number;
  ghostDim?: number;
  tipStyle?: "trail" | "star" | "orb";
  tipColor?: string;
  tipSize?: number;
  tipTrailLen?: number;
  heroAtom?: ConstellationRevealCraft["heroAtom"];
  heroParallax?: number;
  heroName?: string;
  hideHeroName?: boolean;
  hubPrompt?: boolean;
  hubTapHint?: string;
  reportHeroScreen?: boolean;
  hubBirthMode?: boolean;
  slotStars?: SlotStarsCraft;
  bridges?: BridgesCraft;
  slotLit?: Record<string, boolean>;
  template?: ConstellationTemplate;
  strokeSequence?: readonly LeoStrokeStep[];
}) {
  type ProximityField = {
    stars: Record<string, number>;
    edges: Record<string, number>;
    max: number;
  };
  const EMPTY_PROX: ProximityField = { stars: {}, edges: {}, max: 0 };

  const pointerRef = useParallaxPointerRef();
  const proxTmp = useRef(new Vector3());
  const ndcA = useRef(new Vector3());
  const ndcB = useRef(new Vector3());
  const [revealT, setRevealT] = useState(revealTProp);
  const [hubApproach, setHubApproach] = useState(0);
  /** T-invite-2 — glow CTA live (prox souris + breath Hero), pas hubApproach figé. */
  const [hubCtaGlow, setHubCtaGlow] = useState(0);
  const [proximity, setProximity] = useState<ProximityField>(EMPTY_PROX);

  const stars = useMemo(() => {
    const name = heroName?.trim() || "Margaret";
    if (slotLit) {
      return resolveConstellation(
        template,
        buildCraftSlotFills(slotLit),
        name,
      );
    }
    return resolveConstellation(template, MOCK_SLOT_FILLS, name);
  }, [slotLit, heroName, template]);
  const positions = useMemo(() => constellationPositions(stars), [stars]);

  useFrame(({ camera, clock }) => {
    let heroProxFrame = 0;
    if (hubBirthMode) {
      if (!parcoursCloseStreakLockRef.current) {
        const v = hubSkyApproachRef.current;
        setHubApproach((prev) => (Math.abs(prev - v) > 0.006 ? v : prev));
      }
      tickHubThawAppear();
      // Flash soft decay (rite freeze aller)
      if (hubFreezeFxRef.flash > 0.01) {
        hubFreezeFxRef.flash = Math.max(0, hubFreezeFxRef.flash - 0.028);
      }
      if (hubFreezeFxRef.closeAbsorb > 0.01) {
        hubFreezeFxRef.closeAbsorb = Math.max(
          0,
          hubFreezeFxRef.closeAbsorb - 0.032,
        );
      }
    }
    if (revealTRef) {
      const v = revealTRef.current;
      setRevealT((prev) => (Math.abs(prev - v) > 0.0008 ? v : prev));
    }

    const drawPhaseLive = resolveDrawPhase(revealTRef?.current ?? revealT);
    const allowProximity =
      (hubBirthMode && hubProximityActive(hubSkyApproachRef.current)) ||
      drawPhaseLive.proximity;
    if (!allowProximity || !pointerRef) {
      setProximity((p) => (p.max > 0 ? EMPTY_PROX : p));
    } else {
      const ptr = pointerRef.current;
      const gx = CONSTELLATION_GROUP_OFFSET[0];
      const gy = CONSTELLATION_GROUP_OFFSET[1];
      const starsMap: Record<string, number> = {};
      let maxProx = 0;

      const projectLocal = (pos: [number, number, number]) => {
        proxTmp.current.set(
          gx + pos[0] * graphScale,
          gy + pos[1] * graphScale,
          pos[2] * graphScale,
        );
        proxTmp.current.project(camera);
        return proxTmp.current;
      };

      for (const star of stars) {
        const pos = positions[star.id] ?? star.position;
        const ndc = projectLocal(pos);
        const prox = ndcFieldStrength(
          ndc.x - ptr.x,
          ndc.y - ptr.y,
          PROXIMITY_FIELD_RADIUS,
        );
        starsMap[star.id] = prox;
        maxProx = Math.max(maxProx, prox);
      }
      heroProxFrame = starsMap.hero ?? 0;

      const edgesMap: Record<string, number> = {};
      for (const [a, b] of template.edges) {
        const from = positions[a];
        const to = positions[b];
        if (!from || !to) continue;
        ndcA.current.copy(projectLocal(from));
        ndcB.current.copy(projectLocal(to));
        const prox = ndcSegmentField(
          ndcA.current.x,
          ndcA.current.y,
          ndcB.current.x,
          ndcB.current.y,
          ptr.x,
          ptr.y,
          PROXIMITY_FIELD_RADIUS * 1.08,
        );
        const key = undirectedEdgeKey(a, b);
        edgesMap[key] = Math.max(edgesMap[key] ?? 0, prox);
        maxProx = Math.max(maxProx, prox);
      }

      setProximity((prev) =>
        Math.abs(prev.max - maxProx) > 0.012 ||
        Object.keys(starsMap).some(
          (id) => Math.abs((prev.stars[id] ?? 0) - (starsMap[id] ?? 0)) > 0.04,
        )
          ? { stars: starsMap, edges: edgesMap, max: maxProx }
          : prev,
      );
    }

    /** CTA « Toucher l’étoile » : glow cyan = prox + souffle Hero (lisible). */
    if (hubBirthMode && hubTapHintVisible(hubSkyApproachRef.current)) {
      const envelope =
        hubHeroBreath(hubSkyApproachRef.current) *
        hubFreezeFxRef.thawAppearU;
      const t = clock.elapsedTime * HUB_HERO_BREATH_SPEED_INVITE;
      const breathWave =
        0.5 +
        0.5 *
          (0.68 * Math.sin(t) + 0.32 * Math.sin(t * 0.41 + 0.4));
      const live = Math.min(
        1,
        0.22 * envelope +
          0.62 * heroProxFrame +
          0.48 * breathWave * envelope * (0.35 + 0.65 * heroProxFrame),
      );
      setHubCtaGlow((prev) =>
        Math.abs(prev - live) > 0.028 ? live : prev,
      );
    } else {
      setHubCtaGlow((prev) => (prev > 0 ? 0 : prev));
    }
  });
  useEffect(() => {
    if (revealTRef) return;
    setRevealT(revealTProp);
  }, [revealTProp, revealTRef]);

  /** Silhouette idle = settled whisper ; sinon timeline revealT. */
  const settled = silhouetteIdle || revealT >= 1;

  const drawPhase = useMemo(
    () => resolveDrawPhase(settled ? 1 : revealT),
    [revealT, settled],
  );

  const emphasis = useMemo(() => {
    const proxLift = proximity.max * DEFAULT_WHISPER_EMPHASIS * 2.2;
    if (settled) return emphasisIdle + proxLift;
    if (drawPhase.beat) return drawPhase.emphasis + proxLift;
    return revealT * emphasisDuring;
  }, [
    settled,
    revealT,
    emphasisDuring,
    emphasisIdle,
    drawPhase,
    proximity.max,
  ]);

  const birth = useMemo(
    () =>
      hubBirthMode
        ? resolveHubBirth(hubApproach)
        : resolveBirth(revealT),
    [hubBirthMode, hubApproach, revealT],
  );

  const heroSepActive =
    heroAtom != null &&
    (birth.nameBirth > 0.02 ||
      birth.heroSize > 0.02 ||
      (hubBirthMode && birth.heroBirth > 0.02));
  const heroSep = useHeroNameSeparation(
    heroSepActive,
    heroParallax,
    positions.hero,
    graphScale,
  );

  const ghostIds = useMemo(
    () => new Set(stars.filter((s) => !s.lit).map((s) => s.id)),
    [stars],
  );
  const draw = useMemo(() => {
    void heroShare;
    const drawU = settled ? 1 : birth.drawU;
    const d = resolveStrokeDraw(drawU, strokeSequence, {
      heroShare: 0,
      strokeOverlap,
    });
    d.nodeAppear.hero = Math.max(d.nodeAppear.hero ?? 0, birth.heroBirth);
    return d;
  }, [birth, strokeOverlap, heroShare, strokeSequence, settled]);
  const [hovered, setHovered] = useState<string | null>(null);

  const locked = focusedSoulId !== null;

  const onTap = (id: string, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (locked) return;
    if (skyWanderWasDrag()) return;
    if (revealT < 0.97) return;
    const star = getResolvedStar(stars, id);
    if (star?.memory) {
      onSelectMemory(id, positions[id] ?? star.position);
    }
  };

  return (
    <group position={[-0.45, -0.7 + heroSep.heroLift, 0]} scale={graphScale}>
      {stars.map((star, i) => {
        const pos = positions[star.id] ?? star.position;
        const appearRaw = draw.nodeAppear[star.id] ?? 0;
        const appear = slotWakeAppear(appearRaw, drawPhase.beat);
        const isHero = star.role === "hero";

        // Hero slot: show for name alone, or when star is born
        const heroAnchor =
          isHero && (birth.nameBirth > 0.02 || birth.heroBirth > 0.02);
        if (!isHero && appear < 0.03) return null;
        if (isHero && !heroAnchor) return null;

        const hitRadius =
          star.visual === "hero"
            ? 0.95
            : star.visual === "premium"
              ? 0.45
              : star.visual === "ghost"
                ? 0.28
                : 0.36;
        const isFocus = focusedSoulId === star.id;
        const effectiveGhostDim = slotStars.ghostDim ?? ghostDim;
        const ghostFade =
          star.visual === "ghost"
            ? Math.max(0.15, effectiveGhostDim)
            : 1;

        const useCraftHero =
          star.visual === "hero" && heroAtom != null;
        const embed = heroAtom?.embedScale ?? 0.4;
        const gScale = heroAtom?.globalScale ?? 1;
        const breathDrive = hubBirthMode
          ? hubFreezeFxRef.holdBreath
            ? 0
            : hubHeroBreath(hubApproach) * hubFreezeFxRef.thawAppearU
          : drawPhase.constellationBreath;
        const starProx = proximity.stars[star.id] ?? 0;
        const proxRelight = 1 + starProx * PROXIMITY_RELIGHT;
        const slotBreathMul =
          slotStars.breath * (0.08 + 0.92 * breathDrive) * (1 + starProx * 0.9);
        const starFloating =
          !isFocus &&
          (star.lit || appear > 0.85) &&
          (breathDrive > 0.1 || starProx > 0.08);

        const appearMul =
          appear * (1 + emphasis * 0.06) * ghostFade * proxRelight;

        // C0–C2: rises from mid-name → KEEP seat; layers → KEEP
        const heroEase = birth.heroSize;
        const showHeroStar =
          birth.heroGrain > 0.02 ||
          birth.heroVeil > 0.02 ||
          birth.heroCore > 0.02 ||
          birth.heroSize > 0.02;
        const heroGroupScale = useCraftHero
          ? birth.heroKeep
            ? Math.max(0.05, embed)
            : Math.max(0.02, embed * (0.14 + 0.86 * heroEase))
          : 1;
        // Mid-name (letter heart) → idle Hero — was −0.4 (too low under the word)
        const heroFromNameY = useCraftHero
          ? -0.24 * (1 - birth.heroFromName)
          : 0;
        const birthDrive =
          useCraftHero && !birth.heroKeep
            ? {
                core: birth.heroCore,
                teal: birth.heroTeal,
                spikes: birth.heroSpikes,
                veil: birth.heroVeil,
                veilScale: birth.heroVeilScale,
                grain: birth.heroGrain,
                grainScale: birth.heroGrainScale,
              }
            : undefined;

        const slotSizeMul =
          star.visual === "ghost"
            ? slotStars.ghostSize
            : star.weight === "bright"
              ? slotStars.sizeBright
              : star.weight === "medium"
                ? slotStars.sizeMedium
                : slotStars.sizeDim;

        const nameBloom = isHero ? birth.nameBirth : 0;
        const nameGlow = isHero ? birth.nameGlow : 0;
        const nameLift = isHero ? birth.nameLift : 1;
        const nameClarity = isHero ? birth.nameClarity : 1;
        const nameScaleCh = isHero ? birth.nameScale : 1;
        const nameTrack = isHero ? birth.nameTrack : 1;
        const showHeroName = isHero && nameBloom > 0.02 && !hideHeroName;
        const showSlotName =
          !isHero && !!star.name && hovered === star.id;
        const nameOpacity = isHero
          ? Math.min(
              1,
              nameBloom *
                (0.4 + 0.6 * nameClarity) *
                (0.78 + 0.22 * nameGlow) *
                (hovered === star.id ? 1 : 0.92) *
                (hubPrompt ? hubFreezeFxRef.inviteMul : 1),
            )
          : 0.6;
        const nameBlurPx = isHero
          ? Math.max(0, (1 - nameClarity) * 16)
          : 0;
        const nameScale =
          (isHero ? 0.78 + 0.22 * nameScaleCh : 1) *
          (isHero ? heroSep.nameScale : 1);
        const nameY = isHero
          ? 42 - 14 * nameLift + birth.nameDriftY * 4 + heroSep.nameDrop
          : 18;
        const hubInviteScale =
          hubPrompt && isHero ? nameScale * 0.63 : nameScale;
        const hubInviteY = isHero
          ? 26 - 8 * nameLift + birth.nameDriftY * 2.5 + heroSep.nameDrop
          : nameY;
        const nameYResolved = hubPrompt && isHero ? hubInviteY : nameY;
        /** Hub : +px = texte vers la droite (sous le cœur). Sens inverse du coup trop fort à gauche. */
        const nameX = isHero
          ? birth.nameDriftX * 5 + (hubPrompt ? 4 : 0)
          : 0;
        const nameTracking = isHero
          ? hubPrompt
            ? 0.14
            : 0.36 - 0.14 * nameTrack + 0.025 * nameGlow
          : 0.2;
        const glowPx = hubPrompt && isHero
          ? 10 + 18 * nameGlow + 4 * nameClarity
          : 14 + 30 * nameGlow + 8 * nameClarity;
        const glowA = hubPrompt && isHero
          ? 0.06 + 0.22 * nameGlow
          : 0.12 + 0.4 * nameGlow;
        /** T-invite-2 — glow CTA = cyan Hero × prox souris + breath live. */
        const tapGlowU = hubPrompt && isHero ? hubCtaGlow : 0;
        const tapGlowPx = 10 + 36 * tapGlowU;
        const tapGlowA = 0.2 + 0.75 * tapGlowU;

        return (
          <group key={star.id} position={pos}>
            {useCraftHero && heroAtom && showHeroStar ? (
              <group
                position={[0, heroFromNameY, 0]}
                scale={heroGroupScale * heroSep.heroScale}
              >
                <HeroStar
                  white={heroAtom.white}
                  teal={heroAtom.teal}
                  spikes={heroAtom.spikes}
                  globalScale={gScale}
                  birthFlash={
                    hubBirthMode
                      ? Math.max(
                          birth.heroFlash,
                          hubFreezeFxRef.flash,
                          hubFreezeFxRef.closeAbsorb * 0.95,
                        )
                      : birth.heroFlash
                  }
                  birth={birthDrive}
                  breathDrive={
                    hubBirthMode
                      ? Math.min(1, breathDrive + starProx * 0.55)
                      : birth.heroKeep
                        ? Math.min(1, breathDrive + starProx * 0.72)
                        : Math.max(breathDrive, birth.heroSize * 0.25)
                  }
                  sizeBreath={
                    hubBirthMode && !hubFreezeFxRef.holdBreath
                      ? HUB_HERO_SIZE_BREATH * breathDrive +
                        hubFreezeFxRef.closeAbsorb * 0.42
                      : hubFreezeFxRef.closeAbsorb > 0.02
                        ? hubFreezeFxRef.closeAbsorb * 0.28
                        : 0
                  }
                  parallax={0}
                  phase={i * 1.7}
                />
                {isHero && (isFocus || reportHeroScreen) ? (
                  <StarScreenReporter active onScreen={onStarScreen} />
                ) : null}
              </group>
            ) : !useCraftHero ? (
              <LueurNode
                variant={star.visual}
                phase={i * 1.7}
                floating={starFloating}
                focusBoost={isFocus ? focusBoost : 0}
                appear={
                  isHero ? Math.max(appearMul, heroEase) : appearMul
                }
                craftSizeMul={
                  star.visual === "hero"
                    ? 1
                    : slotSizeMul * (1 + starProx * 0.35)
                }
                craftGlowMul={
                  star.visual === "hero" ? 1 : slotStars.glow * proxRelight
                }
                craftBreathMul={
                  star.visual === "hero" ? 1 : slotBreathMul
                }
              />
            ) : null}
            {isHero &&
            (isFocus || reportHeroScreen) &&
            !(useCraftHero && heroAtom && showHeroStar) ? (
              <StarScreenReporter active onScreen={onStarScreen} />
            ) : null}
            {star.role === "hero" || (star.lit && star.memory) ? (
              <LueurHitTarget
                radius={hitRadius}
                onPointerUp={(e) => {
                  if (star.memory) onTap(star.id, e);
                  else e.stopPropagation();
                }}
                onPointerOver={(e) => {
                  if (locked) return;
                  e.stopPropagation();
                  setHovered(star.id);
                  document.body.style.cursor = star.memory
                    ? "pointer"
                    : "default";
                }}
                onPointerOut={() => {
                  setHovered(null);
                  document.body.style.cursor = "auto";
                }}
              />
            ) : null}
            {showHeroName || showSlotName ? (
              <Html
                distanceFactor={
                  isHero ? (hubPrompt ? 18 : 6.4) : 6
                }
                style={{
                  pointerEvents: "none",
                  transform: `translate(calc(-50% + ${nameX.toFixed(2)}px), ${nameYResolved.toFixed(1)}px) scale(${(hubPrompt && isHero ? hubInviteScale : nameScale).toFixed(3)})`,
                  transformOrigin: "50% 0%",
                  whiteSpace: "nowrap",
                  textAlign: hubPrompt && isHero ? "center" : undefined,
                  width: hubPrompt && isHero ? "max-content" : undefined,
                  fontSize: hubPrompt && isHero ? "9.5px" : isHero ? "19px" : "11px",
                  lineHeight: hubPrompt && isHero ? 1.35 : undefined,
                  fontFamily:
                    hubPrompt && isHero
                      ? "var(--font-editorial), ui-serif, Georgia, serif"
                      : undefined,
                  letterSpacing: hubPrompt && isHero
                    ? "0.14em"
                    : `${nameTracking.toFixed(3)}em`,
                  fontWeight: 300,
                  opacity: nameOpacity,
                  filter:
                    nameBlurPx > 0.35
                      ? `blur(${nameBlurPx.toFixed(1)}px)`
                      : undefined,
                  color: isHero
                    ? hubPrompt
                      ? "rgba(244, 244, 245, 0.88)"
                      : `rgba(255, 252, 248, ${0.72 + 0.22 * nameClarity})`
                    : "rgba(204, 251, 241, 0.6)",
                  textShadow: isHero
                    ? hubPrompt
                      ? `0 0 ${glowPx.toFixed(0)}px rgba(94, 234, 212, ${glowA.toFixed(2)})`
                      : `0 0 ${glowPx.toFixed(0)}px rgba(94, 234, 212, ${glowA.toFixed(2)}), 0 0 ${(glowPx * 0.45).toFixed(0)}px rgba(255, 248, 240, ${
                          0.08 + 0.2 * nameGlow
                        })`
                    : "none",
                  transition: "none",
                }}
                wrapperClass="!pointer-events-none"
                center
              >
                {hubPrompt && isHero ? (
                  <span
                    style={{
                      display: "inline-block",
                      whiteSpace: "nowrap",
                      transform: "scaleX(1.06)",
                      transformOrigin: "50% 0%",
                    }}
                  >
                    {star.name}
                    {hubTapHint && hubTapHintVisible(hubApproach) ? (
                      <span
                        style={{
                          display: "block",
                          marginTop: "0.55rem",
                          whiteSpace: "nowrap",
                          transform: "scaleX(1.02)",
                          fontFamily:
                            'var(--font-label), "Inter", ui-sans-serif, system-ui, sans-serif',
                          fontSize: "6px",
                          letterSpacing: "0.1em",
                          fontWeight: 300,
                          color: `rgba(${Math.round(161 + (94 - 161) * tapGlowU)}, ${Math.round(161 + (234 - 161) * tapGlowU)}, ${Math.round(170 + (212 - 170) * tapGlowU)}, ${0.78 + 0.22 * tapGlowU})`,
                          textShadow:
                            tapGlowU > 0.05
                              ? `0 0 ${tapGlowPx.toFixed(1)}px rgba(94, 234, 212, ${tapGlowA.toFixed(2)}), 0 0 ${(tapGlowPx * 1.6).toFixed(1)}px rgba(94, 234, 212, ${(0.12 + 0.35 * tapGlowU).toFixed(2)}), 0 0 ${(tapGlowPx * 0.35).toFixed(1)}px rgba(255, 248, 240, ${(0.08 + 0.22 * tapGlowU).toFixed(2)})`
                              : "none",
                          opacity: Math.min(
                            1,
                            (hubApproach - 0.72) / 0.28,
                          ),
                        }}
                      >
                        {hubTapHint}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  star.name
                )}
              </Html>
            ) : null}
          </group>
        );
      })}
      <LightBridges
        positions={positions}
        edges={template.edges}
        ghostIds={ghostIds}
        draw={draw}
        emphasis={emphasis}
        lineDimMul={settled ? DEFAULT_LINE_WHISPER : drawPhase.lineDim}
        edgeProximity={proximity.edges}
        revealComplete={settled}
        lineWidthMul={lineWidthMul}
        lineOpacityMul={lineOpacityMul}
        tipStrength={tipStrength}
        ghostDim={slotStars.ghostDim ?? ghostDim}
        tipStyle={tipStyle}
        tipColor={tipColor}
        tipSize={tipSize}
        tipTrailLen={tipTrailLen}
        bridges={bridges}
      />
    </group>
  );
}


function UniverseScene({
  tier,
  parallaxIntensity,
  showConstellation,
  wanderEnabled,
  onSelectMemory,
  focus,
  onStarScreen,
  craftLite = false,
  craftReveal,
  skyLayers,
  hubSkyCamera = false,
  closeStreakFire = false,
  overlayOnBackdrop = false,
}: {
  tier: ReturnType<typeof useVisualTier>;
  parallaxIntensity: number;
  showConstellation: boolean;
  wanderEnabled: boolean;
  onSelectMemory: (
    soulId: string,
    position: [number, number, number],
  ) => void;
  focus: FocusSession | null;
  onStarScreen: (anchor: ScreenAnchor | null) => void;
  craftLite?: boolean;
  craftReveal?: ConstellationRevealCraft;
  skyLayers?: SkyCraftLayerMap;
  /** Chemin 1 hub — plan test-ciel puis dolly Hero (pas RevealCamera KEEP). */
  hubSkyCamera?: boolean;
  /** T-close-3c — filante verre → étoile @ hold. */
  closeStreakFire?: boolean;
  /** T2-freeze — clear alpha au-dessus du gel 2D. */
  overlayOnBackdrop?: boolean;
}) {
  const theme = useSkyTheme();
  // Pendant closing, on garde le tracking pour suivre l’étoile au retour
  const focusing = focus !== null && focus.phase !== "closing";
  const focusBoost =
    focus?.phase === "approach"
      ? 0.85
      : focus?.phase === "open"
        ? 1
        : focus?.phase === "closing"
          ? 0.95
          : 0;

  const autoRevealRef = useRef(0);
  const controlled = craftReveal?.controlled === true;
  const heroShare = craftReveal?.heroShare ?? DEFAULT_HERO_SHARE;
  const strokeOverlap = craftReveal?.strokeOverlap ?? DEFAULT_STROKE_OVERLAP;
  const emphasisDuring = craftReveal?.emphasisDuring ?? 0.25;
  const emphasisIdle = craftReveal?.emphasisIdle ?? DEFAULT_WHISPER_EMPHASIS;
  const graphScale = craftReveal?.graphScale ?? 1;
  const lineWidthMul = craftReveal?.lineWidth ?? 1;
  const lineOpacityMul = craftReveal?.lineOpacity ?? 1;
  const tipStrength = craftReveal?.tipStrength ?? 1;
  const ghostDim = craftReveal?.ghostDim ?? 1;
  const tipStyle = craftReveal?.tipStyle ?? "orb";
  const tipColor = craftReveal?.tipColor ?? "#ccfbf1";
  const tipSize = craftReveal?.tipSize ?? 1;
  const tipTrailLen = craftReveal?.tipTrailLen ?? 0.14;
  const heroAtom = craftReveal?.heroAtom;
  const heroParallax = craftReveal?.heroParallax ?? DEFAULT_HERO_PARALLAX;
  const heroName = craftReveal?.heroName;
  const hideHeroName = craftReveal?.hideHeroName ?? false;
  const hubPrompt = craftReveal?.hubPrompt === true;
  const hubTapHint = craftReveal?.hubTapHint;
  const slotStars = craftReveal?.slotStars ?? DEFAULT_SLOT_STARS;
  const bridges = craftReveal?.bridges ?? DEFAULT_BRIDGES;
  const slotLit = craftReveal?.slotLit;
  const skyActive = craftReveal?.skyActive ?? true;
  const silhouetteIdle = craftReveal?.silhouetteIdle === true;
  const skyWakeKey = craftReveal?.skyWakeKey;
  const constellationTemplate = craftReveal?.template ?? ACTIVE_TEMPLATE;
  const strokeSequence =
    craftReveal?.strokeSequence ?? LEO_STROKE_SEQUENCE;

  const fondOn = isSkyLayerOn(skyLayers, "fond");
  const fogOn = isSkyLayerOn(skyLayers, "fog");
  /** Clear / background — layer Fond uniquement (indépendant du fog). */
  const voidHex = fondOn
    ? theme.fond.color || "#000000"
    : theme.scene.background || "#000000";

  const { gl } = useThree();
  useEffect(() => {
    if (closeStreakFire || overlayOnBackdrop) {
      gl.setClearColor(0x000000, 0);
      return;
    }
    gl.setClearColor(new Color(voidHex), 1);
  }, [gl, voidHex, closeStreakFire, overlayOnBackdrop]);

  useEffect(() => {
    if (controlled) return;
    if (!showConstellation) {
      autoRevealRef.current = 0;
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const raw = Math.min(
        1,
        (now - start) / DEFAULT_CONSTELLATION_REVEAL_MS,
      );
      autoRevealRef.current = raw;
      if (raw < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showConstellation, controlled]);

  const revealTProp = controlled ? (craftReveal?.revealT ?? 0) : 0;
  const revealTRef = controlled
    ? craftReveal?.revealTRef
    : autoRevealRef;

  return (
    <ParallaxProvider intensity={parallaxIntensity}>
      <CloseRitualClearAlpha
        active={closeStreakFire || overlayOnBackdrop}
        voidHex={voidHex}
      />
      <ForceRenderLoop enabled={skyActive} wakeKey={skyWakeKey} />
      {/* Craft : zoom fixe (pas de molette qui recentre) */}
      <WheelZoom enabled={!craftLite} />
      <SkyWander enabled={wanderEnabled} />
      <IdleCameraDrift />
      <color attach="background" args={[voidHex]} />
      {fogOn ? (
        <fog
          attach="fog"
          args={[
            theme.scene.fogColor || "#000000",
            theme.scene.fogNear,
            craftLite ? theme.scene.fogFar * 3.2 : theme.scene.fogFar,
          ]}
        />
      ) : null}
      <ambientLight intensity={theme.scene.ambientIntensity} />
      <FocusCamera
        target={focus ? focus.pos : null}
        active={focusing}
      />
      <HubSkyCamera
        enabled={hubSkyCamera && showConstellation && !focusing}
        graphScale={graphScale}
      />
      <RevealCamera
        enabled={showConstellation && !focusing && !hubSkyCamera}
        revealT={revealTProp}
        revealTRef={revealTRef}
        graphScale={graphScale}
      />
      <CameraRig>
        {/* Craft : remonte le ciel pour que la bande d etoiles soit en haut d ecran */}
        <group position={craftLite ? [0, 5.5, 0] : [0, 0, 0]}>
        {/* Panorama hors milkyRotate — orientation propre (Tilt / Flip). */}
        {tier === "desktop" &&
        !closeStreakFire &&
        isSkyLayerOn(skyLayers, "panorama") ? (
          <ParallaxLayer
            factor={theme.skyPanorama.parallax.factor}
            lerp={theme.skyPanorama.parallax.lerp}
          >
            <SkyPanorama tier={tier} />
          </ParallaxLayer>
        ) : null}
        {/* Groupe milky procédural (pas panorama) — knobs lab cible « milky » */}
        <group
          position={theme.scene.milkyPosition ?? [0, 0, 0]}
          rotation={[0, 0, theme.scene.milkyRotate ?? 0]}
        >
        {!closeStreakFire && isSkyLayerOn(skyLayers, "cosmicDust") ? (
        <ParallaxLayer
          factor={theme.cosmicDust.parallax.factor}
          lerp={theme.cosmicDust.parallax.lerp}
        >
          <CosmicDust tier={tier} />
        </ParallaxLayer>
        ) : null}
        {tier !== "reduced" && !closeStreakFire && isSkyLayerOn(skyLayers, "zodiacal") ? (
          <ParallaxLayer
            factor={theme.zodiacal.parallax.factor}
            lerp={theme.zodiacal.parallax.lerp}
          >
            <ZodiacalLight tier={tier} />
          </ParallaxLayer>
        ) : null}
        {tier !== "reduced" && !closeStreakFire && isSkyLayerOn(skyLayers, "dustLanes") ? (
          <ParallaxLayer
            factor={theme.milkyDustLanes.parallax.factor}
            lerp={theme.milkyDustLanes.parallax.lerp}
          >
            <MilkyDustLanes tier={tier} />
          </ParallaxLayer>
        ) : null}
        {!closeStreakFire && isSkyLayerOn(skyLayers, "starsBand") ? (
          <StarDust
            tier={tier}
            showBand
            showField={false}
          />
        ) : null}
        </group>

        {tier !== "reduced" && !closeStreakFire && isSkyLayerOn(skyLayers, "gasFar") ? (
          <ParallaxLayer
            factor={theme.gasFar.parallax.factor}
            lerp={theme.gasFar.parallax.lerp}
          >
            <NebulaGasFar tier={tier} />
          </ParallaxLayer>
        ) : null}
        {tier === "desktop" &&
        !closeStreakFire &&
        isSkyLayerOn(skyLayers, "ghostStars") ? (
          <ParallaxLayer
            factor={theme.ghostStars.parallax.factor}
            lerp={theme.ghostStars.parallax.lerp}
          >
            <GhostStars tier={tier} />
          </ParallaxLayer>
        ) : null}
        {!closeStreakFire && isSkyLayerOn(skyLayers, "gasRose") ? (
        <ParallaxLayer
          factor={theme.gasRose.parallax.factor}
          lerp={theme.gasRose.parallax.lerp}
        >
          <NebulaGasRose tier={tier} />
        </ParallaxLayer>
        ) : null}
        {!closeStreakFire && isSkyLayerOn(skyLayers, "gasMauve") ? (
        <ParallaxLayer
          factor={theme.gasMauve.parallax.factor}
          lerp={theme.gasMauve.parallax.lerp}
        >
          <NebulaGasMauve tier={tier} />
        </ParallaxLayer>
        ) : null}
        {!closeStreakFire && isSkyLayerOn(skyLayers, "gasTeal") ? (
        <ParallaxLayer
          factor={theme.gasTeal.parallax.factor}
          lerp={theme.gasTeal.parallax.lerp}
        >
          <NebulaGasTeal tier={tier} />
        </ParallaxLayer>
        ) : null}
        {tier !== "reduced" &&
        !craftLite &&
        !closeStreakFire &&
        isSkyLayerOn(skyLayers, "aurora") ? (
          <ParallaxLayer
            factor={theme.aurora.parallax.factor}
            lerp={theme.aurora.parallax.lerp}
          >
            <AuroraVeil tier={tier} />
          </ParallaxLayer>
        ) : null}
        {!closeStreakFire && isSkyLayerOn(skyLayers, "starsField") ? (
          <StarDust
            tier={tier}
            showBand={false}
            showField
          />
        ) : null}
        {!craftLite && !closeStreakFire && isSkyLayerOn(skyLayers, "shootingStars") ? (
          <ParallaxLayer
            factor={theme.shootingStars.parallax.factor}
            lerp={theme.shootingStars.parallax.lerp}
          >
            <ShootingStars tier={tier} />
          </ParallaxLayer>
        ) : null}
        {hubSkyCamera && closeStreakFire ? (
          <ParcoursCloseStreak fire={closeStreakFire} />
        ) : null}
        {showConstellation && isSkyLayerOn(skyLayers, "constellation") ? (
          <ParallaxLayer
            factor={theme.constellation.parallax.factor}
            lerp={theme.constellation.parallax.lerp}
          >
            <ConstellationLeash>
              <Constellation
                key={constellationTemplate.id}
                onSelectMemory={onSelectMemory}
                focusedSoulId={focus?.soulId ?? null}
                focusBoost={focusBoost}
                onStarScreen={onStarScreen}
                revealT={revealTProp}
                revealTRef={revealTRef}
                silhouetteIdle={silhouetteIdle}
                emphasisDuring={emphasisDuring}
                emphasisIdle={emphasisIdle}
                heroShare={heroShare}
                strokeOverlap={strokeOverlap}
                graphScale={graphScale}
                lineWidthMul={lineWidthMul}
                lineOpacityMul={lineOpacityMul}
                tipStrength={tipStrength}
                ghostDim={ghostDim}
                tipStyle={tipStyle}
                tipColor={tipColor}
                tipSize={tipSize}
                tipTrailLen={tipTrailLen}
                heroAtom={heroAtom}
                heroParallax={heroParallax}
                heroName={heroName}
                hideHeroName={hideHeroName}
                hubPrompt={hubPrompt}
                hubTapHint={hubTapHint}
                reportHeroScreen={hubSkyCamera && showConstellation}
                hubBirthMode={hubSkyCamera}
                slotStars={slotStars}
                bridges={bridges}
                slotLit={slotLit}
                template={constellationTemplate}
                strokeSequence={strokeSequence}
              />
            </ConstellationLeash>
          </ParallaxLayer>
        ) : null}
        </group>
      </CameraRig>
    </ParallaxProvider>
  );
}

function createRenderer(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  options?: { preserveDrawingBuffer?: boolean; alpha?: boolean },
) {
  const useAlpha =
    options?.alpha === true || options?.preserveDrawingBuffer === true;
  const opts: WebGLContextAttributes = {
    alpha: useAlpha,
    antialias: false,
    depth: true,
    stencil: false,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: options?.preserveDrawingBuffer ?? false,
  };
  const context =
    canvas.getContext("webgl2", opts) ||
    canvas.getContext("webgl", opts) ||
    (canvas as HTMLCanvasElement).getContext?.("experimental-webgl", opts);

  if (!context) {
    throw new Error(
      "Aucun contexte WebGL (vérifie chrome://gpu ou bascule sur Chrome).",
    );
  }

  return new WebGLRenderer({
    canvas,
    context: context as WebGLRenderingContext,
    alpha: useAlpha,
    antialias: false,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: false,
  });
}

export type SanctuaryUniverseMode = "background" | "immersive";

export type SanctuaryUniverseProps = {
  className?: string;
  /**
   * - immersive → parallaxe ×1, interactif
   * - background → parallaxe ×0.4, pointer-events none (ciel derrière l’UI)
   */
  mode?: SanctuaryUniverseMode;
  /** Override manuel de l’intensité (prioritaire sur mode). */
  parallaxIntensity?: number;
  /**
   * Thème ciel résolu (couleurs, opacités, parallaxe…).
   * Plus tard : mergeSkyTheme(defaultSkyTheme, partialFamille).
   */
  skyTheme?: SkyTheme;
  /** Immersif : Fermer + Esc */
  onClose?: () => void;
  locale?: "fr" | "en";
  /**
   * Lab craft wormhole : ciel allégé + camera très reculée.
   * Pas de molette zoom, dpr 1, tier mobile (moins de layers).
   */
  craftLite?: boolean;
  /** Lab `/test-lueur` onglet Constellation — scrub / play reveal Leo. */
  craftReveal?: ConstellationRevealCraft;
  /** Wizard onboarding — constellation visible en mode background. */
  constellationVisible?: boolean;
  /** Lab `/test-sky` — masque le toggle chrome « constellation » (panneau lab à la place). */
  skyCraftChrome?: boolean;
  /** Lab — visibilité par layer (undefined = tout on sauf constellation). */
  skyLayers?: SkyCraftLayerMap;
  /** Premier frame Canvas prêt (hub T1b — fondu PNG → WebGL). */
  onCanvasReady?: () => void;
  /** Chemin 1 hub idle — plan ciel test-ciel + dolly Hero. */
  hubSkyCamera?: boolean;
  /** Projection étoile Hero → overlay clic (hub). */
  onStarAnchorChange?: (anchor: ScreenAnchor | null) => void;
  /** Hub Traversée — canvas WebGL pour capture gel (Plan B). */
  onHubCanvasMount?: (canvas: HTMLCanvasElement | null) => void;
  closeStreakFire?: boolean;
  /**
   * T2-freeze — clear alpha : constellation au-dessus du SkyBackdrop gelé.
   * Nécessite `skyLayers` sans fond/gaz (ex. `SKY_RITUAL_LAYERS`).
   */
  overlayOnBackdrop?: boolean;
};

export function SanctuaryUniverse({
  className = "",
  mode = "immersive",
  parallaxIntensity,
  skyTheme = defaultSkyTheme,
  onClose,
  locale = "fr",
  craftLite = false,
  craftReveal,
  constellationVisible,
  skyCraftChrome = true,
  skyLayers,
  onCanvasReady,
  hubSkyCamera = false,
  onStarAnchorChange,
  onHubCanvasMount,
  closeStreakFire = false,
  overlayOnBackdrop = false,
}: SanctuaryUniverseProps) {
  const detectedTier = useVisualTier();
  /** Craft : force mobile = moins de layers (cheat perf). */
  const tier = craftLite
    ? detectedTier === "reduced"
      ? "reduced"
      : "mobile"
    : detectedTier;
  const intensity =
    parallaxIntensity ??
    (craftLite ? 0.25 : mode === "background" ? 0.55 : 1);
  const immersive = mode === "immersive" && !craftLite;
  const skyPaused = craftReveal?.skyActive === false;
  const hubCaptureBuffer = hubSkyCamera && mode === "background";
  const glNeedsAlpha = hubCaptureBuffer || overlayOnBackdrop || closeStreakFire;
  const glFactory = useCallback(
    (canvas: HTMLCanvasElement | OffscreenCanvas) =>
      createRenderer(canvas, {
        preserveDrawingBuffer: hubCaptureBuffer,
        alpha: glNeedsAlpha,
      }),
    [hubCaptureBuffer, glNeedsAlpha],
  );

  useEffect(() => {
    return () => {
      if (hubCaptureBuffer) onHubCanvasMount?.(null);
    };
  }, [hubCaptureBuffer, onHubCanvasMount]);

  const [focus, setFocus] = useState<FocusSession | null>(null);
  const [constellationOn, setConstellationOn] = useState(true);
  const [wanderOn, setWanderOn] = useState(false);
  const [starAnchor, setStarAnchor] = useState<ScreenAnchor | null>(null);

  const onStarScreen = useCallback(
    (anchor: ScreenAnchor | null) => {
      // Hub : ref only via callback — évite setState/frame sur le parent Canvas.
      if (onStarAnchorChange) {
        onStarAnchorChange(anchor);
        return;
      }
      setStarAnchor(anchor);
    },
    [onStarAnchorChange],
  );

  const beginFocus = useCallback(
    (soulId: string, pos: [number, number, number]) => {
      setFocus({ soulId, pos, phase: "approach" });
      document.body.dataset.skyFocus = "1";
    },
    [],
  );

  const closeReveal = useCallback(() => {
    setFocus((prev) => {
      if (!prev || prev.phase === "closing") return prev;
      return { ...prev, phase: "closing" };
    });
  }, []);

  const toggleConstellation = useCallback(() => {
    setConstellationOn((on) => {
      if (on) {
        // Masquer → ferme aussi un éventuel reveal
        setFocus((prev) =>
          prev && prev.phase !== "closing"
            ? { ...prev, phase: "closing" }
            : prev,
        );
      }
      return !on;
    });
  }, []);

  const toggleWander = useCallback(() => {
    setWanderOn((on) => !on);
  }, []);

  // approach → open
  useEffect(() => {
    if (!focus || focus.phase !== "approach") return;
    const t = window.setTimeout(() => {
      setFocus((prev) =>
        prev && prev.phase === "approach"
          ? { ...prev, phase: "open" }
          : prev,
      );
    }, APPROACH_MS);
    return () => window.clearTimeout(t);
  }, [focus]);

  // closing → clear + restore camera
  useEffect(() => {
    if (!focus || focus.phase !== "closing") return;
    const t = window.setTimeout(() => {
      setFocus(null);
      delete document.body.dataset.skyFocus;
    }, CLOSE_SETTLE_MS);
    return () => window.clearTimeout(t);
  }, [focus]);

  useEffect(() => {
    if (!immersive) {
      setFocus(null);
      delete document.body.dataset.skyFocus;
    }
  }, [immersive]);

  useEffect(() => {
    return () => {
      delete document.body.dataset.skyFocus;
    };
  }, []);

  useEffect(() => {
    if (!immersive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (focus) {
        closeReveal();
        return;
      }
      onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [immersive, onClose, focus, closeReveal]);

  const closeLabel = locale === "en" ? "Close" : "Fermer";
  const fillLabel =
    locale === "en" ? "The sky is filling" : "Le ciel se remplit";
  const constellationLabel = constellationOn
    ? locale === "en"
      ? "Hide constellation"
      : "Masquer la constellation"
    : locale === "en"
      ? "Show constellation"
      : "Afficher la constellation";
  const wanderLabel = wanderOn
    ? locale === "en"
      ? "Anchored"
      : "Ancré"
    : locale === "en"
      ? "Wander"
      : "Se promener";
  const hintLabel = focus
    ? locale === "en"
      ? "A memory in the light"
      : "Un souvenir dans la lumière"
    : !constellationOn
      ? locale === "en"
        ? "Sky only · show constellation · scroll to zoom"
        : "Ciel seul · affiche la constellation · molette pour zoomer"
      : wanderOn
        ? locale === "en"
          ? "Drag to wander · tap a star · scroll to zoom"
          : "Glisse pour te promener · touche une étoile · molette"
        : locale === "en"
          ? "Tap a star · scroll to zoom"
          : "Touche une étoile · molette pour zoomer";

  const showChrome = immersive && !focus;
  const portalOpen = focus?.phase === "open";
  const portalExiting = focus?.phase === "closing";

  return (
    <section
      className={[
        "overflow-hidden bg-black",
        immersive
          ? "relative h-screen w-full"
          : "pointer-events-none absolute inset-0 h-full w-full",
        className,
      ]
        .filter(Boolean)
        .join(" ")
        .trim()}
      aria-label={
        locale === "en"
          ? "Sanctuary sky of glows"
          : "Ciel de lueurs du Sanctuaire"
      }
      aria-hidden={!immersive}
    >
      {showChrome ? (
        <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2 md:left-8 md:top-8">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-white/15 bg-black/40 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.22em] text-teal-50/70 backdrop-blur-sm transition-colors hover:border-teal-400/30 hover:text-teal-50"
            >
              {closeLabel}
              <span className="ml-2 hidden text-white/30 sm:inline">Esc</span>
            </button>
          ) : null}
          {skyCraftChrome ? (
          <button
            type="button"
            onClick={toggleConstellation}
            aria-pressed={constellationOn}
            className="rounded-sm border border-white/15 bg-black/40 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.18em] text-teal-50/70 backdrop-blur-sm transition-colors hover:border-teal-400/30 hover:text-teal-50"
          >
            {constellationLabel}
          </button>
          ) : null}
          <button
            type="button"
            onClick={toggleWander}
            aria-pressed={wanderOn}
            className="rounded-sm border border-white/15 bg-black/40 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.18em] text-teal-50/70 backdrop-blur-sm transition-colors hover:border-teal-400/30 hover:text-teal-50"
          >
            {wanderLabel}
          </button>
        </div>
      ) : null}

      <ClientWebGLGate
        fallback={(message) => (
          <div className="flex h-full min-h-[50vh] w-full flex-col items-center justify-center gap-3 bg-black px-6 text-center">
            <p className="text-sm font-light tracking-wide text-teal-100/50">
              {locale === "en"
                ? "Couldn’t open the 3D scene."
                : "Impossible d’ouvrir la scène 3D."}
            </p>
            <p className="max-w-md text-xs leading-relaxed text-white/40">
              {message}
            </p>
          </div>
        )}
      >
        <Canvas
          className={immersive ? undefined : "!pointer-events-none"}
          style={{ pointerEvents: immersive ? "auto" : "none" }}
          frameloop="demand"
          dpr={
            craftLite || skyPaused || closeStreakFire || overlayOnBackdrop
              ? 1
              : tierDpr(tier)
          }
          camera={{
            position: [0, 0, craftLite ? 58 : 9.2],
            fov: craftLite ? 68 : 42,
            near: 0.1,
            far: craftLite ? 120 : 40,
          }}
          gl={glFactory}
          onCreated={({ gl }) => {
            if (overlayOnBackdrop || closeStreakFire) {
              gl.setClearColor(0x000000, 0);
            } else {
              gl.setClearColor(skyTheme.scene.background, 1);
            }
            if (hubCaptureBuffer) {
              onHubCanvasMount?.(gl.domElement as HTMLCanvasElement);
            }
            if (onCanvasReady) {
              requestAnimationFrame(() => {
                onCanvasReady();
              });
            }
          }}
        >
          <Suspense fallback={null}>
            <SkyThemeProvider theme={skyTheme}>
              <UniverseScene
                tier={tier}
                parallaxIntensity={intensity}
                showConstellation={
                  constellationVisible ?? (immersive && constellationOn)
                }
                wanderEnabled={immersive && wanderOn}
                onSelectMemory={beginFocus}
                focus={focus}
                onStarScreen={onStarScreen}
                craftLite={craftLite}
                craftReveal={craftReveal}
                skyLayers={skyLayers}
                hubSkyCamera={hubSkyCamera}
                closeStreakFire={closeStreakFire}
                overlayOnBackdrop={overlayOnBackdrop}
              />
            </SkyThemeProvider>
          </Suspense>
        </Canvas>
      </ClientWebGLGate>

      {immersive && focus ? (
        <MemoryReveal
          soulId={focus.soulId}
          locale={locale}
          onClose={closeReveal}
          open={portalOpen || portalExiting}
          exiting={portalExiting}
          anchor={starAnchor}
        />
      ) : null}

      {immersive && !craftReveal ? (
        <div className="pointer-events-none absolute bottom-8 left-0 right-0 text-center">
          <p className="text-sm font-light uppercase tracking-widest text-teal-50/30">
            {fillLabel}
          </p>
          <p className="mt-2 text-[10px] font-light tracking-wide text-white/25">
            {hintLabel}
          </p>
        </div>
      ) : null}
    </section>
  );
}
