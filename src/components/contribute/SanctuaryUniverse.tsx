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
import { WebGLRenderer } from "three";

import {
  LueurHitTarget,
  LueurNode,
} from "@/src/components/contribute/LueurNode";
import {
  HeroStar,
  type HeroLayerKnobs,
} from "@/src/components/contribute/constellation/HeroStar";
import { CameraRig } from "@/src/components/contribute/constellation/CameraRig";
import { CosmicDust } from "@/src/components/contribute/constellation/CosmicDust";
import { ZodiacalLight } from "@/src/components/contribute/constellation/ZodiacalLight";
import { AuroraVeil } from "@/src/components/contribute/constellation/AuroraVeil";
import { EclipseDisc } from "@/src/components/contribute/constellation/EclipseDisc";
import { FocusCamera } from "@/src/components/contribute/constellation/FocusCamera";
import { IdleCameraDrift } from "@/src/components/contribute/constellation/IdleCameraDrift";
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
import { ParallaxLayer, ParallaxProvider } from "@/src/components/contribute/constellation/ParallaxLayer";
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
  CONSTELLATION_LAYOUT_ID,
  buildCraftSlotFills,
  constellationPositions,
  getResolvedStar,
  resolveConstellation,
} from "@/src/components/contribute/constellation/graphs/resolveConstellation";
import { LEO_STROKE_SEQUENCE } from "@/src/components/contribute/constellation/graphs/leo";
import { resolveBirth } from "@/src/components/contribute/constellation/graphs/birth";
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
  /** Filament boost when reveal complete (default 0.55) */
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
};

type FocusSession = {
  soulId: string;
  pos: [number, number, number];
  /** approach → caméra ; open → portail ; closing → retour */
  phase: "approach" | "open" | "closing";
};

/** Garantit des frames même sans interaction souris (WebGL demand). */
function ForceRenderLoop() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
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
  }, [invalidate]);
  return null;
}

function Constellation({
  onSelectMemory,
  focusedSoulId,
  focusBoost,
  onStarScreen,
  revealT: revealTProp,
  revealTRef,
  emphasisDuring = 0.25,
  emphasisIdle = 0.55,
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
  heroAtom,
  slotStars = DEFAULT_SLOT_STARS,
  bridges = DEFAULT_BRIDGES,
  slotLit,
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
  heroAtom?: ConstellationRevealCraft["heroAtom"];
  slotStars?: SlotStarsCraft;
  bridges?: BridgesCraft;
  slotLit?: Record<string, boolean>;
}) {
  const [revealT, setRevealT] = useState(revealTProp);
  useFrame(() => {
    if (!revealTRef) return;
    const v = revealTRef.current;
    setRevealT((prev) => (Math.abs(prev - v) > 0.0008 ? v : prev));
  });
  useEffect(() => {
    if (revealTRef) return;
    setRevealT(revealTProp);
  }, [revealTProp, revealTRef]);

  const emphasis =
    revealT >= 1 ? emphasisIdle : revealT * emphasisDuring;

  const birth = useMemo(() => resolveBirth(revealT), [revealT]);

  const stars = useMemo(() => {
    if (slotLit) {
      return resolveConstellation(ACTIVE_TEMPLATE, buildCraftSlotFills(slotLit));
    }
    return resolveConstellation();
  }, [slotLit]);
  const positions = useMemo(() => constellationPositions(stars), [stars]);
  const ghostIds = useMemo(
    () => new Set(stars.filter((s) => !s.lit).map((s) => s.id)),
    [stars],
  );
  const draw = useMemo(() => {
    void heroShare;
    const d = resolveStrokeDraw(birth.drawU, LEO_STROKE_SEQUENCE, {
      heroShare: 0,
      strokeOverlap,
    });
    d.nodeAppear.hero = Math.max(d.nodeAppear.hero ?? 0, birth.heroBirth);
    return d;
  }, [birth, strokeOverlap, heroShare]);
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
    <group position={[-0.45, -0.7, 0]} scale={graphScale}>
      {stars.map((star, i) => {
        const pos = positions[star.id] ?? star.position;
        const appear = draw.nodeAppear[star.id] ?? 0;
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
        const appearMul = appear * (1 + emphasis * 0.1) * ghostFade;

        // Mote → star (heroBirth already quint-slow in birth.ts)
        const heroEase = birth.heroBirth;
        const showHeroStar = birth.heroBirth > 0.008;
        const heroGroupScale = useCraftHero
          ? Math.max(0.012, embed * (0.04 + 0.96 * heroEase))
          : 1;

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
        const showHeroName = isHero && nameBloom > 0.02;
        const showSlotName =
          !isHero && !!star.name && hovered === star.id;
        const nameOpacity = isHero
          ? Math.min(
              1,
              nameBloom *
                (0.4 + 0.6 * nameClarity) *
                (0.78 + 0.22 * nameGlow) *
                (hovered === star.id ? 1 : 0.92),
            )
          : 0.6;
        const nameBlurPx = isHero
          ? Math.max(0, (1 - nameClarity) * 16)
          : 0;
        // Under the star — frozen once landed (no yield during C)
        const nameScale = isHero ? 0.78 + 0.22 * nameScaleCh : 1;
        const nameY = isHero
          ? 42 - 14 * nameLift + birth.nameDriftY * 4
          : 18;
        const nameX = isHero ? birth.nameDriftX * 5 : 0;
        const nameTracking = isHero
          ? 0.36 - 0.14 * nameTrack + 0.025 * nameGlow
          : 0.2;
        const glowPx = 14 + 30 * nameGlow + 8 * nameClarity;
        const glowA = 0.12 + 0.4 * nameGlow;

        return (
          <group key={star.id} position={pos}>
            {useCraftHero && heroAtom && showHeroStar ? (
              <group scale={heroGroupScale}>
                <HeroStar
                  white={heroAtom.white}
                  teal={heroAtom.teal}
                  spikes={heroAtom.spikes}
                  globalScale={gScale}
                  birthFlash={birth.heroFlash}
                  parallax={0}
                  phase={i * 1.7}
                />
              </group>
            ) : !useCraftHero ? (
              <LueurNode
                variant={star.visual}
                phase={i * 1.7}
                floating={!isFocus && star.lit}
                focusBoost={isFocus ? focusBoost : 0}
                appear={
                  isHero ? Math.max(appearMul, heroEase) : appearMul
                }
                craftSizeMul={star.visual === "hero" ? 1 : slotSizeMul}
                craftGlowMul={star.visual === "hero" ? 1 : slotStars.glow}
                craftBreathMul={
                  star.visual === "hero" ? 1 : slotStars.breath
                }
              />
            ) : null}
            {isFocus ? (
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
                distanceFactor={isHero ? 6.4 : 6}
                style={{
                  pointerEvents: "none",
                  transform: `translate(calc(-50% + ${nameX.toFixed(2)}px), ${nameY.toFixed(1)}px) scale(${nameScale.toFixed(3)})`,
                  transformOrigin: "50% 0%",
                  whiteSpace: "nowrap",
                  fontSize: isHero ? "19px" : "11px",
                  letterSpacing: `${nameTracking.toFixed(3)}em`,
                  fontWeight: 300,
                  opacity: nameOpacity,
                  filter:
                    nameBlurPx > 0.35
                      ? `blur(${nameBlurPx.toFixed(1)}px)`
                      : undefined,
                  color: isHero
                    ? `rgba(255, 252, 248, ${0.72 + 0.22 * nameClarity})`
                    : "rgba(204, 251, 241, 0.6)",
                  textShadow: isHero
                    ? `0 0 ${glowPx.toFixed(0)}px rgba(94, 234, 212, ${glowA.toFixed(2)}), 0 0 ${(glowPx * 0.45).toFixed(0)}px rgba(255, 248, 240, ${
                        0.08 + 0.2 * nameGlow
                      })`
                    : "none",
                  transition: "none",
                }}
                center
              >
                {star.name}
              </Html>
            ) : null}
          </group>
        );
      })}
      <LightBridges
        positions={positions}
        edges={ACTIVE_TEMPLATE.edges}
        ghostIds={ghostIds}
        draw={draw}
        emphasis={emphasis}
        revealComplete={revealT >= 1}
        lineWidthMul={lineWidthMul}
        lineOpacityMul={lineOpacityMul}
        tipStrength={tipStrength}
        ghostDim={slotStars.ghostDim ?? ghostDim}
        tipStyle={tipStyle}
        tipColor={tipColor}
        tipSize={tipSize}
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
  const emphasisIdle = craftReveal?.emphasisIdle ?? 0.55;
  const graphScale = craftReveal?.graphScale ?? 1;
  const lineWidthMul = craftReveal?.lineWidth ?? 1;
  const lineOpacityMul = craftReveal?.lineOpacity ?? 1;
  const tipStrength = craftReveal?.tipStrength ?? 1;
  const ghostDim = craftReveal?.ghostDim ?? 1;
  const tipStyle = craftReveal?.tipStyle ?? "orb";
  const tipColor = craftReveal?.tipColor ?? "#ccfbf1";
  const tipSize = craftReveal?.tipSize ?? 1;
  const heroAtom = craftReveal?.heroAtom;
  const slotStars = craftReveal?.slotStars ?? DEFAULT_SLOT_STARS;
  const bridges = craftReveal?.bridges ?? DEFAULT_BRIDGES;
  const slotLit = craftReveal?.slotLit;

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
      <ForceRenderLoop />
      {/* Craft : zoom fixe (pas de molette qui recentre) */}
      <WheelZoom enabled={!craftLite} />
      <SkyWander enabled={wanderEnabled} />
      <IdleCameraDrift />
      <color attach="background" args={[theme.scene.background]} />
      <fog
        attach="fog"
        args={[
          theme.scene.fogColor,
          theme.scene.fogNear,
          craftLite ? theme.scene.fogFar * 3.2 : theme.scene.fogFar,
        ]}
      />
      <ambientLight intensity={theme.scene.ambientIntensity} />
      <FocusCamera
        target={focus ? focus.pos : null}
        active={focusing}
      />
      <RevealCamera
        enabled={showConstellation && !focusing}
        revealT={revealTProp}
        revealTRef={revealTRef}
        graphScale={graphScale}
      />
      <CameraRig>
        {/* Craft : remonte le ciel pour que la bande d etoiles soit en haut d ecran */}
        <group position={craftLite ? [0, 5.5, 0] : [0, 0, 0]}>
        {tier !== "reduced" ? (
          <ParallaxLayer
            factor={theme.gasFar.parallax.factor}
            lerp={theme.gasFar.parallax.lerp}
          >
            <NebulaGasFar tier={tier} />
          </ParallaxLayer>
        ) : null}
        {tier === "desktop" ? (
          <ParallaxLayer
            factor={theme.ghostStars.parallax.factor}
            lerp={theme.ghostStars.parallax.lerp}
          >
            <GhostStars tier={tier} />
          </ParallaxLayer>
        ) : null}
        <ParallaxLayer
          factor={theme.gasRose.parallax.factor}
          lerp={theme.gasRose.parallax.lerp}
        >
          <NebulaGasRose tier={tier} />
        </ParallaxLayer>
        <ParallaxLayer
          factor={theme.gasMauve.parallax.factor}
          lerp={theme.gasMauve.parallax.lerp}
        >
          <NebulaGasMauve tier={tier} />
        </ParallaxLayer>
        <ParallaxLayer
          factor={theme.gasTeal.parallax.factor}
          lerp={theme.gasTeal.parallax.lerp}
        >
          <NebulaGasTeal tier={tier} />
        </ParallaxLayer>
        <ParallaxLayer
          factor={theme.cosmicDust.parallax.factor}
          lerp={theme.cosmicDust.parallax.lerp}
        >
          <CosmicDust tier={tier} />
        </ParallaxLayer>
        {tier !== "reduced" && !craftLite ? (
          <ParallaxLayer
            factor={theme.zodiacal.parallax.factor}
            lerp={theme.zodiacal.parallax.lerp}
          >
            <ZodiacalLight tier={tier} />
          </ParallaxLayer>
        ) : null}
        {tier !== "reduced" && !craftLite ? (
          <ParallaxLayer
            factor={theme.aurora.parallax.factor}
            lerp={theme.aurora.parallax.lerp}
          >
            <AuroraVeil tier={tier} />
          </ParallaxLayer>
        ) : null}
        {tier === "desktop" ? (
          <ParallaxLayer
            factor={theme.eclipse.parallax.factor}
            lerp={theme.eclipse.parallax.lerp}
          >
            <EclipseDisc tier={tier} />
          </ParallaxLayer>
        ) : null}
        <StarDust tier={tier} />
        {!craftLite ? (
          <ParallaxLayer
            factor={theme.shootingStars.parallax.factor}
            lerp={theme.shootingStars.parallax.lerp}
          >
            <ShootingStars tier={tier} />
          </ParallaxLayer>
        ) : null}
        {showConstellation ? (
          <ParallaxLayer
            factor={theme.constellation.parallax.factor}
            lerp={theme.constellation.parallax.lerp}
          >
            <ConstellationLeash>
              <Constellation
                key={CONSTELLATION_LAYOUT_ID}
                onSelectMemory={onSelectMemory}
                focusedSoulId={focus?.soulId ?? null}
                focusBoost={focusBoost}
                onStarScreen={onStarScreen}
                revealT={revealTProp}
                revealTRef={revealTRef}
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
                heroAtom={heroAtom}
                slotStars={slotStars}
                bridges={bridges}
                slotLit={slotLit}
              />
            </ConstellationLeash>
          </ParallaxLayer>
        ) : null}
        </group>
      </CameraRig>
    </ParallaxProvider>
  );
}

function createRenderer(canvas: HTMLCanvasElement | OffscreenCanvas) {
  const opts: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: true,
    stencil: false,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: false,
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
    alpha: false,
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
  const [focus, setFocus] = useState<FocusSession | null>(null);
  const [constellationOn, setConstellationOn] = useState(true);
  const [wanderOn, setWanderOn] = useState(false);
  const [starAnchor, setStarAnchor] = useState<ScreenAnchor | null>(null);

  const onStarScreen = useCallback((anchor: ScreenAnchor | null) => {
    setStarAnchor(anchor);
  }, []);

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
          <button
            type="button"
            onClick={toggleConstellation}
            aria-pressed={constellationOn}
            className="rounded-sm border border-white/15 bg-black/40 px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.18em] text-teal-50/70 backdrop-blur-sm transition-colors hover:border-teal-400/30 hover:text-teal-50"
          >
            {constellationLabel}
          </button>
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
          dpr={craftLite ? 1 : tierDpr(tier)}
          camera={{
            position: [0, 0, craftLite ? 58 : 9.2],
            fov: craftLite ? 68 : 42,
            near: 0.1,
            far: craftLite ? 120 : 40,
          }}
          gl={createRenderer}
          onCreated={({ gl }) => {
            gl.setClearColor(skyTheme.scene.background, 1);
          }}
        >
          <Suspense fallback={null}>
            <SkyThemeProvider theme={skyTheme}>
              <UniverseScene
                tier={tier}
                parallaxIntensity={intensity}
                showConstellation={
                  immersive && (craftReveal ? true : constellationOn)
                }
                wanderEnabled={immersive && wanderOn}
                onSelectMemory={beginFocus}
                focus={focus}
                onStarScreen={onStarScreen}
                craftLite={craftLite}
                craftReveal={craftReveal}
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
