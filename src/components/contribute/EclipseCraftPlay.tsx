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

/** Caméra : naissance = grandeur → dolly continu accéléré dans le diamond (A bis). */
const CAM_Z_START = 6.55;
/** Fin de dolly : dans le bead lumineux (pas le centre noir du disque). */
const CAM_Z_END = 1.95;
const CAM_FOV_START = 37.2;
const CAM_FOV_END = 17.8;
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

function formatPlayTime(t: number) {
  return `${t.toFixed(2)}s`;
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
  flashMul: number;
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
  const diamondLambda =
    chrono.flashMul > 0.08 && chrono.diamondMul > craft.diamondAmp
      ? mid * 2.5
      : soft;
  craft.diamondAmp = mix(craft.diamondAmp, chrono.diamondMul, diamondLambda);
  craft.alignment = chrono.alignment;
  craft.bodyFade = mix(craft.bodyFade, chrono.bodyFade, soft);
  craft.progress = 0;
  craft.offsetX = recipe.offsetX;
  craft.offsetY = recipe.offsetY;
  const wmLambda = chrono.wordmarkMul < craft.wordmarkMul ? mid * 1.55 : mid;
  craft.wordmarkMul = mix(craft.wordmarkMul, chrono.wordmarkMul, wmLambda);
  craft.limbThreat = mix(
    craft.limbThreat,
    chrono.limbThreat,
    chrono.limbThreat > craft.limbThreat ? mid * 1.25 : mid,
  );
  craft.flashMul = mix(
    craft.flashMul,
    chrono.flashMul,
    chrono.flashMul > craft.flashMul ? mid * 2.0 : mid,
  );
  craft.perspectiveDolly = true;
  craft.dollyEndZ = PLANE_REF_Z;
  craft.dollyEndFov = PLANE_REF_FOV;
}

type PlayTransport = {
  time: number;
  playing: boolean;
  /** Incrémenté à chaque seek / scrub → hard snap caméra + craft. */
  seekGen: number;
};

/**
 * Transport play/pause/scrub — zéro setState React pendant le play.
 */
function PlayChronoDriver({
  transportRef,
  craft,
  bloomIntensityRef,
  washRef,
  tunnelRef,
  bloomThresholdRef,
  onEnded,
}: {
  transportRef: MutableRefObject<PlayTransport>;
  craft: CraftBag;
  bloomIntensityRef: MutableRefObject<number>;
  washRef: MutableRefObject<number>;
  tunnelRef: MutableRefObject<number>;
  bloomThresholdRef: MutableRefObject<number>;
  onEnded: () => void;
}) {
  const pushRef = useRef(0);
  const lastSeekGenRef = useRef(-1);
  const { camera, gl } = useThree();
  const diamond = diamondWorldAtBirth();

  const applyCamera = (
    push: number,
    tunnel: number,
    hard: boolean,
    dt: number,
    elapsed: number,
  ) => {
    const cam = camera as PerspectiveCamera;
    const lambda = push > pushRef.current && push > 0.45 ? 4.2 : 3.0;
    const next = hard ? push : damp(pushRef.current, push, lambda, dt);
    pushRef.current = next;

    const breath =
      CAM_BREATH_AMP *
      next *
      (1 - next * 0.85) *
      Math.sin(elapsed * Math.PI * 2 * CAM_BREATH_HZ);

    const aim = 0.22 + 0.78 * next;
    cam.position.x = diamond.x * aim + breath * 0.28;
    cam.position.y = diamond.y * aim + breath * 0.16;
    cam.position.z =
      CAM_Z_START +
      (CAM_Z_END - CAM_Z_START) * next +
      breath -
      0.28 * tunnel;
    cam.lookAt(
      diamond.x * next * (1 - tunnel),
      diamond.y * next * (1 - tunnel),
      0,
    );

    cam.fov =
      CAM_FOV_START + (CAM_FOV_END - CAM_FOV_START) * next + 5.2 * tunnel;
    cam.updateProjectionMatrix();
  };

  useEffect(() => {
    applyCamera(0, 0, true, 1 / 60, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, [camera]);

  useFrame((_, delta) => {
    const dt = Math.min(Math.max(delta, 0), 1 / 30);
    const tr = transportRef.current;
    const seeked = tr.seekGen !== lastSeekGenRef.current;
    if (seeked) {
      lastSeekGenRef.current = tr.seekGen;
      pushRef.current = 0;
    }

    if (tr.playing) {
      tr.time = Math.min(tr.time + dt, CRAFT_PLAY_DURATION);
    }

    const t = Math.max(0, Math.min(tr.time, CRAFT_PLAY_DURATION));
    const chrono = sampleCraftPlayChrono(t);
    const hard = seeked || !tr.playing;
    applyChronoToCraft(craft, chrono, dt, hard);
    applyCamera(chrono.cameraPush, chrono.tunnelMul, hard, dt, t);
    bloomIntensityRef.current =
      0.28 + 0.55 * chrono.bloom * (1 - chrono.tunnelMul * 0.65) + 0.1 * chrono.tunnelMul;
    bloomThresholdRef.current = 0.88 - 0.04 * chrono.tunnelMul;
    washRef.current = hard
      ? chrono.wash
      : damp(washRef.current, chrono.wash, chrono.wash > washRef.current ? 8 : 5, dt);
    tunnelRef.current = hard
      ? chrono.tunnelMul
      : damp(
          tunnelRef.current,
          chrono.tunnelMul,
          chrono.tunnelMul > tunnelRef.current ? 4.5 : 3.2,
          dt,
        );

    skyIntroRef.active = true;
    skyIntroRef.skyMul = 0;
    skyIntroRef.disc = craft.bodyFade;
    skyIntroRef.discScale = 1;

    if (chrono.tunnelMul > 0.08) {
      gl.setClearColor(defaultSkyTheme.scene.background, 1);
    } else {
      gl.setClearColor("#000000", 1);
    }

    if (tr.playing && t >= CRAFT_PLAY_DURATION - 1e-4) {
      if (pushRef.current < 0.992 && chrono.tunnelMul < 0.5 && !seeked) return;
      applyCamera(1, chrono.tunnelMul, true, dt, t);
      washRef.current = chrono.wash;
      tunnelRef.current = chrono.tunnelMul;
      tr.playing = false;
      tr.time = CRAFT_PLAY_DURATION;
      onEnded();
    }
  });

  return null;
}

/** B — blanc ADN lab (radial bas + fill) ; opacity via RAF, zéro setState. */
function WhiteWashOverlay({
  washRef,
}: {
  washRef: MutableRefObject<number>;
}) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = elRef.current;
      if (el) {
        const w = washRef.current;
        el.style.opacity = String(Math.min(1, w * 1.05));
        el.style.setProperty(
          "--wash-fill",
          String(Math.min(1, Math.max(0, w - 0.35) * 1.4)),
        );
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [washRef]);

  return (
    <div
      ref={elRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-10"
      style={{
        opacity: 0,
        background: `
          radial-gradient(
            ellipse 120% 90% at 50% 92%,
            rgba(255,255,255,1) 0%,
            rgba(255,255,255,0.92) 28%,
            rgba(255,255,255,0.45) 55%,
            rgba(255,255,255,0) 78%
          ),
          rgba(255,255,255,var(--wash-fill, 0))
        `,
      }}
    />
  );
}

function BloomDriver({
  intensityRef,
  thresholdRef,
}: {
  intensityRef: MutableRefObject<number>;
  thresholdRef: MutableRefObject<number>;
}) {
  const bloomRef = useRef<{ intensity: number; luminanceThreshold: number } | null>(
    null,
  );
  useFrame(() => {
    if (bloomRef.current) {
      bloomRef.current.intensity = intensityRef.current;
      bloomRef.current.luminanceThreshold = thresholdRef.current;
    }
  });
  return (
    <Bloom
      ref={bloomRef as never}
      luminanceThreshold={0.86}
      luminanceSmoothing={0.62}
      intensity={0.28}
      mipmapBlur
    />
  );
}

type Locale = "fr" | "en";

/**
 * Lecture cinéma — A bis → B blanc → C tunnel + timeline.
 */
export function EclipseCraftPlay({ locale = "fr" }: { locale?: Locale }) {
  const tier = useVisualTier();
  const recipe = ECLIPSE_LOGO_RECIPE;
  const transportRef = useRef<PlayTransport>({
    time: 0,
    playing: false,
    seekGen: 0,
  });
  const bloomIntensityRef = useRef(0.28);
  const bloomThresholdRef = useRef(0.86);
  const washRef = useRef(0);
  const tunnelRef = useRef(0);
  const sliderRef = useRef<HTMLInputElement>(null);
  const timeLabelRef = useRef<HTMLSpanElement>(null);
  const [playing, setPlaying] = useState(false);

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
    flashMul: 0,
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

  // Sync DOM timeline sans setState (évite jank pendant le play)
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = transportRef.current.time;
      const slider = sliderRef.current;
      if (slider && document.activeElement !== slider) {
        slider.value = String(t);
      }
      if (timeLabelRef.current) {
        timeLabelRef.current.textContent = `${formatPlayTime(t)} / ${formatPlayTime(CRAFT_PLAY_DURATION)}`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const seekTo = (t: number, pause = true) => {
    const next = Math.max(0, Math.min(t, CRAFT_PLAY_DURATION));
    transportRef.current.time = next;
    transportRef.current.seekGen += 1;
    if (pause) {
      transportRef.current.playing = false;
      setPlaying(false);
    }
  };

  const togglePlay = () => {
    const tr = transportRef.current;
    if (tr.playing) {
      tr.playing = false;
      setPlaying(false);
      return;
    }
    if (tr.time >= CRAFT_PLAY_DURATION - 1e-3) {
      tr.time = 0;
      tr.seekGen += 1;
    }
    tr.playing = true;
    setPlaying(true);
  };

  const restart = () => {
    seekTo(0, false);
    transportRef.current.playing = true;
    setPlaying(true);
  };

  const copy =
    locale === "en"
      ? {
          title: "Eclipse · birth",
          sub: "A→B locked. Wormhole C crafts on /test-wormhole (Quiet Luxury warp).",
          play: "Play",
          pause: "Pause",
          restart: "Restart",
          lab: "← Craft lab",
          wormhole: "Wormhole craft →",
        }
      : {
          title: "Éclipse · naissance",
          sub: "A→B figés. Wormhole C se craft sur /test-wormhole (warp Quiet Luxury).",
          play: "Lecture",
          pause: "Pause",
          restart: "Reprise",
          lab: "← Lab craft",
          wormhole: "Craft wormhole →",
        };

  const labHref = `/${locale}/contribute/test-eclipse`;
  const wormholeHref = `/${locale}/contribute/test-wormhole`;

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
                  transportRef={transportRef}
                  craft={craftRef.current}
                  bloomIntensityRef={bloomIntensityRef}
                  washRef={washRef}
                  tunnelRef={tunnelRef}
                  bloomThresholdRef={bloomThresholdRef}
                  onEnded={() => {
                    setPlaying(false);
                  }}
                />
                <color attach="background" args={["#000000"]} />
                <EclipseDisc tier="desktop" craft={craftRef.current} />
                <EffectComposer multisampling={0}>
                  <BloomDriver
                    intensityRef={bloomIntensityRef}
                    thresholdRef={bloomThresholdRef}
                  />
                </EffectComposer>
              </SkyThemeProvider>
            </Suspense>
          </Canvas>
        </div>
      </ClientWebGLGate>

      <WhiteWashOverlay washRef={washRef} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-1 px-5 pt-6 md:px-10 md:pt-10">
        <p className="text-xs font-light uppercase tracking-[0.28em] text-white/45 md:text-sm">
          {copy.title}
        </p>
        <p className="max-w-xl text-sm font-light text-white/50 md:text-base">
          {copy.sub}
        </p>
      </div>

      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/55 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={labHref}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/70 hover:border-white/40"
            >
              {copy.lab}
            </Link>
            <Link
              href={wormholeHref}
              className="rounded-sm border border-white/25 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/80 hover:border-white/45"
            >
              {copy.wormhole}
            </Link>
            <button
              type="button"
              onClick={togglePlay}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/75 hover:border-white/40"
            >
              {playing ? copy.pause : copy.play}
            </button>
            <button
              type="button"
              onClick={restart}
              className="rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55 hover:border-white/30"
            >
              {copy.restart}
            </button>
            <span
              ref={timeLabelRef}
              className="ml-auto font-mono text-[11px] tracking-wide text-white/40"
            >
              {formatPlayTime(0)} / {formatPlayTime(CRAFT_PLAY_DURATION)}
            </span>
          </div>
          <label className="flex items-center gap-3">
            <span className="sr-only">Timeline</span>
            <input
              ref={sliderRef}
              type="range"
              min={0}
              max={CRAFT_PLAY_DURATION}
              step={0.01}
              defaultValue={0}
              onPointerDown={() => {
                transportRef.current.playing = false;
                setPlaying(false);
              }}
              onInput={(e) => {
                seekTo(Number((e.target as HTMLInputElement).value), true);
              }}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
            />
          </label>
        </div>
      </div>
    </main>
  );
}
