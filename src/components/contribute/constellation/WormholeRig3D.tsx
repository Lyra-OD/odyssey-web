"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, ShaderMaterial } from "three";

// ── Couleurs Sanctuary (de skyTheme.ts) ─────────────────────────────────────
const C_ROSE     = new Color("#c2186e");
const C_ROSE_HOT = new Color("#ff3d9a");
const C_MAUVE    = new Color("#9a6fad");
const C_TEAL     = new Color("#3d9a94");
const C_WHITE    = new Color("#ffffff");
const C_CYAN     = new Color("#00e5ff");

// ── Types ────────────────────────────────────────────────────────────────────

export type WormholeRigKnobs = {
  // Géométrie + ondulation (partagées beam & cloud)
  cloudRadiusBottom: number;
  beamRadiusBottom:  number;
  beamRadiusTop:     number;
  waveFreq:          number;
  waveAmp:           number;
  waveSpeed:         number;
  // Caméra
  cameraZ:           number;
  cameraY:           number;
  // Matériau cloud
  density:           number;
  contrast:          number;
  lightOffset:       number;
  boilSpeed:         number;
  scrollSpeed:       number;
  cloudAlpha:        number;
  // Matériau beam
  beamAlpha:         number;
};

// Defaults calibrés sur le GIF BBC (jet cosmique, base large, pointe fine).
// Ajuste ces valeurs dans le lab, puis colle ici tes WORMHOLE_RIG_DEFAULTS finaux.
export const WORMHOLE_RIG_DEFAULTS: WormholeRigKnobs = {
  // ── Géométrie ───
  cloudRadiusBottom: 5.5,   // lobes roses larges de chaque côté (GIF)
  beamRadiusBottom:  0.35,  // cône fin — le godray n'est pas large
  beamRadiusTop:     0.0,   // pointe pure au sommet
  // ── Onde ───
  waveFreq:          0.4,   // une demi-onde sur la hauteur = légère courbure
  waveAmp:           0.06,  // quasi-droit (le GIF n'est pas un serpent)
  waveSpeed:         0.5,   // respiration lente
  // ── Caméra ───
  cameraZ:           10.0,  // assez reculé pour voir base + pointe
  cameraY:           -4.0,  // en-dessous → on regarde le pilier monter
  // ── Matériau cloud ───
  density:           2.0,   // nuages épais, pas transparents
  contrast:          0.65,  // bords légèrement sculptés mais pas trop durs
  lightOffset:       0.42,  // auto-ombre prononcée → profondeur volumétrique
  boilSpeed:         0.10,  // bouillonnement lent (cosmique, pas agité)
  scrollSpeed:       0.20,  // vol vers le haut perceptible
  cloudAlpha:        0.92,
  // ── Beam ───
  beamAlpha:         0.95,
};

// ── Vertex shader partagé (ondulation serpent) ───────────────────────────────
// Appliqué aux deux cônes : cylindre cloud ET cône beam.
// Exporte position world + normale view pour les deux fragment shaders.

const waveVertexShader = /* glsl */ `
uniform float uTime;
uniform float uWaveFreq;
uniform float uWaveAmp;
uniform float uWaveSpeed;

varying vec2 vUv;
varying vec3 vViewPos;
varying vec3 vViewNormal;
varying vec3 vWorldPos;

void main() {
  vec3 pos = position;

  float t = uTime * uWaveSpeed;
  // Ondulation en X + Z légèrement déphasée → mouvement 3D
  pos.x += sin(pos.y * uWaveFreq + t)               * uWaveAmp;
  pos.z += cos(pos.y * uWaveFreq * 0.83 + t * 0.91) * uWaveAmp * 0.60;

  vUv         = uv;
  vViewPos    = (modelViewMatrix * vec4(pos, 1.0)).xyz;
  vViewNormal = normalize(normalMatrix * normal);
  vWorldPos   = (modelMatrix * vec4(pos, 1.0)).xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

// ── Utilitaires GLSL (Worley + FBM pour le cloud) ───────────────────────────

const noiseGlsl = /* glsl */ `
float hash1(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash1(i), b = hash1(i + vec2(1,0));
  float c = hash1(i + vec2(0,1)), d = hash1(i + vec2(1,1));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}
float fbm4(vec2 p) {
  float v = 0.0; float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = m*p; a *= 0.5; }
  return v;
}
// Worley F1 avec cellules animées (bouillonnement interne)
float worley(vec2 p, float t) {
  vec2 i = floor(p);
  float minSq = 9.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 cell = vec2(float(x), float(y));
      vec2 h = hash2(i + cell);
      vec2 drift = vec2(
        sin(t * 0.65 + h.x * 6.2832),
        cos(t * 0.52 + h.y * 6.2832)
      ) * 0.22;
      vec2 pt = cell + h + drift - fract(p);
      minSq = min(minSq, dot(pt, pt));
    }
  }
  return 1.0 - sqrt(minSq);
}
// Densité composite : 3 échelles Worley + FBM domain-warp
float cloudDens(vec2 p, float t) {
  float c1 = worley(p * 2.0,         t * 0.8);
  float c2 = worley(p * 4.5 + 2.1,   t * 1.2);
  float c3 = worley(p * 9.0 + 5.3,   t * 1.6);
  float base = c1 * 0.50 + c2 * 0.30 + c3 * 0.20;
  float detail = fbm4(p * 6.0 + base * 0.55 + vec2(t * 0.08, 0.0));
  return clamp(base * 0.62 + detail * 0.48, 0.0, 1.0);
}
`;

// ── Fragment shader — Cloud (cylindre rose/mauve/teal) ───────────────────────
//
// Coordonnées bruit : vWorldPos.xz → distribue le bruit sur la section
// transversale du cylindre. Le cône qui rétrécit vers le haut compresse
// naturellement les nuages (effet entonnoir cosmique, comme dans le GIF).

const cloudFragmentShader = /* glsl */ `
precision highp float;
${noiseGlsl}

uniform float uTime;
uniform float uDensity;
uniform float uContrast;
uniform float uLightOffset;
uniform float uBoilSpeed;
uniform float uScrollSpeed;
uniform float uAlpha;
uniform vec3  uRose;
uniform vec3  uRoseHot;
uniform vec3  uMauve;
uniform vec3  uTeal;

varying vec2 vUv;
varying vec3 vWorldPos;

void main() {
  float t  = uTime * uBoilSpeed;
  float sc = uTime * uScrollSpeed;

  // Coordonnées bruit : XZ du monde (section transversale du cylindre)
  // + légère influence de la hauteur pour rompre la symétrie radiale
  vec2 p = vWorldPos.xz * 1.4;
  p     += sin(vWorldPos.y * 0.18 + t * 0.12) * 0.22;
  p.y   -= sc; // scroll : l'énergie monte

  // Densité principale
  float dens = cloudDens(p, t);

  float thresh   = mix(0.62, 0.42, clamp(uDensity - 0.5, 0.0, 1.0));
  float softness = mix(0.32, 0.08, clamp(uContrast, 0.0, 1.0));
  float shaped   = smoothstep(thresh, thresh + softness, dens);

  if (shaped < 0.004) discard;

  // Self-shadowing : lumière vient du haut-gauche en XZ
  vec2  lDir       = normalize(vec2(-0.35, 0.55));
  float densLight  = cloudDens(p + lDir * uLightOffset, t);
  float lit        = clamp(0.5 + (dens - densLight) * 2.4, 0.0, 1.0);
  lit              = smoothstep(0.0, 1.0, lit);

  // Gradient couleur : rose (base) → mauve (milieu) → teal (pointe)
  float h = vUv.y; // 0 = base large, 1 = pointe fine
  vec3 baseCol = mix(uRose,  uMauve, smoothstep(0.0, 0.55, h));
  baseCol      = mix(baseCol, uTeal,  smoothstep(0.45, 1.0,  h));

  // Self-shadow : creux sombres, crêtes lumineuses
  vec3 col = mix(baseCol * 0.12, baseCol * 1.5, lit);

  // Crêtes chaudes (rose vif) sur les bosses Worley, concentrées en bas
  float hotVal = cloudDens(p * 1.7 + vec2(3.1, t * 0.3 + 1.7), t);
  float hotMask = smoothstep(0.55, 0.92, hotVal) * (1.0 - h * 0.85);
  col = mix(col, uRoseHot, hotMask * 0.65);

  // Blanc rosé aux pics extrêmes
  col = mix(col, vec3(1.0, 0.78, 0.9), smoothstep(0.82, 1.0, hotVal) * 0.28 * (1.0 - h));

  // Pas de edgeFade : le bruit utilise vWorldPos.xz → pas de seam UV.
  float a = clamp(shaped * uAlpha, 0.0, 0.92);
  gl_FragColor = vec4(col, a);
}
`;

// ── Fragment shader — Beam (cône glow, nDotV) ────────────────────────────────
//
// nDotV = dot(normale view-space, direction vers caméra).
// = 1 à la face centrale (brillant) → 0 aux bords (sombre).
// Crée l'effet de pilier lumineux vu de l'extérieur.

const beamFragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uAlpha;
uniform vec3  uTip;
uniform vec3  uMid;
uniform vec3  uTail;

varying vec2 vUv;
varying vec3 vViewPos;
varying vec3 vViewNormal;

float hash1v(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noiseB(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  float a=hash1v(i), b=hash1v(i+vec2(1,0)), c=hash1v(i+vec2(0,1)), d=hash1v(i+vec2(1,1));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
}

void main() {
  // Direction caméra en view-space
  vec3 viewDir  = normalize(-vViewPos);
  float nDotV   = max(0.0, dot(normalize(vViewNormal), viewDir));

  // Trois couches de glow : centre blanc pur, couronne cyan, halo diffus
  float core    = pow(nDotV, 5.0);
  float midGlow = pow(nDotV, 2.0);
  float haze    = pow(nDotV, 0.75);

  // Scintillement subtil : streaks verticaux lumineux
  float flow    = uTime * 1.8;
  float flicker = 0.82 + 0.20 * noiseB(vec2(vUv.x * 4.0, vUv.y * 10.0 - flow))
                       + 0.12 * noiseB(vec2(vUv.x * 9.0 + 2.3, vUv.y * 18.0 - flow * 1.4));

  float beam = (core * 0.90 + midGlow * 0.52 + haze * 0.22) * flicker;

  // Couleur : blanc au centre → cyan → teal en hauteur
  float h   = vUv.y; // 0=base, 1=pointe
  vec3  col = mix(uMid, uTip, smoothstep(0.0, 0.6, h));
  col = mix(col, vec3(1.0),  core * 0.95);
  col = mix(col, uTail, haze * (1.0 - core) * 0.35 * h);

  float a = clamp(beam * uAlpha, 0.0, 1.0);
  if (a < 0.004) discard;

  gl_FragColor = vec4(col, a);
}
`;

// ── Composant : WormholeCloud3D ───────────────────────────────────────────────

export function WormholeCloud3D({ knobs }: { knobs: WormholeRigKnobs }) {
  const matRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime:        { value: 0 },
      uWaveFreq:    { value: knobs.waveFreq },
      uWaveAmp:     { value: knobs.waveAmp },
      uWaveSpeed:   { value: knobs.waveSpeed },
      uDensity:     { value: knobs.density },
      uContrast:    { value: knobs.contrast },
      uLightOffset: { value: knobs.lightOffset },
      uBoilSpeed:   { value: knobs.boilSpeed },
      uScrollSpeed: { value: knobs.scrollSpeed },
      uAlpha:       { value: knobs.cloudAlpha },
      uRose:        { value: C_ROSE.clone() },
      uRoseHot:     { value: C_ROSE_HOT.clone() },
      uMauve:       { value: C_MAUVE.clone() },
      uTeal:        { value: C_TEAL.clone() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value        = clock.elapsedTime;
    mat.uniforms.uWaveFreq.value    = knobs.waveFreq;
    mat.uniforms.uWaveAmp.value     = knobs.waveAmp;
    mat.uniforms.uWaveSpeed.value   = knobs.waveSpeed;
    mat.uniforms.uDensity.value     = knobs.density;
    mat.uniforms.uContrast.value    = knobs.contrast;
    mat.uniforms.uLightOffset.value = knobs.lightOffset;
    mat.uniforms.uBoilSpeed.value   = knobs.boilSpeed;
    mat.uniforms.uScrollSpeed.value = knobs.scrollSpeed;
    mat.uniforms.uAlpha.value       = knobs.cloudAlpha;
  });

  return (
    <mesh key={knobs.cloudRadiusBottom} renderOrder={50}>
      {/* radiusTop petit → pointe fine en haut. radiusBottom large → base. */}
      <cylinderGeometry args={[0.05, knobs.cloudRadiusBottom, 14, 64, 48, true]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={waveVertexShader}
        fragmentShader={cloudFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={AdditiveBlending}
        side={2} // DoubleSide
      />
    </mesh>
  );
}

// ── Composant : WormholeBeam3D ────────────────────────────────────────────────

export function WormholeBeam3D({ knobs }: { knobs: WormholeRigKnobs }) {
  const matRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime:      { value: 0 },
      uWaveFreq:  { value: knobs.waveFreq },
      uWaveAmp:   { value: knobs.waveAmp },
      uWaveSpeed: { value: knobs.waveSpeed },
      uAlpha:     { value: knobs.beamAlpha },
      uTip:       { value: C_WHITE.clone() },
      uMid:       { value: C_CYAN.clone() },
      uTail:      { value: C_TEAL.clone() },
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
    mat.uniforms.uAlpha.value     = knobs.beamAlpha;
  });

  return (
    <mesh
      key={`${knobs.beamRadiusBottom}-${knobs.beamRadiusTop}`}
      renderOrder={51}
    >
      {/* 32 hautSeg pour que la déformation soit fluide jusqu'à la pointe */}
      <cylinderGeometry
        args={[knobs.beamRadiusTop, knobs.beamRadiusBottom, 14, 32, 32, true]}
      />
      <shaderMaterial
        ref={matRef}
        vertexShader={waveVertexShader}
        fragmentShader={beamFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={AdditiveBlending}
        side={2} // DoubleSide
      />
    </mesh>
  );
}
