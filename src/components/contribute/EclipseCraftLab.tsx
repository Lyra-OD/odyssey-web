"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";

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
 * Craft éclipse — redémarrage étape par étape.
 * Étape 1 : fond noir + disque noir (guide de contour optionnel).
 */
export function EclipseCraftLab({ locale = "fr" }: { locale?: Locale }) {
  const tier = useVisualTier();
  const [showGuide, setShowGuide] = useState(true);
  const [scaleMul, setScaleMul] = useState(1);

  const craft = useMemo(
    () =>
      ({
        step: 1 as const,
        showGuide,
        scaleMul,
      }),
    [showGuide, scaleMul],
  );

  const copy =
    locale === "en"
      ? {
          title: "Eclipse craft · step 1",
          sub: "Black disc + black ground — nothing else",
          guide: "Contour guide",
          scale: "Size",
          hint: "Validate the circle. Next: soft white corona.",
        }
      : {
          title: "Craft Éclipse · étape 1",
          sub: "Disque noir + fond noir — rien d’autre",
          guide: "Guide de contour",
          scale: "Taille",
          hint: "Valide le cercle. Ensuite : corona blanche soyeuse.",
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
              gl.setClearColor("#000000", 1);
            }}
          >
            <Suspense fallback={null}>
              <SkyThemeProvider theme={defaultSkyTheme}>
                <ForceRenderLoop />
                <color attach="background" args={["#000000"]} />
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

      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/60 px-5 py-4 backdrop-blur-md md:px-10">
        <div className="mx-auto flex max-w-md flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuide((g) => !g)}
              aria-pressed={showGuide}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:border-white/40"
            >
              {copy.guide}
              {showGuide ? " · on" : " · off"}
            </button>
          </div>
          <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
            {copy.scale}
            <input
              type="range"
              min={0.6}
              max={1.6}
              step={0.01}
              value={scaleMul}
              onChange={(e) => setScaleMul(Number(e.target.value))}
            />
          </label>
          <p className="text-[10px] font-light tracking-wide text-white/30">
            {copy.hint}
          </p>
        </div>
      </div>
    </main>
  );
}
