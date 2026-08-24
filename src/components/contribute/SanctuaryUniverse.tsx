"use client";

import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WebGLRenderer } from "three";

import {
  LueurHitTarget,
  LueurNode,
} from "@/src/components/contribute/LueurNode";
import { CameraRig } from "@/src/components/contribute/constellation/CameraRig";
import { CosmicDust } from "@/src/components/contribute/constellation/CosmicDust";
import { ZodiacalLight } from "@/src/components/contribute/constellation/ZodiacalLight";
import { AuroraVeil } from "@/src/components/contribute/constellation/AuroraVeil";
import { EclipseDisc } from "@/src/components/contribute/constellation/EclipseDisc";
import { FocusCamera } from "@/src/components/contribute/constellation/FocusCamera";
import { IdleCameraDrift } from "@/src/components/contribute/constellation/IdleCameraDrift";
import { LightBridges } from "@/src/components/contribute/constellation/LightBridges";
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
  constellationPositions,
  getResolvedStar,
  resolveConstellation,
} from "@/src/components/contribute/constellation/graphs/resolveConstellation";
import { LEO_STROKE_SEQUENCE } from "@/src/components/contribute/constellation/graphs/leo";
import { resolveStrokeDraw } from "@/src/components/contribute/constellation/graphs/reveal";
import {
  tierDpr,
  useVisualTier,
} from "@/src/components/contribute/constellation/useVisualTier";
import { ClientWebGLGate } from "@/src/components/contribute/constellation/webglGate";

const APPROACH_MS = 680;
const CLOSE_SETTLE_MS = 980;
const CONSTELLATION_REVEAL_MS = 3400;

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
  revealT,
  emphasis,
}: {
  onSelectMemory: (
    soulId: string,
    position: [number, number, number],
  ) => void;
  focusedSoulId: string | null;
  focusBoost: number;
  onStarScreen: (anchor: ScreenAnchor | null) => void;
  revealT: number;
  emphasis: number;
}) {
  const stars = useMemo(() => resolveConstellation(), []);
  const positions = useMemo(() => constellationPositions(stars), [stars]);
  const ghostIds = useMemo(
    () => new Set(stars.filter((s) => !s.lit).map((s) => s.id)),
    [stars],
  );
  const draw = useMemo(
    () => resolveStrokeDraw(revealT, LEO_STROKE_SEQUENCE),
    [revealT],
  );
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
    <group position={[-0.45, -0.7, 0]} scale={1}>
      {stars.map((star, i) => {
        const pos = positions[star.id] ?? star.position;
        const appear = draw.nodeAppear[star.id] ?? 0;
        if (appear < 0.03) return null;

        const hitRadius =
          star.visual === "hero"
            ? 0.95
            : star.visual === "premium"
              ? 0.45
              : star.visual === "ghost"
                ? 0.28
                : 0.36;
        const isFocus = focusedSoulId === star.id;

        return (
          <group key={star.id} position={pos}>
            <LueurNode
              variant={star.visual}
              phase={i * 1.7}
              floating={!isFocus && star.lit}
              focusBoost={isFocus ? focusBoost : 0}
              appear={appear * (1 + emphasis * 0.1)}
            />
            {isFocus ? (
              <StarScreenReporter active onScreen={onStarScreen} />
            ) : null}
            {star.lit && star.memory ? (
              <LueurHitTarget
                radius={hitRadius}
                onPointerUp={(e) => onTap(star.id, e)}
                onPointerOver={(e) => {
                  if (locked) return;
                  e.stopPropagation();
                  setHovered(star.id);
                  document.body.style.cursor = "pointer";
                }}
                onPointerOut={() => {
                  setHovered(null);
                  document.body.style.cursor = "auto";
                }}
              />
            ) : null}
            {hovered === star.id && star.name ? (
              <Html
                distanceFactor={6}
                style={{
                  pointerEvents: "none",
                  transform: "translate(-50%, 18px)",
                  whiteSpace: "nowrap",
                  fontSize: "11px",
                  letterSpacing: "0.16em",
                  fontWeight: 300,
                  color: "rgba(204, 251, 241, 0.6)",
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

  const [revealT, setRevealT] = useState(0);

  useEffect(() => {
    if (!showConstellation) {
      setRevealT(0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const raw = Math.min(1, (now - start) / CONSTELLATION_REVEAL_MS);
      setRevealT(raw);
      if (raw < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showConstellation]);

  const emphasis = revealT >= 1 ? 0.55 : revealT * 0.25;

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
                revealT={revealT}
                emphasis={emphasis}
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
};

export function SanctuaryUniverse({
  className = "",
  mode = "immersive",
  parallaxIntensity,
  skyTheme = defaultSkyTheme,
  onClose,
  locale = "fr",
  craftLite = false,
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
                showConstellation={immersive && constellationOn}
                wanderEnabled={immersive && wanderOn}
                onSelectMemory={beginFocus}
                focus={focus}
                onStarScreen={onStarScreen}
                craftLite={craftLite}
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

      {immersive ? (
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
