"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { WebGLRenderer } from "three";

import { EclipseDisc } from "@/src/components/contribute/constellation/EclipseDisc";
import {
  defaultSkyTheme,
  SkyThemeProvider,
} from "@/src/components/contribute/constellation/skyTheme";
import { ClientWebGLGate } from "@/src/components/contribute/constellation/webglGate";
import {
  tierDpr,
  useVisualTier,
} from "@/src/components/contribute/constellation/useVisualTier";

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

function createRenderer(canvas: HTMLCanvasElement | OffscreenCanvas) {
  const opts: WebGLContextAttributes = {
    alpha: false,
    antialias: true,
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
    throw new Error("Aucun contexte WebGL");
  }

  return new WebGLRenderer({
    canvas,
    context: context as WebGLRenderingContext,
    alpha: false,
    antialias: true,
    powerPreference: "high-performance",
    failIfMajorPerformanceCaveat: false,
  });
}

type Locale = "fr" | "en";

/**
 * Lab craft — éclipse seule, fond noir.
 * Pas d’intro Sanctuaire ici : on cherche la forme digne (logo + future intro).
 */
export function EclipseCraftLab({ locale = "fr" }: { locale?: Locale }) {
  const tier = useVisualTier();
  const [opacity, setOpacity] = useState(0.88);
  const [corona, setCorona] = useState(1.35);
  const [scale, setScale] = useState(1.15);
  const [breath, setBreath] = useState(true);

  const craft = useMemo(() => {
    // Breath léger si activé — le useFrame du disc lit des valeurs stables ;
    // on anime via state rafraîchi.
    return {
      opacity,
      coronaAmp: corona,
      scaleMul: scale,
    };
  }, [opacity, corona, scale]);

  // Micro-respiration optionnelle (lab)
  useEffect(() => {
    if (!breath) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      const w = 0.5 + 0.5 * Math.sin(t * 0.55);
      setOpacity(0.72 + w * 0.22);
      setCorona(1.15 + w * 0.45);
      setScale(1.05 + w * 0.18);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [breath]);

  const pulseOnce = useCallback(() => {
    setBreath(false);
    setOpacity(0.15);
    setCorona(0.6);
    setScale(0.85);
    window.setTimeout(() => {
      setOpacity(1);
      setCorona(1.8);
      setScale(1.45);
    }, 120);
    window.setTimeout(() => {
      setOpacity(0.88);
      setCorona(1.35);
      setScale(1.15);
    }, 900);
  }, []);

  const copy =
    locale === "en"
      ? {
          title: "Eclipse craft",
          sub: "Mark only — sanctuary intro comes later",
          breath: "Breath",
          pulse: "Pulse",
          opacity: "Opacity",
          corona: "Corona",
          scale: "Scale",
          hint: "Dev only · shape the eclipse before wiring intro / logo",
        }
      : {
          title: "Craft Éclipse",
          sub: "Marque seule — intro Sanctuaire plus tard",
          breath: "Respiration",
          pulse: "Pulse",
          opacity: "Opacité",
          corona: "Corona",
          scale: "Échelle",
          hint: "Dev only · forme l’éclipse avant intro / logo",
        };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100 antialiased">
      <ClientWebGLGate
        fallback={(message) => (
          <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-white/50">
            {message}
          </div>
        )}
      >
        <Canvas
          className="!fixed inset-0"
          frameloop="demand"
          dpr={tierDpr(tier)}
          camera={{ position: [0, 0, 7.5], fov: 42, near: 0.1, far: 40 }}
          gl={createRenderer}
          onCreated={({ gl }) => {
            gl.setClearColor("#000000", 1);
          }}
        >
          <Suspense fallback={null}>
            <SkyThemeProvider theme={defaultSkyTheme}>
              <ForceRenderLoop />
              <color attach="background" args={["#000000"]} />
              <ambientLight intensity={0.02} />
              <EclipseDisc tier={tier} craft={craft} />
            </SkyThemeProvider>
          </Suspense>
        </Canvas>
      </ClientWebGLGate>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-1 px-5 pt-6 md:px-10 md:pt-10">
        <p className="text-[10px] font-light uppercase tracking-[0.32em] text-white/35">
          {copy.title}
        </p>
        <p className="text-xs font-light text-white/45">{copy.sub}</p>
      </div>

      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/55 px-5 py-4 backdrop-blur-md md:px-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBreath((b) => !b)}
              aria-pressed={breath}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:border-white/40"
            >
              {copy.breath}
              {breath ? " · on" : " · off"}
            </button>
            <button
              type="button"
              onClick={pulseOnce}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:border-white/40"
            >
              {copy.pulse}
            </button>
          </div>
          {!breath ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                {copy.opacity}
                <input
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.01}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                {copy.corona}
                <input
                  type="range"
                  min={0.2}
                  max={2.5}
                  step={0.01}
                  value={corona}
                  onChange={(e) => setCorona(Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                {copy.scale}
                <input
                  type="range"
                  min={0.5}
                  max={2.2}
                  step={0.01}
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                />
              </label>
            </div>
          ) : null}
          <p className="text-[10px] font-light tracking-wide text-white/30">
            {copy.hint}
          </p>
        </div>
      </div>
    </main>
  );
}
