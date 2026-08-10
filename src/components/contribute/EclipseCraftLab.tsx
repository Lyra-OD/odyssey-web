"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { EclipseDisc } from "@/src/components/contribute/constellation/EclipseDisc";
import { GhostStars } from "@/src/components/contribute/constellation/GhostStars";
import { NebulaGasFar } from "@/src/components/contribute/constellation/NebulaGasFar";
import {
  CRAFT_CHRONO_DURATION,
  CRAFT_CHRONO_IDLE,
  CRAFT_CHRONO_SILENCE,
  poseFromSunPosition,
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
 * Craft lab — approche + pose soleil libre. Fin à reconstruire plan par plan.
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
  /** Anneau photon limbe — off par défaut pour craft pose. */
  const [photonAmp, setPhotonAmp] = useState(0);
  /** Flash / diamond vivant — pose Look (0 = off). */
  const [flashAmp, setFlashAmp] = useState(0);
  /** Look : 0 = soleil à droite, 1 = derrière le trou noir. */
  const [scrub, setScrub] = useState(0);
  const [mode, setMode] = useState<"look" | "chrono">("look");
  const [playing, setPlaying] = useState(false);
  const [chrono, setChrono] = useState<CraftChronoState>(CRAFT_CHRONO_IDLE);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef(0);

  const drive: CraftChronoState =
    mode === "look" ? poseFromSunPosition(scrub) : chrono;

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
      photonAmp,
      diamondAmp: Math.max(flashAmp, drive.diamondMul),
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
      photonAmp,
      flashAmp,
      drive,
    ],
  );

  const bloomIntensity =
    0.38 + drive.bloom * 0.55 + Math.max(flashAmp, drive.diamondMul) * 0.4;

  const copy =
    locale === "en"
      ? {
          title: "Eclipse craft · sun pose",
          sub: "Scrub moves the sun. Ending rebuilt plan by plan from your frames.",
          look: "Look",
          play: "Play approach",
          cinema: "Cinema play →",
          corona: "Corona intensity",
          coronaSpread: "Corona spread",
          coronaIrregular: "Corona irregularity",
          coronaRays: "Corona rays",
          coronaSoft: "Corona softness",
          progress: "Sun pos.",
          photon: "Photon ring",
          flash: "Flash / diamond",
          moon: "Hole size",
          sun: "Sun size",
          hint: "Readouts = exact specs. Quote values per plan when briefing.",
        }
      : {
          title: "Craft Éclipse · pose soleil",
          sub: "Le scrub bouge le soleil. Fin à reconstruire plan par plan.",
          look: "Look",
          play: "Lecture approche",
          cinema: "Lecture cinéma →",
          corona: "Intensité corona",
          coronaSpread: "Diffusion corona",
          coronaIrregular: "Irrégularité corona",
          coronaRays: "Rayons / streamers",
          coronaSoft: "Douceur corona",
          progress: "Pos. soleil",
          photon: "Anneau photon",
          flash: "Flash / diamond",
          moon: "Trou noir",
          sun: "Soleil",
          hint: "Valeurs = specs exactes. Donne-les plan par plan pour briefer.",
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
        <p className="text-xs font-light uppercase tracking-[0.28em] text-white/45 md:text-sm">
          {copy.title}
        </p>
        <p className="text-sm font-light text-white/50 md:text-base">{copy.sub}</p>
      </div>

      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/55 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={enterLook}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/75 hover:border-white/40"
            >
              {copy.look}
            </button>
            <button
              type="button"
              onClick={playChrono}
              disabled={playing}
              className="rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55 hover:border-white/30 disabled:opacity-40"
            >
              {playing ? "…" : copy.play}
            </button>
            <Link
              href={`/${locale}/contribute/test-eclipse-play`}
              className="rounded-sm border border-white/25 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/80 hover:border-white/45"
            >
              {copy.cinema}
            </Link>
            <p className="ml-auto hidden text-[11px] font-light tracking-wide text-white/30 sm:block">
              {copy.hint}
            </p>
          </div>
          {mode === "look" && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-10">
              {(
                [
                  {
                    key: "progress",
                    label: copy.progress,
                    min: 0,
                    max: 1,
                    step: 0.005,
                    value: scrub,
                    onChange: setScrub,
                  },
                  {
                    key: "corona",
                    label: copy.corona,
                    min: 0.3,
                    max: 2,
                    step: 0.01,
                    value: coronaAmp,
                    onChange: setCoronaAmp,
                  },
                  {
                    key: "spread",
                    label: copy.coronaSpread,
                    min: 0.4,
                    max: 2.2,
                    step: 0.01,
                    value: coronaSpread,
                    onChange: setCoronaSpread,
                  },
                  {
                    key: "irreg",
                    label: copy.coronaIrregular,
                    min: 0,
                    max: 2,
                    step: 0.01,
                    value: coronaIrregular,
                    onChange: setCoronaIrregular,
                  },
                  {
                    key: "rays",
                    label: copy.coronaRays,
                    min: 0,
                    max: 2,
                    step: 0.01,
                    value: coronaRays,
                    onChange: setCoronaRays,
                  },
                  {
                    key: "soft",
                    label: copy.coronaSoft,
                    min: 0.4,
                    max: 2.2,
                    step: 0.01,
                    value: coronaSoft,
                    onChange: setCoronaSoft,
                  },
                  {
                    key: "photon",
                    label: copy.photon,
                    min: 0,
                    max: 2,
                    step: 0.01,
                    value: photonAmp,
                    onChange: setPhotonAmp,
                  },
                  {
                    key: "flash",
                    label: copy.flash,
                    min: 0,
                    max: 2,
                    step: 0.01,
                    value: flashAmp,
                    onChange: setFlashAmp,
                  },
                  {
                    key: "moon",
                    label: copy.moon,
                    min: 0.4,
                    max: 2,
                    step: 0.01,
                    value: moonScale,
                    onChange: setMoonScale,
                  },
                  {
                    key: "sun",
                    label: copy.sun,
                    min: 0.4,
                    max: 2,
                    step: 0.01,
                    value: sunScale,
                    onChange: setSunScale,
                  },
                ] as const
              ).map((knob) => {
                const decimals = knob.step < 0.01 ? 3 : 2;
                const readout = knob.value.toFixed(decimals);
                return (
                  <label
                    key={knob.key}
                    className="flex min-w-0 flex-col gap-1 text-[11px] uppercase tracking-[0.12em] text-white/55"
                  >
                    <span className="flex items-baseline justify-between gap-1">
                      <span className="truncate font-medium text-white/70">
                        {knob.label}
                      </span>
                      <span className="shrink-0 font-mono text-[12px] normal-case tracking-normal text-white/90">
                        {readout}
                      </span>
                    </span>
                    <input
                      type="range"
                      className="h-2 w-full accent-white"
                      min={knob.min}
                      max={knob.max}
                      step={knob.step}
                      value={knob.value}
                      onChange={(e) => knob.onChange(Number(e.target.value))}
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
