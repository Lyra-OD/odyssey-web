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
import type { PerspectiveCamera } from "three";

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

/** Caméra play — plan large → push-in une fois le diamond visible. */
const CAM_Z_START = 8.7;
const CAM_Z_END = 7.45;
const CAM_FOV_START = 44;
const CAM_FOV_END = 40.4;

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

/** Exp damp — lisse toute micro-saccade de courbe / frame. */
function damp(current: number, target: number, lambda: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function applyChronoToCraft(
  craft: CraftBag,
  chrono: CraftChronoState,
  dt: number,
  hard = false,
) {
  const recipe = ECLIPSE_LOGO_RECIPE;
  const mix = (cur: number, target: number, lambda: number) =>
    hard ? target : damp(cur, target, lambda, dt);

  // Amortissement un peu plus feutré pour coller au tempo ralenti
  const soft = 3.4;
  const mid = 5.2;

  craft.moonScale = recipe.moonScale;
  craft.sunScale = mix(craft.sunScale, chrono.sunScale, mid);
  craft.coronaAmp = mix(
    craft.coronaAmp,
    recipe.coronaAmp * chrono.coronaMul,
    mid,
  );
  craft.coronaSpread = recipe.coronaSpread;
  craft.coronaIrregular = mix(
    craft.coronaIrregular,
    recipe.coronaIrregular * chrono.irregularMul,
    soft,
  );
  craft.coronaRays = recipe.coronaRays;
  craft.coronaSoft = recipe.coronaSoft;
  craft.photonAmp = recipe.photonAmp;
  craft.lifeAmp = mix(craft.lifeAmp, recipe.lifeAmp * chrono.lifeMul, soft);
  craft.diamondAmp = mix(craft.diamondAmp, chrono.diamondMul, soft);
  craft.alignment = chrono.alignment;
  craft.bodyFade = mix(craft.bodyFade, chrono.bodyFade, soft);
  craft.progress = 0;
  craft.offsetX = recipe.offsetX;
  craft.offsetY = recipe.offsetY;
}

/**
 * Chrono + amortissement + micro push caméra — zéro setState pendant le play.
 */
function PlayChronoDriver({
  playingRef,
  craft,
  onEnded,
}: {
  playingRef: MutableRefObject<boolean>;
  craft: CraftBag;
  onEnded: () => void;
}) {
  const elapsedRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const pushRef = useRef(0);
  const { camera } = useThree();

  const applyCamera = (push: number, hard: boolean, dt: number) => {
    const cam = camera as PerspectiveCamera;
    const nextPush = hard ? push : damp(pushRef.current, push, 2.4, dt);
    pushRef.current = nextPush;
    cam.position.z = CAM_Z_START + (CAM_Z_END - CAM_Z_START) * nextPush;
    cam.fov = CAM_FOV_START + (CAM_FOV_END - CAM_FOV_START) * nextPush;
    cam.updateProjectionMatrix();
  };

  useFrame((_, delta) => {
    const dt = Math.min(Math.max(delta, 0), 1 / 30);
    const playing = playingRef.current;

    if (playing && !wasPlayingRef.current) {
      elapsedRef.current = 0;
      pushRef.current = 0;
      applyChronoToCraft(craft, sampleCraftPlayChrono(0), dt, true);
      applyCamera(0, true, dt);
    }
    wasPlayingRef.current = playing;

    if (!playing) {
      skyIntroRef.active = true;
      skyIntroRef.skyMul = 0;
      skyIntroRef.disc = craft.bodyFade;
      skyIntroRef.discScale = 1;
      // Idle / done : reste sur la pose caméra actuelle (pas de reset brutal)
      return;
    }

    elapsedRef.current += dt;
    const t = elapsedRef.current;

    if (t >= CRAFT_PLAY_DURATION) {
      const end = sampleCraftPlayChrono(CRAFT_PLAY_DURATION);
      applyChronoToCraft(craft, end, dt, true);
      applyCamera(end.cameraPush, true, dt);
      playingRef.current = false;
      wasPlayingRef.current = false;
      skyIntroRef.active = true;
      skyIntroRef.skyMul = 0;
      skyIntroRef.disc = craft.bodyFade;
      skyIntroRef.discScale = 1;
      onEnded();
      return;
    }

    const chrono = sampleCraftPlayChrono(t);
    applyChronoToCraft(craft, chrono, dt, false);
    applyCamera(chrono.cameraPush, false, dt);

    skyIntroRef.active = true;
    skyIntroRef.skyMul = 0;
    skyIntroRef.disc = craft.bodyFade;
    skyIntroRef.discScale = 1;
  });

  return null;
}

type Locale = "fr" | "en";

/**
 * Lecture cinéma — Phase 1 : naissance du logo.
 * always-on render + damp craft + bloom fixe = fluidité.
 */
export function EclipseCraftPlay({ locale = "fr" }: { locale?: Locale }) {
  const tier = useVisualTier();
  const recipe = ECLIPSE_LOGO_RECIPE;
  const playingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");

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
    lifeAmp: 0,
    diamondAmp: 0,
    alignment: 1,
    bodyFade: 0,
    progress: 0,
    offsetX: recipe.offsetX,
    offsetY: recipe.offsetY,
  });

  useEffect(() => {
    skyIntroRef.active = true;
    skyIntroRef.skyMul = 0;
    skyIntroRef.disc = 0;
    skyIntroRef.discScale = 1;
    applyChronoToCraft(
      craftRef.current,
      sampleCraftPlayChrono(0),
      1 / 60,
      true,
    );
    return () => {
      skyIntroRef.active = false;
      skyIntroRef.skyMul = 1;
      skyIntroRef.disc = 0;
      skyIntroRef.discScale = 1;
    };
  }, []);

  const replay = () => {
    applyChronoToCraft(
      craftRef.current,
      sampleCraftPlayChrono(0),
      1 / 60,
      true,
    );
    playingRef.current = true;
    setPlaying(true);
    setPhase("playing");
  };

  const copy =
    locale === "en"
      ? {
          title: "Eclipse · birth",
          sub: "Black → diamond reveal + slow push-in → sun + irregularity → logo.",
          play: "Play",
          replay: "Replay",
          lab: "← Craft lab",
          idle: "Black — press Play",
          ended: "Living logo — replay when ready",
        }
      : {
          title: "Éclipse · naissance",
          sub: "Noir → révélation diamond + push caméra → soleil + irrég → logo.",
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
            frameloop="always"
            dpr={tierDpr(tier)}
            camera={{
              position: [0, 0, CAM_Z_START],
              fov: CAM_FOV_START,
              near: 0.1,
              far: 40,
            }}
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
                <PlayChronoDriver
                  playingRef={playingRef}
                  craft={craftRef.current}
                  onEnded={() => {
                    setPlaying(false);
                    setPhase("done");
                  }}
                />
                <color attach="background" args={["#000000"]} />
                <EclipseDisc tier="desktop" craft={craftRef.current} />
                <EffectComposer multisampling={0}>
                  <Bloom
                    luminanceThreshold={0.8}
                    luminanceSmoothing={0.6}
                    intensity={0.4}
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
            {playing ? "…" : phase === "done" ? copy.replay : copy.play}
          </button>
          {!playing && (
            <p className="text-[11px] font-light tracking-wide text-white/35">
              {phase === "done" ? copy.ended : copy.idle}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
