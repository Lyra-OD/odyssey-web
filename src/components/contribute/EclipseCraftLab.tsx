"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { EclipseDisc } from "@/src/components/contribute/constellation/EclipseDisc";
import { GhostStars } from "@/src/components/contribute/constellation/GhostStars";
import { NebulaGasFar } from "@/src/components/contribute/constellation/NebulaGasFar";
import {
  CRAFT_CHRONO_DURATION,
  CRAFT_CHRONO_SILENCE,
  sampleCraftChrono,
  type CraftChronoState,
} from "@/src/components/contribute/constellation/eclipseCraftTimeline";
import { skyIntroRef } from "@/src/components/contribute/constellation/SkyIntroEclipse";
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

const LOOK_IDLE: CraftChronoState = {
  alignment: 0,
  coronaMul: 1,
  diamondMul: 0,
  bodyFade: 1,
  skyMul: 0,
  bloom: 0,
  progress: 0,
  offsetX: 0,
  offsetY: 0,
};

type Locale = "fr" | "en";

/**
 * Craft — trou noir / lentille + burn-away (avant look-dev plein écran).
 */
export function EclipseCraftLab({ locale = "fr" }: { locale?: Locale }) {
  const tier = useVisualTier();
  const [scaleMul, setScaleMul] = useState(1);
  const [coronaAmp, setCoronaAmp] = useState(1.2);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<"look" | "chrono">("look");
  const [playing, setPlaying] = useState(false);
  const [chrono, setChrono] = useState<CraftChronoState>(LOOK_IDLE);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    skyIntroRef.active = true;
    const skyFromPhase =
      mode === "look"
        ? Math.max(0, (progress - 0.88) / 0.12)
        : chrono.skyMul;
    skyIntroRef.skyMul = skyFromPhase;
    skyIntroRef.disc =
      mode === "look" ? 1 - skyFromPhase : chrono.bodyFade;
    return () => {
      skyIntroRef.active = false;
      skyIntroRef.skyMul = 1;
      skyIntroRef.disc = 0;
    };
  }, [chrono.skyMul, chrono.bodyFade, progress, mode]);

  useEffect(() => {
    if (!playing || mode !== "chrono") return;
    startRef.current = performance.now();
    const tick = (now: number) => {
      const start = startRef.current ?? now;
      const t = (now - start) / 1000;
      if (t >= CRAFT_CHRONO_DURATION) {
        setChrono(sampleCraftChrono(CRAFT_CHRONO_DURATION));
        setPlaying(false);
        startRef.current = null;
        return;
      }
      setChrono(sampleCraftChrono(t));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, mode]);

  const enterLook = () => {
    setPlaying(false);
    setMode("look");
    setChrono(LOOK_IDLE);
    setProgress(0);
    skyIntroRef.skyMul = 0;
  };

  const playChrono = () => {
    setPlaying(false);
    setMode("chrono");
    setProgress(0);
    setChrono(CRAFT_CHRONO_SILENCE);
    // Relance au prochain tick (évite race playing déjà true)
    requestAnimationFrame(() => setPlaying(true));
  };

  const craft = useMemo(
    () => {
      const phase = mode === "look" ? progress : chrono.alignment;
      const skyOut =
        mode === "look"
          ? Math.max(0, (progress - 0.9) / 0.1)
          : chrono.progress;
      return {
        step: 3 as const,
        showGuide: false,
        scaleMul,
        coronaAmp: coronaAmp * chrono.coronaMul,
        diamondAmp: chrono.diamondMul,
        alignment: phase,
        bodyFade: mode === "look" ? 1 - skyOut * 0.85 : chrono.bodyFade,
        progress: skyOut,
        offsetX: 0,
        offsetY: 0,
      };
    },
    [scaleMul, coronaAmp, chrono, mode, progress],
  );

  // Bloom très doux — le diamond ne doit plus flasher
  const bloomIntensity =
    0.42 +
    (mode === "look"
      ? 0.25 + Math.exp(-Math.pow((progress - 0.5) * 5, 2)) * 0.15
      : 0.2 + chrono.bloom * 0.35);

  const copy =
    locale === "en"
      ? {
          title: "Eclipse craft · full transit",
          sub: "Black hole fixed · sun passes behind · soft contacts",
          look: "Look",
          play: "Play chrono",
          corona: "Corona",
          progress: "Eclipse phase",
          scale: "Disc size",
          hint: "0 start · 0.5 totality · 1 exit + sky. Chrono = same path.",
        }
      : {
          title: "Craft Éclipse · transit complet",
          sub: "Trou noir fixe · soleil passe derrière · contacts doux",
          look: "Look",
          play: "Lecture chrono",
          corona: "Corona",
          progress: "Phase éclipse",
          scale: "Taille disques",
          hint: "0 départ · 0.5 totalité · 1 sortie + ciel. La chrono = même trajet.",
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
                <NebulaGasFar tier="desktop" />
                <GhostStars tier="desktop" />
                <EclipseDisc tier="desktop" craft={craft} />
                <EffectComposer multisampling={0}>
                  <Bloom
                    luminanceThreshold={0.7}
                    luminanceSmoothing={0.35}
                    intensity={bloomIntensity}
                    mipmapBlur
                  />
                </EffectComposer>
              </SkyThemeProvider>
            </Suspense>
          </Canvas>
        </div>
      </ClientWebGLGate>

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          opacity: chrono.bloom * 0.5,
          background:
            "radial-gradient(ellipse at 32% 48%, rgba(255,255,255,0.8) 0%, transparent 55%)",
        }}
      />

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
              onClick={enterLook}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:border-white/40"
            >
              {copy.look}
            </button>
            <button
              type="button"
              onClick={playChrono}
              disabled={playing}
              className="rounded-sm border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/50 hover:border-white/30 disabled:opacity-40"
            >
              {playing ? "…" : copy.play}
            </button>
          </div>
          {mode === "look" && (
            <>
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                {copy.progress}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.005}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                {copy.corona}
                <input
                  type="range"
                  min={0.3}
                  max={2}
                  step={0.01}
                  value={coronaAmp}
                  onChange={(e) => setCoronaAmp(Number(e.target.value))}
                />
              </label>
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
            </>
          )}
          <p className="text-[10px] font-light tracking-wide text-white/30">
            {copy.hint}
          </p>
        </div>
      </div>
    </main>
  );
}
