"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import Link from "next/link";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

import { EclipseDisc } from "@/src/components/contribute/constellation/EclipseDisc";
import {
  CRAFT_PLAY_DURATION,
  sampleCraftPlayChrono,
  type CraftChronoState,
} from "@/src/components/contribute/constellation/eclipseCraftTimeline";
import { ECLIPSE_LOGO_RECIPE } from "@/src/components/contribute/constellation/eclipseLogoRecipe";
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

type CraftBag = {
  step: 3;
  showGuide: false;
  moonScale: number;
  sunScale: number;
  coronaAmp: number;
  coronaSpread: number;
  coronaIrregular: number;
  coronaRays: number;
  coronaSoft: number;
  photonAmp: number;
  lifeAmp: number;
  diamondAmp: number;
  alignment: number;
  bodyFade: number;
  progress: number;
  offsetX: number;
  offsetY: number;
};

function applyChronoToCraft(craft: CraftBag, chrono: CraftChronoState) {
  const recipe = ECLIPSE_LOGO_RECIPE;
  craft.moonScale = recipe.moonScale;
  craft.sunScale = chrono.sunScale;
  craft.coronaAmp = recipe.coronaAmp * chrono.coronaMul;
  craft.coronaSpread = recipe.coronaSpread;
  craft.coronaIrregular = recipe.coronaIrregular * chrono.irregularMul;
  craft.coronaRays = recipe.coronaRays;
  craft.coronaSoft = recipe.coronaSoft;
  craft.photonAmp = recipe.photonAmp;
  craft.lifeAmp = recipe.lifeAmp;
  craft.diamondAmp = chrono.diamondMul;
  craft.alignment = chrono.alignment;
  craft.bodyFade = chrono.bodyFade;
  craft.progress = 0;
  craft.offsetX = recipe.offsetX;
  craft.offsetY = recipe.offsetY;
}

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

/**
 * Chrono dans le render loop R3F — pas de setState 60 fps (source du saccadé).
 */
function PlayChronoDriver({
  playingRef,
  craft,
  bloomRef,
  onEnded,
  onUiSample,
}: {
  playingRef: MutableRefObject<boolean>;
  craft: CraftBag;
  bloomRef: MutableRefObject<number>;
  onEnded: () => void;
  onUiSample: (chrono: CraftChronoState) => void;
}) {
  const elapsedRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const uiAccRef = useRef(0);

  useFrame((_, delta) => {
    const playing = playingRef.current;

    if (playing && !wasPlayingRef.current) {
      elapsedRef.current = 0;
      const chrono = sampleCraftPlayChrono(0);
      applyChronoToCraft(craft, chrono);
      bloomRef.current = 0.26 + chrono.bloom * 0.35;
      onUiSample(chrono);
    }
    wasPlayingRef.current = playing;

    if (!playing) return;

    elapsedRef.current += Math.min(delta, 0.05);
    const t = elapsedRef.current;

    if (t >= CRAFT_PLAY_DURATION) {
      const chrono = sampleCraftPlayChrono(CRAFT_PLAY_DURATION);
      applyChronoToCraft(craft, chrono);
      bloomRef.current = 0.26 + chrono.bloom * 0.35;
      playingRef.current = false;
      wasPlayingRef.current = false;
      onUiSample(chrono);
      onEnded();
      return;
    }

    const chrono = sampleCraftPlayChrono(t);
    applyChronoToCraft(craft, chrono);
    bloomRef.current = 0.26 + chrono.bloom * 0.35;

    skyIntroRef.active = true;
    skyIntroRef.skyMul = 0;
    skyIntroRef.disc = chrono.bodyFade;
    skyIntroRef.discScale = 1;

    uiAccRef.current += delta;
    if (uiAccRef.current >= 0.2) {
      uiAccRef.current = 0;
      onUiSample(chrono);
    }
  });

  return null;
}

function BloomDriver({
  bloomRef,
}: {
  bloomRef: MutableRefObject<number>;
}) {
  const [intensity, setIntensity] = useState(0.32);
  const acc = useRef(0);

  useFrame((_, delta) => {
    acc.current += delta;
    if (acc.current < 1 / 24) return;
    acc.current = 0;
    const next = bloomRef.current;
    // Lerp — pas de saut d’intensité bloom
    setIntensity((prev) => {
      const blended = prev + (next - prev) * 0.22;
      return Math.abs(prev - blended) > 0.004 ? blended : prev;
    });
  });

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={0.78}
        luminanceSmoothing={0.55}
        intensity={intensity}
        mipmapBlur
      />
    </EffectComposer>
  );
}

type Locale = "fr" | "en";

/**
 * Lecture cinéma — Phase 1 : naissance du logo.
 * Chrono fluide (useFrame) + courbes smootherstep.
 */
export function EclipseCraftPlay({ locale = "fr" }: { locale?: Locale }) {
  const tier = useVisualTier();
  const recipe = ECLIPSE_LOGO_RECIPE;
  const playingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [chrono, setChrono] = useState<CraftChronoState>(() =>
    sampleCraftPlayChrono(0),
  );

  const craftRef = useRef<CraftBag>({
    step: 3,
    showGuide: false,
    moonScale: recipe.moonScale,
    sunScale: sampleCraftPlayChrono(0).sunScale,
    coronaAmp: 0,
    coronaSpread: recipe.coronaSpread,
    coronaIrregular: 0,
    coronaRays: recipe.coronaRays,
    coronaSoft: recipe.coronaSoft,
    photonAmp: recipe.photonAmp,
    lifeAmp: recipe.lifeAmp,
    diamondAmp: 0,
    alignment: 1,
    bodyFade: 0,
    progress: 0,
    offsetX: recipe.offsetX,
    offsetY: recipe.offsetY,
  });
  const bloomRef = useRef(0.32);

  useEffect(() => {
    skyIntroRef.active = true;
    skyIntroRef.skyMul = 0;
    skyIntroRef.disc = 0;
    skyIntroRef.discScale = 1;
    applyChronoToCraft(craftRef.current, sampleCraftPlayChrono(0));
    return () => {
      skyIntroRef.active = false;
      skyIntroRef.skyMul = 1;
      skyIntroRef.disc = 0;
      skyIntroRef.discScale = 1;
    };
  }, []);

  const replay = () => {
    const zero = sampleCraftPlayChrono(0);
    applyChronoToCraft(craftRef.current, zero);
    bloomRef.current = 0.32;
    setChrono(zero);
    playingRef.current = true;
    setPlaying(true);
  };

  const atLogo =
    chrono.bodyFade > 0.92 &&
    chrono.diamondMul > LOGO_DIAMOND_ALMOST &&
    chrono.sunScale > 0.95;
  const atStart = chrono.bodyFade < 0.02;

  const copy =
    locale === "en"
      ? {
          title: "Eclipse · birth",
          sub: "Black → diamond first → sun + irregularity together → logo.",
          play: "Play",
          replay: "Replay",
          lab: "← Craft lab",
          idle: "Black — press Play",
          ended: "Living logo — replay when ready",
        }
      : {
          title: "Éclipse · naissance",
          sub: "Noir → diamond d’abord → soleil + irrégularité ensemble → logo.",
          play: "Lancer",
          replay: "Rejouer",
          lab: "← Lab craft",
          idle: "Noir — appuie sur Lancer",
          ended: "Logo vivant — rejoue quand tu veux",
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
                <PlayChronoDriver
                  playingRef={playingRef}
                  craft={craftRef.current}
                  bloomRef={bloomRef}
                  onEnded={() => setPlaying(false)}
                  onUiSample={setChrono}
                />
                <color attach="background" args={["#000000"]} />
                <EclipseDisc tier="desktop" craft={craftRef.current} />
                <BloomDriver bloomRef={bloomRef} />
              </SkyThemeProvider>
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
            {playing ? "…" : atLogo || !atStart ? copy.replay : copy.play}
          </button>
          {!playing && (
            <p className="text-[11px] font-light tracking-wide text-white/35">
              {atLogo ? copy.ended : copy.idle}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

const LOGO_DIAMOND_ALMOST = 2.4;
