"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, BackSide, Color, DoubleSide, InstancedMesh, Mesh, Object3D, ShaderMaterial, Vector3 } from "three";

// ── Couleurs Sanctuary (skyTheme.ts) ────────────────────────────────────────
const C_ROSE     = new Color("#c2186e");
const C_ROSE_HOT = new Color("#ff3d9a");
const C_MAUVE    = new Color("#9a6fad");
const C_TEAL     = new Color("#3d9a94");
const C_WHITE    = new Color("#ffffff");
const C_CYAN     = new Color("#00e5ff");

// ── Types indépendants ───────────────────────────────────────────────────────

export type CameraKnobs = {
  z: number;
  y: number;
};
export const CAMERA_DEFAULTS: CameraKnobs = { z: 9.50, y: -2.90 };

export type CloudKnobs = {
  // Géométrie
  radiusBottom: number;
  radiusTop:    number;
  height:       number;
  // Position dans la scène
  posX: number;
  posY: number;
  posZ: number;
  // Coude (même logique que Phase 1)
  bendAmp:   number;
  bendAngle: number;
  bendSpeed: number;
  // Matériau
  density:     number;
  contrast:    number;
  lightOffset: number;
  boilSpeed:   number;
  scrollSpeed: number;
  alpha:       number;
  /** Nombre de pas du raymarch (8–24). Qualité vs GPU. */
  steps:       number;
};
export const CLOUD_DEFAULTS: CloudKnobs = {
  // Géométrie — specs calibrées 14 août 2026 (identiques Phase 1 Rose)
  radiusBottom: 7.20,
  radiusTop:    0.00,
  height:       15.50,
  posX: 0.00, posY: 4.70, posZ: 0.40,
  bendAmp:   4.00,
  bendAngle: 4.70,
  bendSpeed: 0.00,
  // Matériau
  density:      2.0,
  contrast:     0.65,
  lightOffset:  0.42,
  boilSpeed:    0.10,
  scrollSpeed:  0.20,
  alpha:        0.00, // ancienne peau-cône masquée — les puffs sont le vrai calque nuage
  steps:        16,
};

export type BeamKnobs = {
  // Géométrie
  radiusBottom: number;
  radiusTop:    number;
  height:       number;
  // Position dans la scène
  posX: number;
  posY: number;
  posZ: number;
  // Coude
  bendAmp:   number;
  bendAngle: number;
  bendSpeed: number;
  // Matériau
  alpha: number;
  color: string;
};
export const BEAM_DEFAULTS: BeamKnobs = {
  // Géométrie — specs calibrées 14 août 2026 (identiques Phase 1 Cyan)
  radiusBottom: 2.20,
  radiusTop:    0.00,
  height:       14.00,
  posX: 0.00, posY: 3.90, posZ: 1.30,
  bendAmp:   4.00,
  bendAngle: 4.70,
  bendSpeed: 0.00,
  alpha:        0.95,
  color:        "#00e5ff",
};

// ── Vertex shader partagé ────────────────────────────────────────────────────
//
// Coude unique ancré aux extrémités (même logique que Phase 1 p1VertexShader).
// uBendAngle tourne la direction du coude dans le plan XZ (boussole 0–2PI).
// uBendSpeed = 0 → coude figé sur uBendAngle.
// uHalfH     = height / 2 → l'enveloppe s'adapte à la hauteur du pilier.

const bendVertexShader = /* glsl */ `
uniform float uTime;
uniform float uBendAmp;
uniform float uBendAngle;
uniform float uBendSpeed;
uniform float uHalfH;

varying vec2 vUv;
varying vec3 vViewPos;
varying vec3 vViewNormal;
varying vec3 vWorldPos;

void main() {
  vec3 pos = position;

  // Enveloppe : 0 aux extrémités, 1 au centre — coude ancré à chaque bout
  float nY  = clamp((pos.y + uHalfH) / (2.0 * uHalfH), 0.0, 1.0);
  float env = sin(nY * 3.14159);

  // Direction du coude (boussole XZ)
  float angle = uBendAngle + uTime * uBendSpeed;
  pos.x += cos(angle) * uBendAmp * env;
  pos.z += sin(angle) * uBendAmp * env;

  vUv         = uv;
  vViewPos    = (modelViewMatrix * vec4(pos, 1.0)).xyz;
  vViewNormal = normalize(normalMatrix * normal);
  vWorldPos   = (modelMatrix * vec4(pos, 1.0)).xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

// ── Utilitaires GLSL (bruit 3D pour le volume) ───────────────────────────────

const noiseGlsl = /* glsl */ `
float hash13(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.23));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}
vec3 hash33(vec3 p) {
  p = vec3(
    dot(p, vec3(127.1, 311.7,  74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  );
  return fract(sin(p) * 43758.5453);
}
float noise3(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i), hash13(i+vec3(1,0,0)), f.x),
        mix(hash13(i+vec3(0,1,0)), hash13(i+vec3(1,1,0)), f.x), f.y),
    mix(mix(hash13(i+vec3(0,0,1)), hash13(i+vec3(1,0,1)), f.x),
        mix(hash13(i+vec3(0,1,1)), hash13(i+vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm3(vec3 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise3(p); p *= 2.03; a *= 0.5; }
  return v;
}
float worleyDist3(vec3 p, float t) {
  vec3 i = floor(p); float minSq = 9.0;
  for (int z = -1; z <= 1; z++) {
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec3 cell = vec3(float(x), float(y), float(z));
        vec3 h = hash33(i + cell);
        vec3 drift = vec3(
          sin(t * 0.61 + h.x * 6.28),
          cos(t * 0.47 + h.y * 6.28),
          sin(t * 0.53 + h.z * 6.28)
        ) * 0.18;
        vec3 pt = cell + h + drift - fract(p);
        minSq = min(minSq, dot(pt, pt));
      }
    }
  }
  return sqrt(minSq);
}
// Choux ronds : falloff sphérique (pas des filaments).
float puff(vec3 p, float t, float scale) {
  float d = worleyDist3(p * scale, t);
  return 1.0 - smoothstep(0.12, 0.58, d);
}
float cloudDens3(vec3 p, float t) {
  float big   = puff(p,             t * 0.75, 0.55);
  float mid   = puff(p + 2.7,       t * 1.05, 0.95);
  float small = puff(p + vec3(5.1), t * 1.3,  1.65);
  float body  = max(big, mid * 0.85);
  body = max(body, small * 0.50);
  float nibble = fbm3(p * 1.6 + vec3(t * 0.05, 0.0, 0.0));
  return clamp(body * (0.78 + nibble * 0.32), 0.0, 1.0);
}
`;

// ── Vertex — boîte de volume (pas de coude : la forme vient des choux) ───────

const cloudBoxVertexShader = /* glsl */ `
varying vec3 vWorldPos;
void main() {
  vWorldPos   = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// ── Fragment — Cloud (Étape V : raymarch caméra, grayscale, choux) ───────────
//
// Le mesh est une boîte fermée — plus de cône ouvert (plus d'horizon).
// La silhouette = blobs sphériques, pas la géométrie.

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
uniform float uSteps;
uniform float uRadiusBottom;
uniform float uRadiusTop;
uniform float uHalfH;
uniform float uBendAmp;
uniform float uBendAngle;
uniform float uBendSpeed;
uniform vec3  uPillarPos;
uniform vec3  uBoxHalf;

varying vec3 vWorldPos;

vec3 toObject(vec3 worldP) {
  return worldP - uPillarPos;
}

bool intersectAABB(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax, out float t0, out float t1) {
  vec3 inv = 1.0 / rd;
  vec3 tA  = (bmin - ro) * inv;
  vec3 tB  = (bmax - ro) * inv;
  vec3 tN  = min(tA, tB);
  vec3 tF  = max(tA, tB);
  t0 = max(max(tN.x, tN.y), tN.z);
  t1 = min(min(tF.x, tF.y), tF.z);
  return t1 >= t0 && t1 > 0.0;
}

float coneMask(vec3 obj) {
  float nY  = clamp((obj.y + uHalfH) / max(2.0 * uHalfH, 0.001), 0.0, 1.0);
  float env = sin(nY * 3.14159);
  float ang = uBendAngle + uTime * uBendSpeed;
  vec3  u   = obj;
  u.x -= cos(ang) * uBendAmp * env;
  u.z -= sin(ang) * uBendAmp * env;
  if (u.y < -uHalfH * 1.08 || u.y > uHalfH * 1.08) return 0.0;
  float r = mix(uRadiusBottom, uRadiusTop, nY) * 1.55 + 1.1;
  float d = length(u.xz);
  return 1.0 - smoothstep(r * 0.20, r, d);
}

void main() {
  float t  = uTime * uBoilSpeed;
  float sc = uTime * uScrollSpeed;

  vec3 ro = cameraPosition;
  vec3 rd = normalize(vWorldPos - cameraPosition);

  vec3 bmin = uPillarPos - uBoxHalf;
  vec3 bmax = uPillarPos + uBoxHalf;
  float tEnter, tExit;
  if (!intersectAABB(ro, rd, bmin, bmax, tEnter, tExit)) discard;
  tEnter = max(tEnter, 0.0);
  if (tExit <= tEnter) discard;

  float nStep = clamp(uSteps, 8.0, 24.0);
  float dt    = (tExit - tEnter) / nStep;
  vec3  p     = ro + rd * (tEnter + dt * 0.5);
  vec3  lDir  = normalize(vec3(-0.25, 0.55, 0.40));
  float acc   = 0.0;

  for (int i = 0; i < 24; i++) {
    if (float(i) >= nStep) break;

    vec3  obj  = toObject(p);
    float mask = coneMask(obj);
    if (mask > 0.004) {
      vec3 q = obj * 0.48;
      q.y -= sc * 0.45;
      q += vec3(t * 0.035, t * 0.018, t * 0.028);

      float dens   = cloudDens3(q, t);
      float thresh = mix(0.22, 0.08, clamp(uDensity - 0.5, 0.0, 1.0));
      float soft   = mix(0.50, 0.22, clamp(uContrast, 0.0, 1.0));
      float shaped = smoothstep(thresh, thresh + soft, dens) * mask;

      float densL = cloudDens3(q + lDir * uLightOffset * 0.45, t);
      float lit   = mix(0.40, 1.0, clamp(0.30 + (dens - densL) * 1.6, 0.0, 1.0));

      acc += shaped * lit * (1.0 - acc) * 0.42;
    }
    p += rd * dt;
    if (acc > 0.96) break;
  }

  if (acc < 0.008) discard;
  float g = clamp(acc * uAlpha, 0.0, 1.0);
  gl_FragColor = vec4(vec3(g), g);
}
`;

const beamPlaneVertexShader = /* glsl */ `
uniform float uTime;
uniform float uBendAmp;
uniform float uBendAngle;
uniform float uBendSpeed;
uniform float uHalfH;
uniform float uRadiusBottom;
uniform float uRadiusTop;

varying vec2 vUv;

void main() {
  vec3 pos = position;
  float nY  = clamp((pos.y + uHalfH) / (2.0 * uHalfH), 0.0, 1.0);
  float env = sin(nY * 3.14159);
  float rad = mix(uRadiusBottom, uRadiusTop, nY);
  pos.x *= max(rad, 0.08) * 2.15;

  float angle = uBendAngle + uTime * uBendSpeed;
  pos.x += cos(angle) * uBendAmp * env;
  pos.z += sin(angle) * uBendAmp * env;

  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const beamFragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uAlpha;
uniform vec3  uTip;
uniform vec3  uMid;
uniform vec3  uTail;

varying vec2 vUv;

float hash1v(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noiseB(vec2 p){
  vec2 i=floor(p);vec2 f=fract(p);
  float a=hash1v(i),b=hash1v(i+vec2(1,0)),c=hash1v(i+vec2(0,1)),d=hash1v(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
}

void main() {
  float nx = vUv.x * 2.0 - 1.0;
  if (abs(nx) > 1.55) discard;

  float core    = exp(-nx * nx * 14.0);
  float midGlow = exp(-nx * nx * 2.8);
  float haze    = exp(-nx * nx * 0.45);
  float bloom   = exp(-nx * nx * 0.12);

  float t = vUv.y;
  float flow = uTime * 1.6;
  float flicker = 0.68
    + 0.27 * noiseB(vec2(nx * 2.0, t * 9.0 - flow * 3.5))
    + 0.15 * noiseB(vec2(nx * 5.0 + 3.7, t * 14.0 - flow * 5.2));

  float beam = (core * 1.15 + midGlow * 0.55 + haze * 0.32 + bloom * 0.16) * flicker;

  vec3 col = mix(uMid, uTip, smoothstep(0.0, 0.55, t));
  col = mix(col, vec3(1.0), core * 0.92);
  col = mix(col, uTail, haze * (1.0 - core) * 0.35);

  float a = clamp(beam * uAlpha, 0.0, 1.0);
  if (a < 0.004) discard;
  gl_FragColor = vec4(col, a);
}
`;

// ── Composant : WormholeCloud3D ───────────────────────────────────────────────

export function WormholeCloud3D({ knobs }: { knobs: CloudKnobs }) {
  const matRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime:          { value: 0 },
    uBendAmp:       { value: knobs.bendAmp },
    uBendAngle:     { value: knobs.bendAngle },
    uBendSpeed:     { value: knobs.bendSpeed },
    uHalfH:         { value: knobs.height / 2 },
    uDensity:       { value: knobs.density },
    uContrast:      { value: knobs.contrast },
    uLightOffset:   { value: knobs.lightOffset },
    uBoilSpeed:     { value: knobs.boilSpeed },
    uScrollSpeed:   { value: knobs.scrollSpeed },
    uAlpha:         { value: knobs.alpha },
    uSteps:         { value: knobs.steps },
    uRadiusBottom:  { value: knobs.radiusBottom },
    uRadiusTop:     { value: knobs.radiusTop },
    uPillarPos:     { value: new Vector3(knobs.posX, knobs.posY, knobs.posZ) },
    uBoxHalf:       { value: new Vector3(
      knobs.radiusBottom * 1.7 + knobs.bendAmp + 2.5,
      knobs.height * 0.5 + 2.0,
      knobs.radiusBottom * 1.7 + knobs.bendAmp + 2.5,
    ) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value         = clock.elapsedTime;
    mat.uniforms.uBendAmp.value      = knobs.bendAmp;
    mat.uniforms.uBendAngle.value    = knobs.bendAngle;
    mat.uniforms.uBendSpeed.value    = knobs.bendSpeed;
    mat.uniforms.uHalfH.value        = knobs.height / 2;
    mat.uniforms.uDensity.value      = knobs.density;
    mat.uniforms.uContrast.value     = knobs.contrast;
    mat.uniforms.uLightOffset.value  = knobs.lightOffset;
    mat.uniforms.uBoilSpeed.value    = knobs.boilSpeed;
    mat.uniforms.uScrollSpeed.value  = knobs.scrollSpeed;
    mat.uniforms.uAlpha.value        = knobs.alpha;
    mat.uniforms.uSteps.value        = knobs.steps;
    mat.uniforms.uRadiusBottom.value = knobs.radiusBottom;
    mat.uniforms.uRadiusTop.value    = knobs.radiusTop;
    (mat.uniforms.uPillarPos.value as Vector3).set(knobs.posX, knobs.posY, knobs.posZ);
    (mat.uniforms.uBoxHalf.value as Vector3).set(
      knobs.radiusBottom * 1.7 + knobs.bendAmp + 2.5,
      knobs.height * 0.5 + 2.0,
      knobs.radiusBottom * 1.7 + knobs.bendAmp + 2.5,
    );
  });

  const boxHx = knobs.radiusBottom * 1.7 + knobs.bendAmp + 2.5;
  const boxHy = knobs.height * 0.5 + 2.0;

  return (
    <mesh
      key={`cbox-${boxHx.toFixed(2)}-${boxHy.toFixed(2)}`}
      position={[knobs.posX, knobs.posY, knobs.posZ]}
      renderOrder={50}
    >
      <boxGeometry args={[boxHx * 2, boxHy * 2, boxHx * 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={cloudBoxVertexShader}
        fragmentShader={cloudFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={AdditiveBlending}
        side={BackSide}
      />
    </mesh>
  );
}

// ── Composant : WormholeBeam3D ────────────────────────────────────────────────

export function WormholeBeam3D({ knobs }: { knobs: BeamKnobs }) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime:          { value: 0 },
    uBendAmp:       { value: knobs.bendAmp },
    uBendAngle:     { value: knobs.bendAngle },
    uBendSpeed:     { value: knobs.bendSpeed },
    uHalfH:         { value: knobs.height / 2 },
    uRadiusBottom:  { value: knobs.radiusBottom },
    uRadiusTop:     { value: knobs.radiusTop },
    uAlpha:         { value: knobs.alpha },
    uTip:           { value: C_WHITE.clone() },
    uMid:           { value: C_CYAN.clone() },
    uTail:          { value: C_TEAL.clone() },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useFrame(({ clock, camera }) => {
    const mat = matRef.current;
    const mesh = meshRef.current;
    if (mat) {
      mat.uniforms.uTime.value         = clock.elapsedTime;
      mat.uniforms.uBendAmp.value      = knobs.bendAmp;
      mat.uniforms.uBendAngle.value    = knobs.bendAngle;
      mat.uniforms.uBendSpeed.value    = knobs.bendSpeed;
      mat.uniforms.uHalfH.value        = knobs.height / 2;
      mat.uniforms.uRadiusBottom.value = knobs.radiusBottom;
      mat.uniforms.uRadiusTop.value    = knobs.radiusTop;
      mat.uniforms.uAlpha.value        = knobs.alpha;
      (mat.uniforms.uMid.value as Color).set(knobs.color);
    }
    if (mesh) {
      mesh.lookAt(camera.position.x, knobs.posY, camera.position.z);
    }
  });

  return (
    <mesh
      ref={meshRef}
      key={`b-${knobs.height}`}
      position={[knobs.posX, knobs.posY, knobs.posZ]}
      renderOrder={80}
    >
      <planeGeometry args={[2, knobs.height, 1, 48]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={beamPlaneVertexShader}
        fragmentShader={beamFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={AdditiveBlending}
        side={DoubleSide}
      />
    </mesh>
  );
}

// ── Calque puffs — nuages ronds le long du chemin rose (pas un fuseau) ────────

export type PuffKnobs = {
  count:     number;
  size:      number;
  scatter:   number;
  density:   number;
  boilSpeed: number;
  alpha:     number;
  seed:      number;
  color:     string;
  posX: number;
  posY: number;
  posZ: number;
  /** Étendue verticale autour de posY. */
  spreadY: number;
};
export const PUFF_A_DEFAULTS: PuffKnobs = {
  count: 8, size: 2.80, scatter: 1.40, density: 1.20, boilSpeed: 0.08, alpha: 0.72,
  seed: 11, color: "#c2186e",
  posX: -2.40, posY: 1.20, posZ: 0.60, spreadY: 3.50,
};
export const PUFF_B_DEFAULTS: PuffKnobs = {
  count: 8, size: 2.50, scatter: 1.50, density: 1.15, boilSpeed: 0.09, alpha: 0.68,
  seed: 23, color: "#ff3d9a",
  posX:  2.20, posY: 2.00, posZ: -0.50, spreadY: 3.20,
};
export const PUFF_C_DEFAULTS: PuffKnobs = {
  count: 10, size: 3.10, scatter: 1.80, density: 1.10, boilSpeed: 0.07, alpha: 0.70,
  seed: 37, color: "#9a4a78",
  posX:  0.10, posY: -0.80, posZ: 1.10, spreadY: 2.80,
};
export const PUFF_VOILES_DEFAULTS: PuffKnobs = {
  count: 12, size: 3.60, scatter: 3.20, density: 0.90, boilSpeed: 0.12, alpha: 0.38,
  seed: 41, color: "#9a6fad",
  posX: 0.00, posY: 3.40, posZ: 0.20, spreadY: 5.00,
};
export const PUFF_DUST_DEFAULTS: PuffKnobs = {
  count: 22, size: 0.95, scatter: 4.20, density: 0.85, boilSpeed: 0.16, alpha: 0.32,
  seed: 53, color: "#6a8a88",
  posX: 0.00, posY: 2.00, posZ: 0.00, spreadY: 7.00,
};
export const PUFF_GROS_DEFAULTS = PUFF_A_DEFAULTS;
export const PUFF_DEFAULTS = PUFF_A_DEFAULTS;

const puffVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vCenter;
void main() {
  vUv     = uv;
  vCenter = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const puffFragmentShader = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uDensity;
uniform float uBoilSpeed;
uniform float uAlpha;
uniform float uSize;
uniform vec3  uColor;
uniform vec3  uLightPos;
varying vec2 vUv;
varying vec3 vCenter;

float hash1(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  float a = hash1(i), b = hash1(i+vec2(1,0));
  float c = hash1(i+vec2(0,1)), d = hash1(i+vec2(1,1));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p) {
  float v=0.0; float a=0.5;
  for (int i=0;i<4;i++) { v+=a*noise(p); p*=2.07; a*=0.5; }
  return v;
}

void main() {
  vec2  p = vUv * 2.0 - 1.0;
  float r = length(p);
  float fall = 1.0 - smoothstep(0.08, 1.0, r);
  if (fall < 0.004) discard;

  float t = uTime * uBoilSpeed;
  float n = fbm(p * 1.8 + vec2(t * 0.12, t * 0.07));
  float thresh = mix(0.22, 0.08, clamp(uDensity - 0.5, 0.0, 1.0));
  float body = smoothstep(thresh, thresh + 0.45, n) * fall;
  if (body < 0.01) discard;

  float w = clamp(body * uAlpha, 0.0, 0.85);
  gl_FragColor = vec4(uColor, w);
}
`;

const _puffDummy = new Object3D();

function hash11(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function WormholeCloudPuffs({
  knobs,
  lightPos,
}: {
  knobs: PuffKnobs;
  lightPos: { x: number; y: number; z: number };
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const matRef  = useRef<ShaderMaterial>(null);
  const count   = Math.max(1, Math.round(knobs.count));

  const uniforms = useMemo(() => ({
    uTime:      { value: 0 },
    uDensity:   { value: knobs.density },
    uBoilSpeed: { value: knobs.boilSpeed },
    uAlpha:     { value: knobs.alpha },
    uSize:      { value: knobs.size },
    uColor:     { value: new Color(knobs.color) },
    uLightPos:  { value: new Vector3(lightPos.x, lightPos.y, lightPos.z) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useFrame(({ clock, camera }) => {
    const mesh = meshRef.current;
    const mat  = matRef.current;
    if (mat) {
      mat.uniforms.uTime.value      = clock.elapsedTime;
      mat.uniforms.uDensity.value   = knobs.density;
      mat.uniforms.uBoilSpeed.value = knobs.boilSpeed;
      mat.uniforms.uAlpha.value     = knobs.alpha;
      mat.uniforms.uSize.value      = knobs.size;
      (mat.uniforms.uColor.value as Color).set(knobs.color);
      (mat.uniforms.uLightPos.value as Vector3).set(lightPos.x, lightPos.y, lightPos.z);
    }
    if (!mesh) return;

    for (let i = 0; i < count; i++) {
      const nY  = count === 1 ? 0.5 : i / (count - 1);
      const a   = hash11(i + 1.7 + knobs.seed) * Math.PI * 2;
      const rad = (hash11(i + 4.3 + knobs.seed) * 0.65 + 0.35) * knobs.scatter;
      const sc  = knobs.size * (0.65 + hash11(i + 8.1 + knobs.seed) * 0.7);

      _puffDummy.position.set(
        knobs.posX + Math.cos(a) * rad,
        knobs.posY + (nY - 0.5) * knobs.spreadY,
        knobs.posZ + Math.sin(a) * rad,
      );
      _puffDummy.scale.setScalar(sc);
      _puffDummy.quaternion.identity();
      _puffDummy.lookAt(camera.position);
      _puffDummy.updateMatrix();
      mesh.setMatrixAt(i, _puffDummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      key={`puffs-${count}`}
      frustumCulled={false}
      renderOrder={40}
    >
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={puffVertexShader}
        fragmentShader={puffFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
        side={DoubleSide}
      />
    </instancedMesh>
  );
}
