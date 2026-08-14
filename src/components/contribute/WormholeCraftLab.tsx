"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Color, DoubleSide, ShaderMaterial } from "three";

import { ClientWebGLGate } from "@/src/components/contribute/constellation/webglGate";
import {
  BEAM_DEFAULTS,
  CAMERA_DEFAULTS,
  CLOUD_DEFAULTS,
  WormholeBeam3D,
  WormholeCloud3D,
  type BeamKnobs,
  type CameraKnobs,
  type CloudKnobs,
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

/** Knobs d'un pilier — indépendant de l'autre. */
type P1Pillar = {
  radiusBottom: number;
  radiusTop:    number;
  /** Force du coude (0 = droit). */
  bendAmp:   number;
  /** Direction du coude dans le plan XZ — 0 à 6.28 rad (tourne le penchement).
   *  0 = penche vers +X, PI/2 = vers +Z, PI = vers -X, etc. */
  bendAngle: number;
  /** Vitesse de rotation du coude (0 = figé sur bendAngle). */
  bendSpeed: number;
  /** Position X dans la scène (décaler le pilier gauche/droite). */
  posX: number;
  /** Position Y dans la scène (monter/descendre le pilier). */
  posY: number;
  /** Position Z dans la scène (décaler avant/arrière). */
  posZ: number;
  /** Hauteur du pilier en unités world. */
  height: number;
};

/** Caméra globale partagée par les deux piliers. */
type P1Cam = { z: number; y: number };

const P1_ROSE_DEFAULTS: P1Pillar = {
  radiusBottom: 4.8, radiusTop: 0.05,
  bendAmp: 0.0, bendAngle: 0.0, bendSpeed: 0.0,
  posX: 0.0, posY: 0.0, posZ: 0.0, height: 14,
};
const P1_CYAN_DEFAULTS: P1Pillar = {
  radiusBottom: 0.45, radiusTop: 0.0,
  bendAmp: 0.0, bendAngle: 0.0, bendSpeed: 0.0,
  posX: 0.0, posY: 0.0, posZ: 0.0, height: 14,
};
const P1_CAM_DEFAULTS: P1Cam = { z: 9.0, y: -3.0 };

// Alias de compatibilité pour les signatures restantes
type Phase1Knobs = P1Pillar;
const PHASE1_DEFAULTS = P1_ROSE_DEFAULTS;

// ── Shaders communs pour la validation Phase 1 ──────────────────────────────

const p1VertexShader = /* glsl */ `
uniform float uTime;
uniform float uBendAmp;
uniform float uBendAngle; // direction du coude dans XZ (0–2PI)
uniform float uBendSpeed; // vitesse de rotation du coude (0 = figé)
uniform float uHalfH;     // demi-hauteur du cylindre (height / 2)

void main() {
  vec3 pos = position;

  // Enveloppe : 0 aux extrémités, 1 au centre — coude ancré à chaque bout
  float nY  = clamp((pos.y + uHalfH) / (2.0 * uHalfH), 0.0, 1.0);
  float env = sin(nY * 3.14159);

  // Direction du coude dans le plan XZ
  float angle = uBendAngle + uTime * uBendSpeed;
  pos.x += cos(angle) * uBendAmp * env;
  pos.z += sin(angle) * uBendAmp * env;

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
  pillar,
  dim = false,
}: {
  color: number;
  pillar: P1Pillar;
  dim?: boolean;
}) {
  const matRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime:       { value: 0 },
      uBendAmp:    { value: pillar.bendAmp },
      uBendAngle:  { value: pillar.bendAngle },
      uBendSpeed:  { value: pillar.bendSpeed },
      uHalfH:      { value: pillar.height / 2 },
      uColor:      { value: new Color(color) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value      = clock.elapsedTime;
    mat.uniforms.uBendAmp.value   = pillar.bendAmp;
    mat.uniforms.uBendAngle.value = pillar.bendAngle;
    mat.uniforms.uBendSpeed.value = pillar.bendSpeed;
    mat.uniforms.uHalfH.value     = pillar.height / 2;
  });

  return (
    <mesh
      key={`${pillar.radiusBottom}-${pillar.radiusTop}-${pillar.height}`}
      position={[pillar.posX, pillar.posY, pillar.posZ]}
    >
      <cylinderGeometry args={[pillar.radiusTop, pillar.radiusBottom, pillar.height, 64, 48, true]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={p1VertexShader}
        fragmentShader={p1FragmentShader}
        uniforms={uniforms}
        wireframe
        side={DoubleSide}
        depthWrite={false}
        toneMapped={false}
        transparent
        opacity={dim ? 0.25 : 1.0}
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
  const [phase,    setPhase]    = useState<1 | 2>(1);
  // Phase 1 — piliers indépendants + caméra globale partagée
  const [p1Active, setP1Active] = useState<1 | 2 | 3>(1); // 1=rose 2=cyan 3=cam
  const [p1Rose,   setP1Rose]   = useState<P1Pillar>({ ...P1_ROSE_DEFAULTS });
  const [p1Cyan,   setP1Cyan]   = useState<P1Pillar>({ ...P1_CYAN_DEFAULTS });
  const [p1Cam,    setP1CamSt]  = useState<P1Cam>({ ...P1_CAM_DEFAULTS });
  // Phase 2 — shaders 3D
  const [cam,   setCamState]   = useState<CameraKnobs>({ ...CAMERA_DEFAULTS });
  const [cloud, setCloudState] = useState<CloudKnobs>({ ...CLOUD_DEFAULTS });
  const [beam,  setBeamState]  = useState<BeamKnobs>({ ...BEAM_DEFAULTS });

  const setRose  = <K extends keyof P1Pillar>(k: K, v: number) => setP1Rose(p => ({ ...p, [k]: v }));
  const setCyan  = <K extends keyof P1Pillar>(k: K, v: number) => setP1Cyan(p => ({ ...p, [k]: v }));
  const setP1Cam = <K extends keyof P1Cam>(k: K, v: number)    => setP1CamSt(p => ({ ...p, [k]: v }));
  const setCam   = <K extends keyof CameraKnobs>(k: K, v: number) => setCamState(p => ({ ...p, [k]: v }));
  const setCloud = <K extends keyof CloudKnobs>(k: K, v: number) => setCloudState(p => ({ ...p, [k]: v }));
  const setBeam  = <K extends keyof BeamKnobs>(k: K, v: number) => setBeamState(p => ({ ...p, [k]: v }));

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
      setCloudState(p => ({ ...p, alpha: a }));
      setBeamState(p => ({ ...p, alpha: a }));
      if (u >= 1) { setDemo(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [demo]);

  const isFr = locale !== "en";

  // Phase 1 — sliders d'un pilier (géométrie + coude + position)
  const p1PillarDefs: { key: keyof P1Pillar; label: string; min: number; max: number; step: number }[] = [
    { key: "radiusBottom", label: isFr ? "Rayon bas"          : "Radius bot",       min: 0.0,  max: 12.0, step: 0.05 },
    { key: "radiusTop",    label: isFr ? "Rayon haut"         : "Radius top",       min: 0.0,  max: 4.0,  step: 0.01 },
    { key: "bendAmp",      label: isFr ? "Coude (force)"      : "Bend strength",    min: 0.0,  max: 4.0,  step: 0.02 },
    { key: "bendAngle",    label: isFr ? "Coude (direction)"  : "Bend direction",   min: 0.0,  max: 6.28, step: 0.02 },
    { key: "bendSpeed",    label: isFr ? "Coude (0=figé)"     : "Bend rot speed",   min: 0.0,  max: 2.0,  step: 0.02 },
    { key: "posX",         label: isFr ? "Position X"         : "Position X",       min: -8.0, max: 8.0,  step: 0.1  },
    { key: "posY",         label: isFr ? "Position Y (haut/bas)" : "Position Y",    min: -8.0, max: 8.0,  step: 0.1  },
    { key: "posZ",         label: isFr ? "Position Z"         : "Position Z",       min: -8.0, max: 8.0,  step: 0.1  },
    { key: "height",       label: isFr ? "Longueur du pilier" : "Pillar length",    min: 2.0,  max: 40.0, step: 0.5  },
  ];

  // Phase 1 — sliders caméra (globaux, bougent les 2 piliers ensemble)
  const p1CamDefs: { key: keyof P1Cam; label: string; min: number; max: number; step: number }[] = [
    { key: "z", label: isFr ? "Cam Z (recul)"   : "Camera Z", min: 3.0,  max: 25.0, step: 0.1 },
    { key: "y", label: isFr ? "Cam Y (hauteur)" : "Camera Y", min: -8.0, max: 4.0,  step: 0.1 },
  ];

  // Phase 2 — sliders caméra
  const camDefs: { key: keyof CameraKnobs; label: string; min: number; max: number; step: number }[] = [
    { key: "z", label: isFr ? "Cam Z (recul)"   : "Camera Z", min: 3.0,  max: 30.0, step: 0.1 },
    { key: "y", label: isFr ? "Cam Y (hauteur)" : "Camera Y", min: -10.0, max: 5.0, step: 0.1 },
  ];

  // Phase 2 — sliders cloud (géo + onde)
  const cloudGeoDefs: { key: keyof CloudKnobs; label: string; min: number; max: number; step: number }[] = [
    { key: "radiusBottom", label: isFr ? "Rayon bas"     : "Radius bot",   min: 0.5,  max: 14.0, step: 0.1  },
    { key: "radiusTop",    label: isFr ? "Rayon haut"    : "Radius top",   min: 0.0,  max: 4.0,  step: 0.05 },
    { key: "waveAmp",      label: isFr ? "Amplitude"     : "Wave amp",     min: 0.0,  max: 2.0,  step: 0.02 },
    { key: "waveFreq",     label: isFr ? "Fréquence"     : "Wave freq",    min: 0.05, max: 4.0,  step: 0.05 },
    { key: "waveSpeed",    label: isFr ? "Vitesse"       : "Wave speed",   min: 0.0,  max: 4.0,  step: 0.05 },
    { key: "waveMode",     label: isFr ? "Mode (0=lat 1=rad)" : "Mode (0=lat 1=rad)", min: 0, max: 1, step: 0.01 },
  ];

  // Phase 2 — sliders cloud (matériau)
  const cloudMatDefs: { key: keyof CloudKnobs; label: string; min: number; max: number; step: number }[] = [
    { key: "density",     label: isFr ? "Densité"     : "Density",     min: 0.5, max: 3.0,  step: 0.05  },
    { key: "contrast",    label: isFr ? "Contraste"   : "Contrast",    min: 0.0, max: 1.0,  step: 0.01  },
    { key: "lightOffset", label: isFr ? "Auto-ombre"  : "Self-shadow", min: 0.0, max: 1.5,  step: 0.01  },
    { key: "boilSpeed",   label: isFr ? "Bouillon"    : "Boil",        min: 0.0, max: 0.6,  step: 0.005 },
    { key: "scrollSpeed", label: isFr ? "Scroll"      : "Scroll",      min: 0.0, max: 1.2,  step: 0.01  },
    { key: "alpha",       label: isFr ? "Opacité"     : "Opacity",     min: 0.0, max: 1.0,  step: 0.01  },
  ];

  // Phase 2 — sliders beam (géo + onde + alpha)
  const beamDefs: { key: keyof BeamKnobs; label: string; min: number; max: number; step: number }[] = [
    { key: "radiusBottom", label: isFr ? "Rayon bas"     : "Radius bot",  min: 0.0,  max: 6.0,  step: 0.05 },
    { key: "radiusTop",    label: isFr ? "Rayon haut"    : "Radius top",  min: 0.0,  max: 3.0,  step: 0.05 },
    { key: "waveAmp",      label: isFr ? "Amplitude"     : "Wave amp",    min: 0.0,  max: 2.0,  step: 0.02 },
    { key: "waveFreq",     label: isFr ? "Fréquence"     : "Wave freq",   min: 0.05, max: 4.0,  step: 0.05 },
    { key: "waveSpeed",    label: isFr ? "Vitesse"       : "Wave speed",  min: 0.0,  max: 4.0,  step: 0.05 },
    { key: "waveMode",     label: isFr ? "Mode (0=lat 1=rad)" : "Mode (0=lat 1=rad)", min: 0, max: 1, step: 0.01 },
    { key: "alpha",        label: isFr ? "Intensité"     : "Intensity",   min: 0.0,  max: 1.0,  step: 0.01 },
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
                  <CameraRig z={p1Cam.z} y={p1Cam.y} />
                  <Phase1WaveMesh color={0xff69b4} pillar={p1Rose} dim={p1Active !== 1} />
                  <Phase1WaveMesh color={0x00e5ff} pillar={p1Cyan} dim={p1Active !== 2} />
                </>
              ) : (
                <>
                  <CameraRig z={cam.z} y={cam.y} />
                  <WormholeCloud3D knobs={cloud} />
                  <WormholeBeam3D  knobs={beam} />
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

          {/* Boutons navigation */}
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

            {phase === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => { setCamState({ ...CAMERA_DEFAULTS }); setCloudState({ ...CLOUD_DEFAULTS }); setBeamState({ ...BEAM_DEFAULTS }); }}
                  className="rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55 hover:border-white/30"
                >
                  Reset
                </button>
                <button
                  type="button"
                  disabled={demo}
                  onClick={() => {
                    setCloudState(p => ({ ...p, alpha: 0.92 }));
                    setBeamState(p => ({ ...p, alpha: 0.95 }));
                    setDemo(true);
                  }}
                  className="rounded-sm border border-white/25 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/80 hover:border-white/45 disabled:opacity-40"
                >
                  {demo ? "…" : (isFr ? "Décel → ciel" : "Decel → sky")}
                </button>
              </>
            )}
          </div>

          {/* ── Sélecteur Phase 1 ─────────────────────────────────────────────── */}
          {phase === 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setP1Active(1)}
                className={`rounded-sm border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  p1Active === 1
                    ? "border-pink-400 bg-pink-400/15 text-pink-300"
                    : "border-white/15 text-white/45 hover:border-pink-400/40 hover:text-pink-300/70"
                }`}
              >
                1 — Rose
              </button>

              <button
                type="button"
                onClick={() => setP1Active(2)}
                className={`rounded-sm border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  p1Active === 2
                    ? "border-cyan-400 bg-cyan-400/15 text-cyan-300"
                    : "border-white/15 text-white/45 hover:border-cyan-400/40 hover:text-cyan-300/70"
                }`}
              >
                2 — Cyan
              </button>

              <button
                type="button"
                onClick={() => setP1Active(3)}
                className={`rounded-sm border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  p1Active === 3
                    ? "border-white/60 bg-white/10 text-white/90"
                    : "border-white/15 text-white/45 hover:border-white/35"
                }`}
              >
                3 — Cam
              </button>

              <button
                type="button"
                onClick={() => {
                  if (p1Active === 1) setP1Rose({ ...P1_ROSE_DEFAULTS });
                  else if (p1Active === 2) setP1Cyan({ ...P1_CYAN_DEFAULTS });
                  else setP1CamSt({ ...P1_CAM_DEFAULTS });
                }}
                className="ml-1 rounded-sm border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/40 hover:border-white/25 hover:text-white/65"
              >
                Reset
              </button>
            </div>
          )}

          {/* Sliders pilier rose */}
          {phase === 1 && p1Active === 1 && (
            <SliderGroup
              label="◈ Pilier 1 — Rose · géométrie · coude · position"
              knobs={p1Rose}
              set={setRose}
              defs={p1PillarDefs}
            />
          )}

          {/* Sliders pilier cyan */}
          {phase === 1 && p1Active === 2 && (
            <SliderGroup
              label="◈ Pilier 2 — Cyan · géométrie · coude · position"
              knobs={p1Cyan}
              set={setCyan}
              defs={p1PillarDefs}
            />
          )}

          {/* Sliders caméra globale (les 2 piliers ensemble) */}
          {phase === 1 && p1Active === 3 && (
            <SliderGroup
              label="◈ Caméra — globale (les 2 piliers)"
              knobs={p1Cam}
              set={setP1Cam}
              defs={p1CamDefs}
            />
          )}

          {/* Sliders Phase 2 */}
          {phase === 2 && (
            <>
              <SliderGroup
                label={isFr ? "◈ Caméra" : "◈ Camera"}
                knobs={cam} set={setCam} defs={camDefs}
              />
              <SliderGroup
                label={isFr ? "◈ Cloud (rose) — Géométrie + Onde" : "◈ Cloud (rose) — Geometry + Wave"}
                knobs={cloud} set={setCloud} defs={cloudGeoDefs}
              />
              <SliderGroup
                label={isFr ? "◈ Cloud (rose) — Matériau" : "◈ Cloud (rose) — Material"}
                knobs={cloud} set={setCloud} defs={cloudMatDefs}
              />
              <SliderGroup
                label={isFr ? "◈ Beam (cyan) — Géométrie + Onde + Intensité" : "◈ Beam (cyan) — Geometry + Wave + Intensity"}
                knobs={beam} set={setBeam} defs={beamDefs}
              />
            </>
          )}

        </div>
      </div>
    </main>
  );
}
