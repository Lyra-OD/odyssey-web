"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { EclipseDisc } from "@/src/components/contribute/constellation/EclipseDisc";
import { GhostStars } from "@/src/components/contribute/constellation/GhostStars";
import { NebulaGasFar } from "@/src/components/contribute/constellation/NebulaGasFar";
import {
  CRAFT_PLAY_DURATION,
  sampleCraftPlayChrono,
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
 * Lecture cinéma — page séparée du lab Look.
 * Démarre figée sur le plan d’ouverture (soleil à droite), puis play.
 */
export function EclipseCraftPlay({ locale = "fr" }: { locale?: Locale }) {
  const tier = useVisualTier();
  /** Figé sur le plan 1 au chargement — l’anim ne part pas toute seule. */
  const [playing, setPlaying] = useState(false);
  const [chrono, setChrono] = useState<CraftChronoState>(() =>
    sampleCraftPlayChrono(0),
  );
  const startRef = useRef<number | null>(null);
  const rafRef = useRef(0);

  // Recette plan d’ouverture — soleil soft à droite (pas trop gros)
  const moonScale = 1.0;
  const sunScale = 1.05;
  const coronaAmp = 0.55;
  const coronaSpread = 0.75;
  const coronaIrregularBase = 0.35;
  const coronaRays = 0.4;
  const coronaSoft = 0.85;
  const photonAmp = 0;

  useEffect(() => {
    skyIntroRef.active = true;
    skyIntroRef.skyMul = chrono.skyMul;
    skyIntroRef.disc = chrono.bodyFade;
    return () => {
      skyIntroRef.active = false;
      skyIntroRef.skyMul = 1;
      skyIntroRef.disc = 0;
    };
  }, [chrono.skyMul, chrono.bodyFade]);

  useEffect(() => {
    if (!playing) return;
    startRef.current = performance.now();
    const tick = (now: number) => {
      const start = startRef.current ?? now;
      const t = (now - start) / 1000;
      if (t >= CRAFT_PLAY_DURATION) {
        setChrono(sampleCraftPlayChrono(CRAFT_PLAY_DURATION));
        setPlaying(false);
        startRef.current = null;
        return;
      }
      setChrono(sampleCraftPlayChrono(t));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  const replay = () => {
    setPlaying(false);
    setChrono(sampleCraftPlayChrono(0));
    requestAnimationFrame(() => setPlaying(true));
  };

  const craft = useMemo(
    () => ({
      step: 3 as const,
      showGuide: false,
      moonScale,
      sunScale,
      coronaAmp: coronaAmp * chrono.coronaMul,
      coronaSpread,
      coronaIrregular: coronaIrregularBase * chrono.irregularMul,
      coronaRays,
      coronaSoft,
      photonAmp,
      diamondAmp: chrono.diamondMul,
      alignment: chrono.alignment,
      bodyFade: chrono.bodyFade,
      progress: chrono.progress,
      offsetX: 0,
      offsetY: 0,
    }),
    [chrono],
  );

  const bloomIntensity = 0.42 + chrono.bloom * 0.7 + chrono.diamondMul * 0.35;

  const copy =
    locale === "en"
      ? {
          title: "Eclipse · play",
          sub: "Opens on the right-hand sun shot, then approach → flash → hold.",
          play: "Play",
          replay: "Replay",
          lab: "← Craft lab",
          idle: "Opening frame — press Play",
          ended: "Ended — replay when ready",
        }
      : {
          title: "Éclipse · lecture",
          sub: "Ouvre sur le plan soleil à droite, puis approche → flash → hold.",
          play: "Lancer",
          replay: "Rejouer",
          lab: "← Lab craft",
          idle: "Plan d’ouverture — appuie sur Lancer",
          ended: "Fin — rejoue quand tu veux",
        };

  const labHref = `/${locale}/contribute/test-eclipse`;

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

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-1 px-5 pt-6 md:px-10 md:pt-10">
        <p className="text-xs font-light uppercase tracking-[0.28em] text-white/45 md:text-sm">
          {copy.title}
        </p>
        <p className="text-sm font-light text-white/50 md:text-base">{copy.sub}</p>
      </div>

      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/50 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3">
          <Link
            href={labHref}
            className="rounded-sm border border-white/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/70 hover:border-white/40"
          >
            {copy.lab}
          </Link>
          <button
            type="button"
            onClick={replay}
            disabled={playing}
            className="rounded-sm border border-white/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/75 hover:border-white/40 disabled:opacity-40"
          >
            {playing ? "…" : chrono.alignment > 0.02 ? copy.replay : copy.play}
          </button>
          {!playing && (
            <p className="text-[11px] font-light tracking-wide text-white/35">
              {chrono.alignment > 0.02 ? copy.ended : copy.idle}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
