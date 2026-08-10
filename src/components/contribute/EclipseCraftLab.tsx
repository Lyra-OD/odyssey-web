"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { EclipseDisc } from "@/src/components/contribute/constellation/EclipseDisc";
import { GhostStars } from "@/src/components/contribute/constellation/GhostStars";
import { NebulaGasFar } from "@/src/components/contribute/constellation/NebulaGasFar";
import {
  CRAFT_CHRONO_DURATION,
  CRAFT_CHRONO_IDLE,
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

type Locale = "fr" | "en";

/**
 * Craft lab — occultation → totalité → diamond bas → wash → ciel.
 */
export function EclipseCraftLab({ locale = "fr" }: { locale?: Locale }) {
  const tier = useVisualTier();
  const [moonScale, setMoonScale] = useState(1);
  const [sunScale, setSunScale] = useState(1);
  const [coronaAmp, setCoronaAmp] = useState(1.2);
  const [coronaSpread, setCoronaSpread] = useState(1);
  const [coronaIrregular, setCoronaIrregular] = useState(1);
  const [coronaRays, setCoronaRays] = useState(1);
  const [coronaSoft, setCoronaSoft] = useState(1);
  /** Look scrub 0–1 = timeline entière. */
  const [scrub, setScrub] = useState(0);
  const [mode, setMode] = useState<"look" | "chrono">("look");
  const [playing, setPlaying] = useState(false);
  const [chrono, setChrono] = useState<CraftChronoState>(CRAFT_CHRONO_IDLE);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef(0);

  const drive: CraftChronoState =
    mode === "look"
      ? sampleCraftChrono(scrub * CRAFT_CHRONO_DURATION)
      : chrono;

  useEffect(() => {
    skyIntroRef.active = true;
    skyIntroRef.skyMul = drive.skyMul;
    skyIntroRef.disc = drive.bodyFade;
    return () => {
      skyIntroRef.active = false;
      skyIntroRef.skyMul = 1;
      skyIntroRef.disc = 0;
    };
  }, [drive.skyMul, drive.bodyFade]);

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
    setChrono(CRAFT_CHRONO_IDLE);
    setScrub(0);
    skyIntroRef.skyMul = 0;
  };

  const playChrono = () => {
    setPlaying(false);
    setMode("chrono");
    setScrub(0);
    setChrono(CRAFT_CHRONO_SILENCE);
    requestAnimationFrame(() => setPlaying(true));
  };

  const craft = useMemo(
    () => ({
      step: 3 as const,
      showGuide: false,
      moonScale,
      sunScale,
      coronaAmp: coronaAmp * drive.coronaMul,
      coronaSpread,
      coronaIrregular,
      coronaRays,
      coronaSoft,
      diamondAmp: drive.diamondMul,
      alignment: drive.alignment,
      bodyFade: drive.bodyFade,
      progress: drive.progress,
      offsetX: 0,
      offsetY: 0,
    }),
    [
      moonScale,
      sunScale,
      coronaAmp,
      coronaSpread,
      coronaIrregular,
      coronaRays,
      coronaSoft,
      drive,
    ],
  );

  const bloomIntensity = 0.38 + drive.bloom * 0.55 + drive.diamondMul * 0.25;

  const copy =
    locale === "en"
      ? {
          title: "Eclipse craft · diamond → wash → sky",
          sub: "Totality hold · bottom diamond (logo glow) · white flood · sanctuary",
          look: "Look",
          play: "Play chrono",
          corona: "Corona intensity",
          coronaSpread: "Corona spread",
          coronaIrregular: "Corona irregularity",
          coronaRays: "Corona rays",
          coronaSoft: "Corona softness",
          progress: "Timeline scrub",
          moon: "Black hole size",
          sun: "Sun size",
          hint: "Discs & corona knobs are independent. Moon only occludes.",
        }
      : {
          title: "Craft Éclipse · diamond → wash → ciel",
          sub: "Totalité · diamond bas (glow logo) · blanc · Sanctuaire",
          look: "Look",
          play: "Lecture chrono",
          corona: "Intensité corona",
          coronaSpread: "Diffusion corona",
          coronaIrregular: "Irrégularité corona",
          coronaRays: "Rayons / streamers",
          coronaSoft: "Douceur corona",
          progress: "Scrub timeline",
          moon: "Taille trou noir",
          sun: "Taille soleil",
          hint: "Disques & corona indépendants. La lune occulte seulement.",
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
                    luminanceThreshold={0.75}
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

      {/* Wash blanc depuis le bas — ADN glow logo, pas bloom Three */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-10"
        style={{
          opacity: Math.min(1, drive.wash * 1.05),
          background: `
            radial-gradient(
              ellipse 120% 90% at 50% 92%,
              rgba(255,255,255,1) 0%,
              rgba(255,255,255,0.92) 28%,
              rgba(255,255,255,0.45) 55%,
              rgba(255,255,255,0) 78%
            ),
            rgba(255,255,255,${Math.min(1, Math.max(0, drive.wash - 0.35) * 1.4)})
          `,
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
                  value={scrub}
                  onChange={(e) => setScrub(Number(e.target.value))}
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
                {copy.coronaSpread}
                <input
                  type="range"
                  min={0.4}
                  max={2.2}
                  step={0.01}
                  value={coronaSpread}
                  onChange={(e) => setCoronaSpread(Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                {copy.coronaIrregular}
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.01}
                  value={coronaIrregular}
                  onChange={(e) => setCoronaIrregular(Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                {copy.coronaRays}
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.01}
                  value={coronaRays}
                  onChange={(e) => setCoronaRays(Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                {copy.coronaSoft}
                <input
                  type="range"
                  min={0.4}
                  max={2.2}
                  step={0.01}
                  value={coronaSoft}
                  onChange={(e) => setCoronaSoft(Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                {copy.moon}
                <input
                  type="range"
                  min={0.4}
                  max={2}
                  step={0.01}
                  value={moonScale}
                  onChange={(e) => setMoonScale(Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                {copy.sun}
                <input
                  type="range"
                  min={0.4}
                  max={2}
                  step={0.01}
                  value={sunScale}
                  onChange={(e) => setSunScale(Number(e.target.value))}
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
