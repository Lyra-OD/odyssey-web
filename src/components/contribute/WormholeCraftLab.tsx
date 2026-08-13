"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Color, DoubleSide, ShaderMaterial } from "three";

import { ClientWebGLGate } from "@/src/components/contribute/constellation/webglGate";
// Anciens composants 2D conservés en archive — non utilisés en Phase 2
// import { WormholeCraftPlane } from "@/src/components/contribute/constellation/WormholeCraftShader";
// import { WormholeCloudLayer } from "@/src/components/contribute/constellation/WormholeCloudLayer";
import {
  WORMHOLE_RIG_DEFAULTS,
  WormholeBeam3D,
  WormholeCloud3D,
  type WormholeRigKnobs,
} from "@/src/components/contribute/constellation/WormholeRig3D";

type Locale = "fr" | "en";

const SanctuaryUniverse = dynamic(
  () =>
    import("@/src/components/contribute/SanctuaryUniverse").then(
      (m) => m.SanctuaryUniverse,
    ),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-black" />,
  },
);

// ── Phase 1 — Types + defaults ───────────────────────────────────────────────

type Phase1Knobs = {
  /** Rayon d'ouverture du cylindre cloud à la base (bas d'écran). */
  cloudRadiusBottom: number;
  /** Rayon du cône beam à la base. */
  beamRadiusBottom: number;
  /** Rayon du cône beam au sommet (0 = pointe pure). */
  beamRadiusTop: number;
  /** Distance Z de la caméra (reculer pour voir l'entièreté). */
  cameraZ: number;
  /** Hauteur Y de la caméra (en-dessous = angle dramatique). */
  cameraY: number;
  /** Fréquence de l'ondulation (nœuds de la vague par unité de hauteur). */
  waveFreq: number;
  /** Amplitude de l'ondulation (déplacement max en X/Z). */
  waveAmp: number;
  /** Vitesse d'animation de l'ondulation. */
  waveSpeed: number;
};

const PHASE1_DEFAULTS: Phase1Knobs = {
  cloudRadiusBottom: 4.8,
  beamRadiusBottom:  0.45,
  beamRadiusTop:     0.0,
  cameraZ:           9.0,
  cameraY:           -3.0,
  waveFreq:          0.45,
  waveAmp:           0.0,
  waveSpeed:         0.7,
};

// ── Shaders communs pour la validation Phase 1 ──────────────────────────────

const p1VertexShader = /* glsl */ `
uniform float uTime;
uniform float uWaveFreq;
uniform float uWaveAmp;
uniform float uWaveSpeed;

void main() {
  vec3 pos = position;

  // Ondulation serpent : sin sur X, cos déphasé sur Z → mouvement 3D
  float t   = uTime * uWaveSpeed;
  float y   = pos.y;
  pos.x += sin(y * uWaveFreq + t)            * uWaveAmp;
  pos.z += cos(y * uWaveFreq * 0.83 + t * 0.91) * uWaveAmp * 0.60;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const p1FragmentShader = /* glsl */ `
uniform vec3 uColor;
void main() {
  gl_FragColor = vec4(uColor, 1.0);
}
`;

// ── Mesh générique Phase 1 (wireframe + vertex displacement) ────────────────

function Phase1WaveMesh({
  color,
  geoArgs,
  knobs,
  segments = 48,
}: {
  color: number;
  /** [radiusTop, radiusBottom, height, radialSeg, heightSeg, openEnded] */
  geoArgs: [number, number, number, number, number, boolean];
  knobs: Phase1Knobs;
  segments?: number;
}) {
  const matRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime:      { value: 0 },
      uWaveFreq:  { value: knobs.waveFreq },
      uWaveAmp:   { value: knobs.waveAmp },
      uWaveSpeed: { value: knobs.waveSpeed },
      uColor:     { value: new Color(color) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value      = clock.elapsedTime;
    mat.uniforms.uWaveFreq.value  = knobs.waveFreq;
    mat.uniforms.uWaveAmp.value   = knobs.waveAmp;
    mat.uniforms.uWaveSpeed.value = knobs.waveSpeed;
  });

  const [rTop, rBot] = geoArgs;
  return (
    // key force le remontage quand la géométrie change (CylinderGeometry est immuable)
    <mesh key={`${rTop}-${rBot}`}>
      <cylinderGeometry args={[geoArgs[0], geoArgs[1], geoArgs[2], geoArgs[3], segments, geoArgs[5]]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={p1VertexShader}
        fragmentShader={p1FragmentShader}
        uniforms={uniforms}
        wireframe
        side={DoubleSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

// Déplace et oriente la caméra dynamiquement sans recréer le Canvas.
function CameraRig({ z, y }: { z: number; y: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, y, z);
    camera.lookAt(0, 2, 0); // regarde vers le centre-haut du pilier
  }, [camera, z, y]);
  return null;
}

// ────────────────────────────────────────────────────────────────────────────

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

function SliderGroup<T extends Record<string, number>>({
  label,
  knobs,
  set,
  defs,
}: {
  label: string;
  knobs: T;
  set: (key: keyof T, v: number) => void;
  defs: {
    key: keyof T;
    label: string;
    min: number;
    max: number;
    step: number;
  }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[9px] uppercase tracking-[0.28em] text-white/30">{label}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {defs.map((s) => (
          <label key={String(s.key)} className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">
              {s.label}
              <span className="ml-1 font-mono text-white/25">
                {(knobs[s.key] as number).toFixed(s.step < 0.01 ? 3 : 2)}
              </span>
            </span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={knobs[s.key] as number}
              onChange={(e) => set(s.key, Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

export function WormholeCraftLab({ locale = "fr" }: { locale?: Locale }) {
  const [phase, setPhase] = useState<1 | 2>(1);
  const [p1, setP1State]  = useState<Phase1Knobs>({ ...PHASE1_DEFAULTS });
  const [rig, setRigState] = useState<WormholeRigKnobs>({ ...WORMHOLE_RIG_DEFAULTS });

  const setP1  = <K extends keyof Phase1Knobs>(key: K, v: number) =>
    setP1State((prev) => ({ ...prev, [key]: v }));
  const setRig = <K extends keyof WormholeRigKnobs>(key: K, v: number) =>
    setRigState((prev) => ({ ...prev, [key]: v }));

  const [demo, setDemo] = useState(false);
  const demoRef  = useRef(false);
  const startRef = useRef(0);

  useEffect(() => {
    demoRef.current = demo;
    if (!demo) return;
    startRef.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (!demoRef.current) return;
      const u    = Math.min(1, (now - startRef.current) / 4800);
      const ease = u * u * (3 - 2 * u);
      const a    = 0.92 * (1 - Math.pow(ease, 1.25));
      setRigState((prev) => ({ ...prev, cloudAlpha: a, beamAlpha: a }));
      if (u >= 1) { setDemo(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [demo]);

  const isFr = locale !== "en";

  const phase1Defs: { key: keyof Phase1Knobs; label: string; min: number; max: number; step: number }[] = [
    { key: "cloudRadiusBottom", label: isFr ? "Rayon tunnel"    : "Tunnel radius", min: 0.5,  max: 12.0, step: 0.1  },
    { key: "beamRadiusBottom",  label: isFr ? "Rayon beam"      : "Beam radius",   min: 0.05, max: 4.0,  step: 0.05 },
    { key: "beamRadiusTop",     label: isFr ? "Pointe beam"     : "Beam tip",      min: 0.0,  max: 1.5,  step: 0.01 },
    { key: "cameraZ",           label: isFr ? "Cam Z (recul)"   : "Camera Z",      min: 3.0,  max: 25.0, step: 0.1  },
    { key: "cameraY",           label: isFr ? "Cam Y (hauteur)" : "Camera Y",      min: -8.0, max: 4.0,  step: 0.1  },
    { key: "waveFreq",          label: isFr ? "Fréquence onde"  : "Wave freq",     min: 0.05, max: 3.0,  step: 0.05 },
    { key: "waveAmp",           label: isFr ? "Amplitude onde"  : "Wave amp",      min: 0.0,  max: 2.0,  step: 0.02 },
    { key: "waveSpeed",         label: isFr ? "Vitesse onde"    : "Wave speed",    min: 0.0,  max: 3.0,  step: 0.05 },
  ];

  // Phase 2 — sliders géométrie + caméra partagés
  const rigGeoDefs: { key: keyof WormholeRigKnobs; label: string; min: number; max: number; step: number }[] = [
    { key: "cloudRadiusBottom", label: isFr ? "Rayon tunnel"    : "Tunnel radius", min: 0.5,  max: 12.0, step: 0.1  },
    { key: "beamRadiusBottom",  label: isFr ? "Rayon beam"      : "Beam radius",   min: 0.05, max: 4.0,  step: 0.05 },
    { key: "beamRadiusTop",     label: isFr ? "Pointe beam"     : "Beam tip",      min: 0.0,  max: 1.5,  step: 0.01 },
    { key: "cameraZ",           label: isFr ? "Cam Z (recul)"   : "Camera Z",      min: 3.0,  max: 25.0, step: 0.1  },
    { key: "cameraY",           label: isFr ? "Cam Y (hauteur)" : "Camera Y",      min: -8.0, max: 4.0,  step: 0.1  },
    { key: "waveFreq",          label: isFr ? "Fréq. onde"      : "Wave freq",     min: 0.05, max: 3.0,  step: 0.05 },
    { key: "waveAmp",           label: isFr ? "Amp. onde"       : "Wave amp",      min: 0.0,  max: 1.5,  step: 0.02 },
    { key: "waveSpeed",         label: isFr ? "Vit. onde"       : "Wave speed",    min: 0.0,  max: 3.0,  step: 0.05 },
  ];

  // Phase 2 — sliders matériau cloud
  const rigCloudDefs: { key: keyof WormholeRigKnobs; label: string; min: number; max: number; step: number }[] = [
    { key: "density",     label: isFr ? "Densité"       : "Density",      min: 0.5, max: 3.0,  step: 0.05  },
    { key: "contrast",    label: isFr ? "Contraste"     : "Contrast",     min: 0.0, max: 1.0,  step: 0.01  },
    { key: "lightOffset", label: isFr ? "Auto-ombre"    : "Self-shadow",  min: 0.0, max: 1.2,  step: 0.01  },
    { key: "boilSpeed",   label: isFr ? "Bouillon"      : "Boil",         min: 0.0, max: 0.5,  step: 0.005 },
    { key: "scrollSpeed", label: isFr ? "Vol (scroll)"  : "Scroll",       min: 0.0, max: 1.0,  step: 0.01  },
    { key: "cloudAlpha",  label: isFr ? "Opacité nuage" : "Cloud alpha",  min: 0.0, max: 1.0,  step: 0.01  },
    { key: "beamAlpha",   label: isFr ? "Intensité beam": "Beam alpha",   min: 0.0, max: 1.0,  step: 0.01  },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100 antialiased">
      <div className="pointer-events-none fixed inset-0 z-0">
        <SanctuaryUniverse mode="background" locale={locale} craftLite />
      </div>

      <ClientWebGLGate
        fallback={(message) => (
          <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-white/50">
            {message}
          </div>
        )}
      >
        <div className="pointer-events-none fixed inset-0 z-[1]">
          <Canvas
            className="h-full w-full !bg-transparent"
            frameloop="always"
            dpr={1}
            camera={{ position: [0, -3.0, 9.0], fov: 65, near: 0.05, far: 80 }}
            gl={{
              antialias: false,
              alpha: true,
              premultipliedAlpha: false,
              powerPreference: "high-performance",
            }}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
            }}
          >
            <Suspense fallback={null}>
              <ForceRenderLoop />
              {phase === 1 ? (
                <>
                  <CameraRig z={p1.cameraZ} y={p1.cameraY} />
                  <Phase1WaveMesh
                    color={0xff69b4}
                    geoArgs={[0.05, p1.cloudRadiusBottom, 14, 64, 48, true]}
                    knobs={p1}
                    segments={48}
                  />
                  <Phase1WaveMesh
                    color={0x00e5ff}
                    geoArgs={[p1.beamRadiusTop, p1.beamRadiusBottom, 14, 32, 32, true]}
                    knobs={p1}
                    segments={32}
                  />
                </>
              ) : (
                <>
                  <CameraRig z={rig.cameraZ} y={rig.cameraY} />
                  <WormholeCloud3D knobs={rig} />
                  <WormholeBeam3D  knobs={rig} />
                </>
              )}
            </Suspense>
          </Canvas>
        </div>
      </ClientWebGLGate>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-1 px-5 pt-6 md:px-10 md:pt-10">
        <p className="text-xs font-light uppercase tracking-[0.28em] text-white/45 md:text-sm">
          Wormhole · craft ·{" "}
          {phase === 1
            ? (isFr ? "Phase 1 — Pilier 3D" : "Phase 1 — 3D Pillar")
            : (isFr ? "Phase 2 — Shaders 2D" : "Phase 2 — 2D Shaders")}
        </p>
        <p className="max-w-xl text-sm font-light text-white/50 md:text-base">
          {phase === 1
            ? (isFr
                ? "Vue extérieure — rose = tunnel cloud, cyan = cône beam. Sculpt les cônes + ajoute l'ondulation avant Phase 2."
                : "External view — pink = cloud tunnel, cyan = beam cone. Sculpt cones + add wave before Phase 2.")
            : (isFr ? "Phase 2 : shaders Worley/FBM (ancienne architecture 2D)." : "Phase 2: Worley/FBM shaders (legacy 2D arch).")}
        </p>
      </div>

      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/60 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-3">

          {/* Boutons */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/contribute/test-eclipse-play`}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/70 hover:border-white/40"
            >
              {isFr ? "← Lecture éclipse" : "← Eclipse play"}
            </Link>
            <Link
              href={`/${locale}/contribute/test-eclipse`}
              className="rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55 hover:border-white/30"
            >
              {isFr ? "Lab éclipse" : "Eclipse lab"}
            </Link>

            <button
              type="button"
              onClick={() => setPhase((p) => (p === 1 ? 2 : 1))}
              className="rounded-sm border border-white/30 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/85 hover:border-white/55 hover:bg-white/10"
            >
              {phase === 1
                ? (isFr ? "Phase 2 → shaders" : "Phase 2 → shaders")
                : (isFr ? "Phase 1 → pilier" : "Phase 1 → pillar")}
            </button>

            {phase === 1 && (
              <button
                type="button"
                onClick={() => setP1State({ ...PHASE1_DEFAULTS })}
                className="rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55 hover:border-white/30"
              >
                Reset
              </button>
            )}

            {phase === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => setRigState({ ...WORMHOLE_RIG_DEFAULTS })}
                  className="rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55 hover:border-white/30"
                >
                  Reset
                </button>
                <button
                  type="button"
                  disabled={demo}
                  onClick={() => {
                    setRigState((p) => ({ ...p, cloudAlpha: 0.88, beamAlpha: 0.92 }));
                    setDemo(true);
                  }}
                  className="rounded-sm border border-white/25 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/80 hover:border-white/45 disabled:opacity-40"
                >
                  {demo ? "…" : (isFr ? "Décel → ciel" : "Decel → sky")}
                </button>
              </>
            )}
          </div>

          {/* Sliders Phase 1 */}
          {phase === 1 && (
            <SliderGroup
              label={isFr ? "◈ Phase 1 — Pilier + ondulation serpent" : "◈ Phase 1 — Pillar + snake wave"}
              knobs={p1}
              set={setP1}
              defs={phase1Defs}
            />
          )}

          {/* Sliders Phase 2 */}
          {phase === 2 && (
            <>
              <SliderGroup
                label={isFr ? "◈ Géométrie + Onde + Caméra" : "◈ Geometry + Wave + Camera"}
                knobs={rig}
                set={setRig}
                defs={rigGeoDefs}
              />
              <SliderGroup
                label={isFr ? "◈ Matériau — Cloud (rose) + Beam (cyan)" : "◈ Material — Cloud (rose) + Beam (cyan)"}
                knobs={rig}
                set={setRig}
                defs={rigCloudDefs}
              />
            </>
          )}

        </div>
      </div>
    </main>
  );
}
