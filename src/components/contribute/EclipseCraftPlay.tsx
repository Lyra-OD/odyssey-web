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

/** Caméra : naissance = grandeur (plein cadre) → dolly plus près vers diamond. */
const CAM_Z_START = 6.55;
const CAM_Z_END = 4.15;
const CAM_FOV_START = 37.2;
const CAM_FOV_END = 30.5;
const CAM_BREATH_AMP = 0.018;
const CAM_BREATH_HZ = 0.38;
/** Plane plein cadre à la naissance (déborde ensuite). */
const PLANE_REF_Z = CAM_Z_START;
const PLANE_REF_FOV = CAM_FOV_START;
const PLANE_BLEED = 1.06;
/** Direction diamond dans le shader (bas, légèrement droite). */
const DIAMOND_BEAD = { x: 0.28, y: -0.96 };
const R_MOON_UV = 0.36 * ECLIPSE_LOGO_RECIPE.moonScale;

function diamondWorldAtBirth() {
  const birthH =
    2 * Math.tan(((PLANE_REF_FOV * Math.PI) / 180) / 2) * PLANE_REF_Z;
  const half = (birthH * PLANE_BLEED) / 2;
  return {
    x: DIAMOND_BEAD.x * R_MOON_UV * half,
    y: DIAMOND_BEAD.y * R_MOON_UV * half,
  };
}

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
  perspectiveDolly: true;
  dollyEndZ: number;
  dollyEndFov: number;
  wordmarkMul: number;
  limbThreat: number;
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

  // Amortissement matière — caméra suit sa propre courbe (pas trop de lag)
  const soft = 3.2;
  const mid = 4.6;

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
  // Extinction : un peu plus réactif à la baisse (évite die-cut qui traîne)
  const wmLambda = chrono.wordmarkMul < craft.wordmarkMul ? mid * 1.55 : mid;
  craft.wordmarkMul = mix(craft.wordmarkMul, chrono.wordmarkMul, wmLambda);
  craft.limbThreat = mix(
    craft.limbThreat,
    chrono.limbThreat,
    chrono.limbThreat > craft.limbThreat ? mid * 1.25 : mid,
  );
  craft.perspectiveDolly = true;
  craft.dollyEndZ = PLANE_REF_Z;
  craft.dollyEndFov = PLANE_REF_FOV;
}

/**
 * Chrono + dolly vers diamond après naissance grandeur — zéro setState pendant le play.
 */
function PlayChronoDriver({
  playingRef,
  craft,
  bloomIntensityRef,
  onEnded,
}: {
  playingRef: MutableRefObject<boolean>;
  craft: CraftBag;
  bloomIntensityRef: MutableRefObject<number>;
  onEnded: () => void;
}) {
  const elapsedRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const pushRef = useRef(0);
  const { camera } = useThree();
  const diamond = diamondWorldAtBirth();

  const applyCamera = (
    push: number,
    hard: boolean,
    dt: number,
    elapsed: number,
  ) => {
    const cam = camera as PerspectiveCamera;
    // Un seul damp — Z et aim = même valeur (geste unique)
    const next = hard ? push : damp(pushRef.current, push, 2.6, dt);
    pushRef.current = next;

    const breath =
      CAM_BREATH_AMP *
      next *
      (1 - next * 0.7) *
      Math.sin(elapsed * Math.PI * 2 * CAM_BREATH_HZ);

    // Avance + vise le diamond ensemble (pas de pan en avance)
    cam.position.x = diamond.x * 0.34 * next + breath * 0.3;
    cam.position.y = diamond.y * 0.3 * next + breath * 0.18;
    cam.position.z = CAM_Z_START + (CAM_Z_END - CAM_Z_START) * next + breath;
    cam.lookAt(diamond.x * next, diamond.y * next, 0);

    cam.fov = CAM_FOV_START + (CAM_FOV_END - CAM_FOV_START) * next;
    cam.updateProjectionMatrix();
  };

  // Pose caméra grandeur dès le mount
  useEffect(() => {
    applyCamera(0, true, 1 / 60, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, [camera]);

  useFrame((_, delta) => {
    const dt = Math.min(Math.max(delta, 0), 1 / 30);
    const playing = playingRef.current;

    if (playing && !wasPlayingRef.current) {
      elapsedRef.current = 0;
      pushRef.current = 0;
      applyChronoToCraft(craft, sampleCraftPlayChrono(0), dt, true);
      applyCamera(0, true, dt, 0);
      bloomIntensityRef.current = 0.28;
    }
    wasPlayingRef.current = playing;

    if (!playing) {
      skyIntroRef.active = true;
      skyIntroRef.skyMul = 0;
      skyIntroRef.disc = craft.bodyFade;
      skyIntroRef.discScale = 1;
      return;
    }

    elapsedRef.current += dt;
    const t = elapsedRef.current;

    if (t >= CRAFT_PLAY_DURATION) {
      const end = sampleCraftPlayChrono(CRAFT_PLAY_DURATION);
      applyChronoToCraft(craft, end, dt, true);
      applyCamera(1, false, dt, t);
      bloomIntensityRef.current = 0.28 + 0.95 * end.bloom;
      skyIntroRef.active = true;
      skyIntroRef.skyMul = 0;
      skyIntroRef.disc = craft.bodyFade;
      skyIntroRef.discScale = 1;
      if (pushRef.current < 0.997) return;
      applyCamera(1, true, dt, t);
      playingRef.current = false;
      wasPlayingRef.current = false;
      onEnded();
      return;
    }

    const chrono = sampleCraftPlayChrono(t);
    applyChronoToCraft(craft, chrono, dt, false);
    applyCamera(chrono.cameraPush, false, dt, t);
    bloomIntensityRef.current = 0.28 + 0.95 * chrono.bloom;

    skyIntroRef.active = true;
    skyIntroRef.skyMul = 0;
    skyIntroRef.disc = craft.bodyFade;
    skyIntroRef.discScale = 1;
  });

  return null;
}

/** Bloom muté en useFrame — pas de re-render React pendant le play. */
function BloomDriver({
  intensityRef,
}: {
  intensityRef: MutableRefObject<number>;
}) {
  const bloomRef = useRef<{ intensity: number } | null>(null);
  useFrame(() => {
    if (bloomRef.current) {
      bloomRef.current.intensity = intensityRef.current;
    }
  });
  return (
    <Bloom
      ref={bloomRef as never}
      luminanceThreshold={0.8}
      luminanceSmoothing={0.6}
      intensity={0.28}
      mipmapBlur
    />
  );
}

type Locale = "fr" | "en";

/**
 * Lecture cinéma — naissance → ODYSSEY (breath) → dolly + extinction → menace.
 * always-on render + damp craft + bloom muté = fluidité.
 */
export function EclipseCraftPlay({ locale = "fr" }: { locale?: Locale }) {
  const tier = useVisualTier();
  const recipe = ECLIPSE_LOGO_RECIPE;
  const playingRef = useRef(false);
  const bloomIntensityRef = useRef(0.28);
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
    perspectiveDolly: true,
    dollyEndZ: PLANE_REF_Z,
    dollyEndFov: PLANE_REF_FOV,
    wordmarkMul: 0,
    limbThreat: 0,
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
          sub: "Act 1 birth + one class breath → hold → Act 2 dolly + light-transfer extinguish → Act 3 threat.",
          play: "Play",
          replay: "Replay",
          lab: "← Craft lab",
          idle: "Black — press Play",
          ended: "Limb threat — diamond holds the promise; flash next",
        }
      : {
          title: "Éclipse · naissance",
          sub: "Acte 1 naissance + un breath → pause → Acte 2 dolly + extinction → Acte 3 menace limbe.",
          play: "Lancer",
          replay: "Rejouer",
          lab: "← Lab craft",
          idle: "Noir — appuie sur Lancer",
          ended: "Menace limbe — le diamond porte la promesse ; flash ensuite",
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
                  bloomIntensityRef={bloomIntensityRef}
                  onEnded={() => {
                    setPlaying(false);
                    setPhase("done");
                  }}
                />
                <color attach="background" args={["#000000"]} />
                <EclipseDisc tier="desktop" craft={craftRef.current} />
                <EffectComposer multisampling={0}>
                  <BloomDriver intensityRef={bloomIntensityRef} />
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
