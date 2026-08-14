"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { AdditiveBlending, Color, ShaderMaterial } from "three";

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
  // Matériau (inchangé)
  density:      2.0,
  contrast:     0.65,
  lightOffset:  0.42,
  boilSpeed:    0.10,
  scrollSpeed:  0.20,
  alpha:        0.92,
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
  // Matériau (inchangé)
  alpha:        0.95,
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

// ── Utilitaires GLSL ─────────────────────────────────────────────────────────

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
  float a = hash1(i), b = hash1(i+vec2(1,0));
  float c = hash1(i+vec2(0,1)), d = hash1(i+vec2(1,1));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
}
float fbm4(vec2 p) {
  float v=0.0; float a=0.5;
  mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<4;i++){v+=a*noise(p);p=m*p;a*=0.5;}
  return v;
}
float worley(vec2 p, float t) {
  vec2 i=floor(p); float minSq=9.0;
  for(int y=-1;y<=1;y++){
    for(int x=-1;x<=1;x++){
      vec2 cell=vec2(float(x),float(y));
      vec2 h=hash2(i+cell);
      vec2 drift=vec2(sin(t*.65+h.x*6.28),cos(t*.52+h.y*6.28))*.22;
      vec2 pt=cell+h+drift-fract(p);
      minSq=min(minSq,dot(pt,pt));
    }
  }
  return 1.0-sqrt(minSq);
}
float cloudDens(vec2 p, float t) {
  float c1=worley(p*2.0,    t*.8);
  float c2=worley(p*4.5+2.1,t*1.2);
  float c3=worley(p*9.0+5.3,t*1.6);
  float base=c1*.50+c2*.30+c3*.20;
  float detail=fbm4(p*6.0+base*.55+vec2(t*.08,0.0));
  return clamp(base*.62+detail*.48,0.0,1.0);
}
`;

// ── Fragment — Cloud ─────────────────────────────────────────────────────────

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

  vec2 p = vWorldPos.xz * 1.4;
  p     += sin(vWorldPos.y * 0.18 + t * 0.12) * 0.22;
  p.y   -= sc;

  float dens   = cloudDens(p, t);
  float thresh = mix(0.62, 0.42, clamp(uDensity - 0.5, 0.0, 1.0));
  float soft   = mix(0.32, 0.08, clamp(uContrast, 0.0, 1.0));
  float shaped = smoothstep(thresh, thresh + soft, dens);
  if (shaped < 0.004) discard;

  vec2  lDir      = normalize(vec2(-0.35, 0.55));
  float densLight = cloudDens(p + lDir * uLightOffset, t);
  float lit       = smoothstep(0.0, 1.0, clamp(0.5 + (dens - densLight) * 2.4, 0.0, 1.0));

  float h       = vUv.y;
  vec3  baseCol = mix(uRose,    uMauve, smoothstep(0.0, 0.55, h));
  baseCol       = mix(baseCol,  uTeal,  smoothstep(0.45, 1.0, h));
  vec3  col     = mix(baseCol * 0.12, baseCol * 1.5, lit);

  float hotVal  = cloudDens(p * 1.7 + vec2(3.1, t * 0.3 + 1.7), t);
  col = mix(col, uRoseHot, smoothstep(0.55, 0.92, hotVal) * (1.0 - h * 0.85) * 0.65);
  col = mix(col, vec3(1.0, 0.78, 0.9), smoothstep(0.82, 1.0, hotVal) * 0.28 * (1.0 - h));

  gl_FragColor = vec4(col, clamp(shaped * uAlpha, 0.0, 0.92));
}
`;

// ── Fragment — Beam ──────────────────────────────────────────────────────────

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

float hash1v(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noiseB(vec2 p){
  vec2 i=floor(p);vec2 f=fract(p);
  float a=hash1v(i),b=hash1v(i+vec2(1,0)),c=hash1v(i+vec2(0,1)),d=hash1v(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(a,b,u.x)+(c-a)*u.y*(1.0-u.x)+(d-b)*u.x*u.y;
}

void main() {
  vec3  viewDir = normalize(-vViewPos);
  float nDotV   = max(0.0, dot(normalize(vViewNormal), viewDir));

  float core    = pow(nDotV, 5.0);
  float midGlow = pow(nDotV, 2.0);
  float haze    = pow(nDotV, 0.75);

  float flow    = uTime * 1.8;
  float flicker = 0.82 + 0.20 * noiseB(vec2(vUv.x * 4.0, vUv.y * 10.0 - flow))
                       + 0.12 * noiseB(vec2(vUv.x * 9.0 + 2.3, vUv.y * 18.0 - flow * 1.4));
  float beam    = (core * 0.90 + midGlow * 0.52 + haze * 0.22) * flicker;

  float h   = vUv.y;
  vec3  col = mix(uMid, uTip, smoothstep(0.0, 0.6, h));
  col = mix(col, vec3(1.0), core * 0.95);
  col = mix(col, uTail, haze * (1.0 - core) * 0.35 * h);

  float a = clamp(beam * uAlpha, 0.0, 1.0);
  if (a < 0.004) discard;
  gl_FragColor = vec4(col, a);
}
`;

// ── Composant : WormholeCloud3D ───────────────────────────────────────────────

export function WormholeCloud3D({ knobs }: { knobs: CloudKnobs }) {
  const matRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime:        { value: 0 },
    uBendAmp:     { value: knobs.bendAmp },
    uBendAngle:   { value: knobs.bendAngle },
    uBendSpeed:   { value: knobs.bendSpeed },
    uHalfH:       { value: knobs.height / 2 },
    uDensity:     { value: knobs.density },
    uContrast:    { value: knobs.contrast },
    uLightOffset: { value: knobs.lightOffset },
    uBoilSpeed:   { value: knobs.boilSpeed },
    uScrollSpeed: { value: knobs.scrollSpeed },
    uAlpha:       { value: knobs.alpha },
    uRose:        { value: C_ROSE.clone() },
    uRoseHot:     { value: C_ROSE_HOT.clone() },
    uMauve:       { value: C_MAUVE.clone() },
    uTeal:        { value: C_TEAL.clone() },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value        = clock.elapsedTime;
    mat.uniforms.uBendAmp.value     = knobs.bendAmp;
    mat.uniforms.uBendAngle.value   = knobs.bendAngle;
    mat.uniforms.uBendSpeed.value   = knobs.bendSpeed;
    mat.uniforms.uHalfH.value       = knobs.height / 2;
    mat.uniforms.uDensity.value     = knobs.density;
    mat.uniforms.uContrast.value    = knobs.contrast;
    mat.uniforms.uLightOffset.value = knobs.lightOffset;
    mat.uniforms.uBoilSpeed.value   = knobs.boilSpeed;
    mat.uniforms.uScrollSpeed.value = knobs.scrollSpeed;
    mat.uniforms.uAlpha.value       = knobs.alpha;
  });

  return (
    <mesh
      key={`c-${knobs.radiusBottom}-${knobs.radiusTop}-${knobs.height}`}
      position={[knobs.posX, knobs.posY, knobs.posZ]}
      renderOrder={50}
    >
      <cylinderGeometry args={[knobs.radiusTop, knobs.radiusBottom, knobs.height, 64, 48, true]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={bendVertexShader}
        fragmentShader={cloudFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={AdditiveBlending}
        side={2}
      />
    </mesh>
  );
}

// ── Composant : WormholeBeam3D ────────────────────────────────────────────────

export function WormholeBeam3D({ knobs }: { knobs: BeamKnobs }) {
  const matRef = useRef<ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime:      { value: 0 },
    uBendAmp:   { value: knobs.bendAmp },
    uBendAngle: { value: knobs.bendAngle },
    uBendSpeed: { value: knobs.bendSpeed },
    uHalfH:     { value: knobs.height / 2 },
    uAlpha:     { value: knobs.alpha },
    uTip:       { value: C_WHITE.clone() },
    uMid:       { value: C_CYAN.clone() },
    uTail:      { value: C_TEAL.clone() },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useFrame(({ clock }) => {
    const mat = matRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value      = clock.elapsedTime;
    mat.uniforms.uBendAmp.value   = knobs.bendAmp;
    mat.uniforms.uBendAngle.value = knobs.bendAngle;
    mat.uniforms.uBendSpeed.value = knobs.bendSpeed;
    mat.uniforms.uHalfH.value     = knobs.height / 2;
    mat.uniforms.uAlpha.value     = knobs.alpha;
  });

  return (
    <mesh
      key={`b-${knobs.radiusBottom}-${knobs.radiusTop}-${knobs.height}`}
      position={[knobs.posX, knobs.posY, knobs.posZ]}
      renderOrder={51}
    >
      <cylinderGeometry args={[knobs.radiusTop, knobs.radiusBottom, knobs.height, 32, 32, true]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={bendVertexShader}
        fragmentShader={beamFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={AdditiveBlending}
        side={2}
      />
    </mesh>
  );
}
