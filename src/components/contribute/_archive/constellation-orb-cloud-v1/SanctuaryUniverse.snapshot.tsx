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
import { FocusCamera } from "@/src/components/contribute/constellation/FocusCamera";
import { LightBridges } from "@/src/components/contribute/constellation/LightBridges";
import { MemoryReveal } from "@/src/components/contribute/constellation/MemoryReveal";
import { NebulaGas } from "@/src/components/contribute/constellation/NebulaGas";
import { ParallaxLayer, ParallaxProvider } from "@/src/components/contribute/constellation/ParallaxLayer";
import { ShootingStars } from "@/src/components/contribute/constellation/ShootingStars";
import { StarDust } from "@/src/components/contribute/constellation/StarDust";
import {
  StarScreenReporter,
  type ScreenAnchor,
} from "@/src/components/contribute/constellation/StarScreenReporter";
import {
  MOCK_SOULS,
  getMockSoul,
} from "@/src/components/contribute/constellation/mockSouls";
import {
  tierDpr,
  useVisualTier,
} from "@/src/components/contribute/constellation/useVisualTier";
import { ClientWebGLGate } from "@/src/components/contribute/constellation/webglGate";

const APPROACH_MS = 680;
const CLOSE_SETTLE_MS = 980;

type FocusSession = {
  soulId: string;
  pos: [number, number, number];
  /** approach → caméra ; open → portail ; closing → retour */
  phase: "approach" | "open" | "closing";
};

function initialPositions() {
  return Object.fromEntries(
    MOCK_SOULS.map((s) => [s.id, [...s.position] as [number, number, number]]),
  );
}

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
}: {
  onSelectMemory: (
    soulId: string,
    position: [number, number, number],
  ) => void;
  focusedSoulId: string | null;
  focusBoost: number;
  onStarScreen: (anchor: ScreenAnchor | null) => void;
}) {
  const [positions, setPositions] = useState(initialPositions);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const didDrag = useRef(false);

  const heroId = useMemo(
    () => MOCK_SOULS.find((s) => s.tier === "hero")?.id ?? "hero",
    [],
  );
  const soulIds = useMemo(() => MOCK_SOULS.map((s) => s.id), []);
  const locked = focusedSoulId !== null;

  const setSoulDragFlag = useCallback((on: boolean) => {
    if (typeof document === "undefined") return;
    if (on) document.body.dataset.soulDrag = "1";
    else delete document.body.dataset.soulDrag;
  }, []);

  const onPointerDown = (id: string, e: ThreeEvent<PointerEvent>) => {
    if (locked) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragging(id);
    setSoulDragFlag(true);
    didDrag.current = false;
    dragOrigin.current = { x: e.point.x, y: e.point.y };
    document.body.style.cursor = "grabbing";
  };

  const onPointerMove = (id: string, e: ThreeEvent<PointerEvent>) => {
    if (locked || dragging !== id) return;
    e.stopPropagation();
    const origin = dragOrigin.current;
    if (origin) {
      const dx = e.point.x - origin.x;
      const dy = e.point.y - origin.y;
      if (dx * dx + dy * dy > 0.01) didDrag.current = true;
    }
    const z = positions[id]?.[2] ?? 0;
    setPositions((prev) => ({
      ...prev,
      [id]: [e.point.x, e.point.y, z],
    }));
  };

  const onPointerUp = (id: string, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const wasDrag = didDrag.current;
    setDragging(null);
    setSoulDragFlag(false);
    document.body.style.cursor = hovered ? "grab" : "auto";
    dragOrigin.current = null;
    if (locked) return;
    // Tap (pas drag) sur un souvenir → révélation
    if (!wasDrag) {
      const soul = getMockSoul(id);
      if (soul?.memory) {
        const pos = positions[id] ?? soul.position;
        onSelectMemory(id, pos);
      }
    }
  };

  return (
    <group>
      {MOCK_SOULS.map((soul, i) => {
        const pos = positions[soul.id] ?? soul.position;
        const hitRadius =
          soul.tier === "hero" ? 0.55 : soul.tier === "premium" ? 0.4 : 0.32;
        const isFocus = focusedSoulId === soul.id;

        return (
          <group key={soul.id} position={pos}>
            <LueurNode
              variant={soul.tier}
              phase={i * 1.7}
              floating={dragging !== soul.id && !isFocus}
              focusBoost={isFocus ? focusBoost : 0}
            />
            {isFocus ? (
              <StarScreenReporter active onScreen={onStarScreen} />
            ) : null}
            <LueurHitTarget
              radius={hitRadius}
              onPointerDown={(e) => onPointerDown(soul.id, e)}
              onPointerMove={(e) => onPointerMove(soul.id, e)}
              onPointerUp={(e) => onPointerUp(soul.id, e)}
              onPointerOver={(e) => {
                if (locked) return;
                e.stopPropagation();
                setHovered(soul.id);
                if (!dragging) {
                  document.body.style.cursor = soul.memory
                    ? "pointer"
                    : "grab";
                }
              }}
              onPointerOut={() => {
                setHovered(null);
                if (!dragging) document.body.style.cursor = "auto";
              }}
            />
            {hovered === soul.id || dragging === soul.id ? (
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
                {soul.name}
              </Html>
            ) : null}
          </group>
        );
      })}
      <LightBridges
        heroId={heroId}
        positions={positions}
        soulIds={soulIds}
      />
    </group>
  );
}

function UniverseScene({
  tier,
  parallaxIntensity,
  showConstellation,
  onSelectMemory,
  focus,
  onStarScreen,
}: {
  tier: ReturnType<typeof useVisualTier>;
  parallaxIntensity: number;
  showConstellation: boolean;
  onSelectMemory: (
    soulId: string,
    position: [number, number, number],
  ) => void;
  focus: FocusSession | null;
  onStarScreen: (anchor: ScreenAnchor | null) => void;
}) {
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

  return (
    <ParallaxProvider intensity={parallaxIntensity}>
      <ForceRenderLoop />
      <color attach="background" args={["#02040a"]} />
      <fog attach="fog" args={["#03050c", 12, 28]} />
      <ambientLight intensity={0.05} />
      <FocusCamera
        target={focus ? focus.pos : null}
        active={focusing}
      />
      <CameraRig>
        <ParallaxLayer factor={-0.06} lerp={0.02}>
          <NebulaGas tier={tier} />
        </ParallaxLayer>
        <ParallaxLayer factor={0.16} lerp={0.026}>
          <CosmicDust tier={tier} />
        </ParallaxLayer>
        <StarDust tier={tier} />
        <ParallaxLayer factor={0.85} lerp={0.07}>
          <ShootingStars tier={tier} />
        </ParallaxLayer>
        {showConstellation ? (
          <ParallaxLayer factor={0.4} lerp={0.04}>
            <Constellation
              onSelectMemory={onSelectMemory}
              focusedSoulId={focus?.soulId ?? null}
              focusBoost={focusBoost}
              onStarScreen={onStarScreen}
            />
          </ParallaxLayer>
        ) : null}
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
  /** Immersif : Fermer + Esc */
  onClose?: () => void;
  locale?: "fr" | "en";
};

export function SanctuaryUniverse({
  className = "",
  mode = "immersive",
  parallaxIntensity,
  onClose,
  locale = "fr",
}: SanctuaryUniverseProps) {
  const tier = useVisualTier();
  const intensity =
    parallaxIntensity ?? (mode === "background" ? 0.55 : 1);
  const immersive = mode === "immersive";
  const [focus, setFocus] = useState<FocusSession | null>(null);
  const [constellationOn, setConstellationOn] = useState(true);
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
  const hintLabel = focus
    ? locale === "en"
      ? "A memory in the light"
      : "Un souvenir dans la lumière"
    : !constellationOn
      ? locale === "en"
        ? "Sky only · show constellation to touch memories"
        : "Ciel seul · affiche la constellation pour toucher"
      : locale === "en"
        ? "Tap a star to see a memory · drag to move"
        : "Touche une étoile pour voir · glisse pour déplacer";

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
          dpr={tierDpr(tier)}
          camera={{ position: [0, 0, 7.5], fov: 42, near: 0.1, far: 40 }}
          gl={createRenderer}
          onCreated={({ gl }) => {
            gl.setClearColor("#02040a", 1);
          }}
        >
          <Suspense fallback={null}>
            <UniverseScene
              tier={tier}
              parallaxIntensity={intensity}
              showConstellation={immersive && constellationOn}
              onSelectMemory={beginFocus}
              focus={focus}
              onStarScreen={onStarScreen}
            />
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
