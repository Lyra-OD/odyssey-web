"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

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

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

type Locale = "fr" | "en";

/**
 * Lab craft — éclipse seule.
 * Anim clé : soleil brillant → totalité (le soleil devient noir + corona).
 */
export function EclipseCraftLab({ locale = "fr" }: { locale?: Locale }) {
  const tier = useVisualTier();
  const [eclipse, setEclipse] = useState(0);
  const [corona, setCorona] = useState(0.2);
  const [scale, setScale] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [loopBreath, setLoopBreath] = useState(false);
  const playRef = useRef({ t0: 0, active: true });

  const craft = useMemo(
    () => ({
      opacity: 1,
      coronaAmp: corona,
      scaleMul: scale,
      eclipse,
    }),
    [corona, scale, eclipse],
  );

  // Lecture soleil → totalité (~3.2s) puis respiration corona
  useEffect(() => {
    if (!playing) return;
    playRef.current = { t0: performance.now(), active: true };
    setLoopBreath(false);
    let raf = 0;
    const DUR = 3200;
    const tick = (now: number) => {
      const age = now - playRef.current.t0;
      const u = Math.min(1, age / DUR);
      // Soleil tient un instant, puis noircit ; corona monte avec
      const e = smoothstep(0.12, 0.82, u);
      setEclipse(e);
      setCorona(0.15 + e * 1.15);
      setScale(1 + e * 0.04);
      if (u < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setEclipse(1);
        setCorona(1.25);
        setPlaying(false);
        setLoopBreath(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  // Respiration corona en totalité
  useEffect(() => {
    if (!loopBreath || playing) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      const w = 0.5 + 0.5 * Math.sin(t * 0.45);
      setCorona(1.05 + w * 0.35);
      setScale(1.02 + w * 0.03);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loopBreath, playing]);

  const replay = useCallback(() => {
    setLoopBreath(false);
    setEclipse(0);
    setCorona(0.2);
    setScale(1);
    setPlaying(true);
  }, []);

  const copy =
    locale === "en"
      ? {
          title: "Eclipse craft",
          sub: "Sun becomes black — mark for intro / logo",
          play: "Replay sun → black",
          breath: "Corona breath",
          eclipse: "Eclipse",
          corona: "Corona",
          hint: "Dev only · match totality photo, then wire sanctuary intro",
        }
      : {
          title: "Craft Éclipse",
          sub: "Le soleil devient noir — marque intro / logo",
          play: "Rejouer soleil → noir",
          breath: "Respiration corona",
          eclipse: "Éclipse",
          corona: "Corona",
          hint: "Dev only · viser la photo de totalité, puis brancher l’intro",
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
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={replay}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:border-white/40"
            >
              {copy.play}
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setLoopBreath((b) => !b);
                setEclipse(1);
              }}
              aria-pressed={loopBreath}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:border-white/40"
            >
              {copy.breath}
              {loopBreath ? " · on" : " · off"}
            </button>
          </div>
          {!playing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                {copy.eclipse}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={eclipse}
                  onChange={(e) => {
                    setLoopBreath(false);
                    setEclipse(Number(e.target.value));
                    setCorona(0.15 + Number(e.target.value) * 1.15);
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                {copy.corona}
                <input
                  type="range"
                  min={0.2}
                  max={2.2}
                  step={0.01}
                  value={corona}
                  onChange={(e) => setCorona(Number(e.target.value))}
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
