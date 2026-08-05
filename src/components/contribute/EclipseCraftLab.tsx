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

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Pic diamond ring autour de u∈[peak-w, peak+w]. */
function diamondEnvelope(u: number, peak: number, width: number) {
  const d = Math.abs(u - peak) / width;
  if (d >= 1) return 0;
  return Math.pow(1 - d, 2) * (1 + 0.15 * Math.sin(u * 40));
}

type Locale = "fr" | "en";

/**
 * Lab — animation majestueuse inspirée du GIF :
 * soleil → diamond ring → totalité → respiration corona.
 */
export function EclipseCraftLab({ locale = "fr" }: { locale?: Locale }) {
  const tier = useVisualTier();
  const [eclipse, setEclipse] = useState(0);
  const [diamond, setDiamond] = useState(0);
  const [corona, setCorona] = useState(0.15);
  const [scale, setScale] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [loopBreath, setLoopBreath] = useState(false);

  // Angle type GIF (~10h30)
  const diamondAng = 2.45;

  const craft = useMemo(
    () => ({
      opacity: 1,
      coronaAmp: corona,
      scaleMul: scale,
      eclipse,
      diamond,
      diamondAng,
    }),
    [corona, scale, eclipse, diamond, diamondAng],
  );

  /**
   * Timeline ~5.5s (lent = majestueux)
   * 0.00–0.15  soleil
   * 0.15–0.55  noircit + corona monte
   * 0.48–0.62  DIAMOND RING (pic)
   * 0.62–0.85  totalité pure
   * 0.85–1.00  hold → breath
   */
  useEffect(() => {
    if (!playing) return;
    setLoopBreath(false);
    const t0 = performance.now();
    const DUR = 5500;
    let raf = 0;
    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / DUR);

      const e = smoothstep(0.12, 0.72, u);
      setEclipse(e);

      // Diamond ring juste avant la totalité complète
      const d =
        diamondEnvelope(u, 0.55, 0.09) * 1.0 +
        diamondEnvelope(u, 0.58, 0.05) * 0.35;
      setDiamond(Math.min(1, d));

      setCorona(0.12 + smoothstep(0.2, 0.75, u) * 1.2);
      setScale(1 + e * 0.03 + d * 0.04);

      if (u < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setEclipse(1);
        setDiamond(0);
        setCorona(1.2);
        setScale(1.03);
        setPlaying(false);
        setLoopBreath(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => {
    if (!loopBreath || playing) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      const w = 0.5 + 0.5 * Math.sin(t * 0.35);
      setCorona(1.05 + w * 0.28);
      setScale(1.02 + w * 0.025);
      setDiamond(0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loopBreath, playing]);

  const replay = useCallback(() => {
    setLoopBreath(false);
    setEclipse(0);
    setDiamond(0);
    setCorona(0.15);
    setScale(1);
    setPlaying(true);
  }, []);

  const copy =
    locale === "en"
      ? {
          title: "Eclipse craft",
          sub: "Majestic · sun → diamond ring → totality",
          play: "Replay",
          breath: "Corona breath",
          hint: "Dev only · GIF rhythm, Odyssey white corona",
        }
      : {
          title: "Craft Éclipse",
          sub: "Majestueux · soleil → diamond ring → totalité",
          play: "Rejouer",
          breath: "Respiration corona",
          hint: "Dev only · rythme du GIF, corona blanc Odyssey",
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
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
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
                setEclipse(1);
                setDiamond(0);
                setLoopBreath((b) => !b);
              }}
              aria-pressed={loopBreath}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:border-white/40"
            >
              {copy.breath}
              {loopBreath ? " · on" : " · off"}
            </button>
          </div>
          <p className="text-[10px] font-light tracking-wide text-white/30">
            {copy.hint}
          </p>
        </div>
      </div>
    </main>
  );
}
