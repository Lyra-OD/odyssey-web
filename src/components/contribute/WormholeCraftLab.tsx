"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { ClientWebGLGate } from "@/src/components/contribute/constellation/webglGate";
import {
  tierDpr,
  useVisualTier,
} from "@/src/components/contribute/constellation/useVisualTier";
import {
  WORMHOLE_CRAFT_DEFAULTS,
  WormholeCraftPlane,
  type WormholeCraftKnobs,
} from "@/src/components/contribute/constellation/WormholeCraftShader";

type Locale = "fr" | "en";

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

/** Fond étoiles fixes — révélés quand le warp décélère / fade. */
function StaticStarField({ reveal }: { reveal: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);

  const geometry = useMemo(() => {
    const n = 280;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.2 + Math.random() * 3.2;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 2.4;
      arr[i * 3 + 2] = -4 - Math.random() * 6;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return geo;
  }, []);

  useFrame(() => {
    if (matRef.current) {
      matRef.current.opacity = Math.min(1, Math.max(0, reveal)) * 0.85;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false} renderOrder={1}>
      <pointsMaterial
        ref={matRef}
        color="#d8dee6"
        size={0.028}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

function BloomHook({ intensity }: { intensity: number }) {
  const ref = useRef<{ intensity: number } | null>(null);
  useFrame(() => {
    if (ref.current) ref.current.intensity = intensity;
  });
  return (
    <Bloom
      ref={ref as never}
      luminanceThreshold={0.82}
      luminanceSmoothing={0.55}
      intensity={intensity}
      mipmapBlur
    />
  );
}

/**
 * Lab craft wormhole — Quiet Luxury (blanc / argent).
 * Décélération demo : velocity → 0 + opacity → 0 → ciel fixe.
 */
export function WormholeCraftLab({ locale = "fr" }: { locale?: Locale }) {
  const tier = useVisualTier();
  const [knobs, setKnobs] = useState<WormholeCraftKnobs>({
    ...WORMHOLE_CRAFT_DEFAULTS,
  });
  const [demo, setDemo] = useState(false);
  const demoRef = useRef(false);
  const startRef = useRef(0);

  const set = <K extends keyof WormholeCraftKnobs>(key: K, v: number) => {
    setKnobs((prev) => ({ ...prev, [key]: v }));
  };

  useEffect(() => {
    demoRef.current = demo;
    if (!demo) return;
    startRef.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (!demoRef.current) return;
      const u = Math.min(1, (now - startRef.current) / 4200);
      // Ease soft : warp → points → fade
      const ease = u * u * (3 - 2 * u);
      const vel = 2.0 * (1 - ease);
      const opacity = 0.95 * (1 - Math.pow(ease, 1.35));
      setKnobs((prev) => ({
        ...prev,
        velocity: vel,
        opacity,
      }));
      if (u >= 1) {
        setDemo(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [demo]);

  const skyReveal =
    (1 - Math.min(1, knobs.opacity * 1.05)) *
    (1 - Math.min(1, knobs.velocity / 2));

  const bloomIntensity = 0.35 + 0.55 * Math.min(1, knobs.velocity / 2) * knobs.headGain * 0.45;

  const copy =
    locale === "en"
      ? {
          title: "Wormhole · craft",
          sub: "Quiet Luxury warp — white / silver. Polar stretch ∝ velocity. Scrub knobs, then Decel demo.",
          reset: "Reset",
          demo: "Decel → sky",
          demoRun: "…",
          play: "← Eclipse play",
          eclipse: "Eclipse lab",
          hint: "Craft only — not wired to play yet.",
          velocity: "Velocity",
          stretch: "Stretch pow",
          density: "Density",
          opacity: "Opacity",
          head: "Head HDR",
          tail: "Tail",
          core: "Core soft",
        }
      : {
          title: "Wormhole · craft",
          sub: "Warp Quiet Luxury — blanc / argent. Stretch polar ∝ velocity. Knobs, puis démo décélération.",
          reset: "Reset",
          demo: "Décel → ciel",
          demoRun: "…",
          play: "← Lecture éclipse",
          eclipse: "Lab éclipse",
          hint: "Craft seul — pas encore branché au play.",
          velocity: "Vélocité",
          stretch: "Stretch pow",
          density: "Densité",
          opacity: "Opacité",
          head: "Tête HDR",
          tail: "Queue",
          core: "Core soft",
        };

  const sliders: {
    key: keyof WormholeCraftKnobs;
    label: string;
    min: number;
    max: number;
    step: number;
  }[] = [
    { key: "velocity", label: copy.velocity, min: 0, max: 2, step: 0.01 },
    { key: "stretchPow", label: copy.stretch, min: 1.1, max: 2.6, step: 0.01 },
    { key: "density", label: copy.density, min: 16, max: 96, step: 1 },
    { key: "opacity", label: copy.opacity, min: 0, max: 1, step: 0.01 },
    { key: "headGain", label: copy.head, min: 0.4, max: 2.2, step: 0.01 },
    { key: "tail", label: copy.tail, min: 0.2, max: 1, step: 0.01 },
    { key: "coreSoft", label: copy.core, min: 0.02, max: 0.2, step: 0.005 },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100 antialiased">
      <ClientWebGLGate
        fallback={(message) => (
          <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-white/50">
            {message}
          </div>
        )}
      >
        <div className="fixed inset-0 z-0">
          <Canvas
            className="h-full w-full"
            frameloop="always"
            dpr={tierDpr(tier)}
            camera={{ position: [0, 0, 4], fov: 48, near: 0.1, far: 40 }}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: "high-performance",
            }}
            onCreated={({ gl }) => {
              gl.setClearColor("#03050a", 1);
            }}
          >
            <Suspense fallback={null}>
              <ForceRenderLoop />
              <color attach="background" args={["#03050a"]} />
              <StaticStarField reveal={skyReveal} />
              <WormholeCraftPlane knobs={knobs} />
              <EffectComposer multisampling={0}>
                <BloomHook intensity={bloomIntensity} />
              </EffectComposer>
            </Suspense>
          </Canvas>
        </div>
      </ClientWebGLGate>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-1 px-5 pt-6 md:px-10 md:pt-10">
        <p className="text-xs font-light uppercase tracking-[0.28em] text-white/45 md:text-sm">
          {copy.title}
        </p>
        <p className="max-w-xl text-sm font-light text-white/50 md:text-base">
          {copy.sub}
        </p>
      </div>

      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/55 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/contribute/test-eclipse-play`}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/70 hover:border-white/40"
            >
              {copy.play}
            </Link>
            <Link
              href={`/${locale}/contribute/test-eclipse`}
              className="rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55 hover:border-white/30"
            >
              {copy.eclipse}
            </Link>
            <button
              type="button"
              onClick={() => setKnobs({ ...WORMHOLE_CRAFT_DEFAULTS })}
              className="rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55 hover:border-white/30"
            >
              {copy.reset}
            </button>
            <button
              type="button"
              disabled={demo}
              onClick={() => {
                setKnobs((prev) => ({
                  ...prev,
                  velocity: 2,
                  opacity: 0.95,
                }));
                setDemo(true);
              }}
              className="rounded-sm border border-white/25 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/80 hover:border-white/45 disabled:opacity-40"
            >
              {demo ? copy.demoRun : copy.demo}
            </button>
            <p className="ml-auto hidden text-[11px] font-light tracking-wide text-white/30 sm:block">
              {copy.hint}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {sliders.map((s) => (
              <label key={s.key} className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                  {s.label}
                  <span className="ml-1 font-mono text-white/25">
                    {knobs[s.key].toFixed(s.step < 0.01 ? 3 : 2)}
                  </span>
                </span>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={knobs[s.key]}
                  onChange={(e) => set(s.key, Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
