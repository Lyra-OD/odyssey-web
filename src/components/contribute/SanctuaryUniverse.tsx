"use client";

import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { WebGLRenderer } from "three";

import {
  LueurHitTarget,
  LueurNode,
} from "@/src/components/contribute/LueurNode";
import { CameraRig } from "@/src/components/contribute/constellation/CameraRig";
import { LightBridges } from "@/src/components/contribute/constellation/LightBridges";
import { NebulaGas } from "@/src/components/contribute/constellation/NebulaGas";
import { ParallaxLayer, ParallaxProvider } from "@/src/components/contribute/constellation/ParallaxLayer";
import { ShootingStars } from "@/src/components/contribute/constellation/ShootingStars";
import { StarDust } from "@/src/components/contribute/constellation/StarDust";
import { MOCK_SOULS } from "@/src/components/contribute/constellation/mockSouls";
import {
  tierDpr,
  useVisualTier,
} from "@/src/components/contribute/constellation/useVisualTier";
import { ClientWebGLGate } from "@/src/components/contribute/constellation/webglGate";

function initialPositions() {
  return Object.fromEntries(
    MOCK_SOULS.map((s) => [s.id, [...s.position] as [number, number, number]]),
  );
}

/** Garantit des frames même sans interaction souris (WebGL low-power / demand). */
function ForceRenderLoop() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      invalidate();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [invalidate]);
  return null;
}

function Constellation() {
  const [positions, setPositions] = useState(initialPositions);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const heroId = useMemo(
    () => MOCK_SOULS.find((s) => s.tier === "hero")?.id ?? "hero",
    [],
  );
  const soulIds = useMemo(() => MOCK_SOULS.map((s) => s.id), []);

  const setSoulDragFlag = useCallback((on: boolean) => {
    if (typeof document === "undefined") return;
    if (on) document.body.dataset.soulDrag = "1";
    else delete document.body.dataset.soulDrag;
  }, []);

  const onPointerDown = (id: string, e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragging(id);
    setSoulDragFlag(true);
    document.body.style.cursor = "grabbing";
  };

  const onPointerMove = (id: string, e: ThreeEvent<PointerEvent>) => {
    if (dragging !== id) return;
    e.stopPropagation();
    // Garde le Z d’origine — déplacement libre dans le plan de la scène
    const z = positions[id]?.[2] ?? 0;
    setPositions((prev) => ({
      ...prev,
      [id]: [e.point.x, e.point.y, z],
    }));
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setDragging(null);
    setSoulDragFlag(false);
    document.body.style.cursor = hovered ? "grab" : "auto";
  };

  return (
    <group>
      {MOCK_SOULS.map((soul, i) => {
        const pos = positions[soul.id] ?? soul.position;
        const hitRadius =
          soul.tier === "hero" ? 0.55 : soul.tier === "premium" ? 0.4 : 0.32;

        return (
          <group key={soul.id} position={pos}>
            <LueurNode
              variant={soul.tier}
              phase={i * 1.7}
              floating={dragging !== soul.id}
            />
            <LueurHitTarget
              radius={hitRadius}
              onPointerDown={(e) => onPointerDown(soul.id, e)}
              onPointerMove={(e) => onPointerMove(soul.id, e)}
              onPointerUp={onPointerUp}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(soul.id);
                if (!dragging) document.body.style.cursor = "grab";
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
}: {
  tier: ReturnType<typeof useVisualTier>;
  parallaxIntensity: number;
}) {
  return (
    <ParallaxProvider intensity={parallaxIntensity}>
      <ForceRenderLoop />
      <color attach="background" args={["#02040a"]} />
      <fog attach="fog" args={["#03050c", 12, 28]} />
      <ambientLight intensity={0.05} />
      <CameraRig>
        {/* Gaz : micro-parallaxe inverse + inertie lente = volume */}
        <ParallaxLayer factor={-0.06} lerp={0.02}>
          <NebulaGas tier={tier} />
        </ParallaxLayer>
        <StarDust tier={tier} />
        <ParallaxLayer factor={0.85} lerp={0.07}>
          <ShootingStars tier={tier} />
        </ParallaxLayer>
        {/* Constellation masquée le temps du polish ciel — à réactiver ensuite */}
        {false && <Constellation />}
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
   * Stub plan D — sans UI encore :
   * - immersive (défaut) → parallaxe ×1
   * - background → parallaxe ×0.4 (ciel derrière l’UI)
   */
  mode?: SanctuaryUniverseMode;
  /** Override manuel de l’intensité (prioritaire sur mode). */
  parallaxIntensity?: number;
};

export function SanctuaryUniverse({
  className = "",
  mode = "immersive",
  parallaxIntensity,
}: SanctuaryUniverseProps) {
  const tier = useVisualTier();
  const intensity =
    parallaxIntensity ?? (mode === "background" ? 0.4 : 1);

  return (
    <section
      className={`relative h-screen w-full overflow-hidden bg-black ${className}`.trim()}
      aria-label="Ciel de lueurs du Sanctuaire"
    >
      <ClientWebGLGate
        fallback={(message) => (
          <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-black px-6 text-center">
            <p className="text-sm font-light tracking-wide text-teal-100/50">
              Impossible d’ouvrir la scène 3D.
            </p>
            <p className="max-w-md text-xs leading-relaxed text-white/40">
              {message}
            </p>
          </div>
        )}
      >
        <Canvas
          frameloop="demand"
          dpr={tierDpr(tier)}
          camera={{ position: [0, 0, 7.5], fov: 42, near: 0.1, far: 40 }}
          gl={createRenderer}
          onCreated={({ gl }) => {
            gl.setClearColor("#02040a", 1);
          }}
        >
          <Suspense fallback={null}>
            <UniverseScene tier={tier} parallaxIntensity={intensity} />
          </Suspense>
        </Canvas>
      </ClientWebGLGate>

      <div className="pointer-events-none absolute bottom-8 left-0 right-0 text-center">
        <p className="text-sm font-light uppercase tracking-widest text-teal-50/30">
          Le ciel se remplit
        </p>
        <p className="mt-2 text-[10px] font-light tracking-wide text-white/25">
          Glisse une étoile pour la déplacer
        </p>
      </div>
    </section>
  );
}
