"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

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

type Locale = "fr" | "en";

/**
 * Lab craft — éclipse seule, fond noir.
 * Pas d’intro Sanctuaire ici : on cherche la forme digne (logo + future intro).
 */
export function EclipseCraftLab({ locale = "fr" }: { locale?: Locale }) {
  const tier = useVisualTier();
  const [opacity, setOpacity] = useState(1);
  const [corona, setCorona] = useState(1.15);
  const [scale, setScale] = useState(1);
  const [breath, setBreath] = useState(true);

  const craft = useMemo(
    () => ({
      opacity,
      coronaAmp: corona,
      scaleMul: scale,
    }),
    [opacity, corona, scale],
  );

  useEffect(() => {
    if (!breath) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      const w = 0.5 + 0.5 * Math.sin(t * 0.55);
      setOpacity(0.88 + w * 0.12);
      setCorona(0.95 + w * 0.35);
      setScale(0.96 + w * 0.08);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [breath]);

  const pulseOnce = useCallback(() => {
    setBreath(false);
    setOpacity(0.35);
    setCorona(0.5);
    setScale(0.92);
    window.setTimeout(() => {
      setOpacity(1);
      setCorona(1.55);
      setScale(1.12);
    }, 140);
    window.setTimeout(() => {
      setOpacity(1);
      setCorona(1.15);
      setScale(1);
    }, 850);
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
    <main className="relative min-h-screen overflow-hidden bg-[#07080f] text-zinc-100 antialiased">
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
            style={{ width: "100%", height: "100%" }}
            frameloop="demand"
            dpr={tierDpr(tier)}
            camera={{ position: [0, 0, 8], fov: 42, near: 0.1, far: 40 }}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: "high-performance",
              preserveDrawingBuffer: true,
            }}
            onCreated={({ gl }) => {
              gl.setClearColor("#07080f", 1);
            }}
          >
            <Suspense fallback={null}>
              <SkyThemeProvider theme={defaultSkyTheme}>
                <ForceRenderLoop />
                <color attach="background" args={["#07080f"]} />
                <EclipseDisc tier="desktop" craft={craft} />
              </SkyThemeProvider>
            </Suspense>
          </Canvas>
        </div>
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
