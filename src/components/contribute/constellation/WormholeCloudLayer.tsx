"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { PerspectiveCamera } from "three";
import { AdditiveBlending, ShaderMaterial, type Mesh } from "three";

import { nebulaVertexShader } from "./nebulaCommon";

export type CloudLayerKnobs = {
  /** Quantité de matière (seuil) — plus élevé = plus de nuages. */
  density: number;
  /** Netteté des bords — bas = fumée, haut = îlots tranchés. */
  contrast: number;
  /** Distance de l'échantillon d'ombre (self-shadowing). */
  lightOffset: number;
  /** Vitesse d'animation des cellules Worley (bouillonnement). */
  boilSpeed: number;
  /** Défilement global (sensation de vol). */
  scrollSpeed: number;
  /** Opacité globale. */
  alpha: number;
};

export const CLOUD_LAYER_DEFAULTS: CloudLayerKnobs = {
  density: 1.2,
  contrast: 0.8,
  lightOffset: 0.35,
  boilSpeed: 0.12,
  scrollSpeed: 0.15,
  alpha: 0.85,
};

/**
 * Couche nuages — Worley animé + FBM détail + Self-Shadowing + Additive.
 *
 * Worley (3 échelles, cellules animées) → volume global / bosse chou-fleur.
 * FBM domain-warp                       → filaments, déchirures cosmiques.
 * 2e échantillon décalé                 → contraste ombre / crête lumineuse.
 * Additive blending                     → blanc lumineux, noir = transparent.
 * Plein écran, sans masque — valider la matière d'abord.
 */
const fragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uDensity;
uniform float uContrast;
uniform float uLightOffset;
uniform float uBoilSpeed;
uniform float uScrollSpeed;
uniform float uAlpha;
uniform float uAspect;

varying vec2 vUv;

// ── Utilitaires ──────────────────────────────────────────────────────────

float hash1(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Hash 2D → 2D (centre de cellule Worley)
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

// ── Worley F1 avec cellules animées ─────────────────────────────────────
// Chaque cellule orbite lentement autour de sa position de repos.
float worley(vec2 p, float t) {
  vec2 i = floor(p);
  float minSq = 9.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 cell = vec2(float(x), float(y));
      vec2 h = hash2(i + cell);
      // Orbite circulaire lente — le "bouillonnement" interne
      vec2 drift = vec2(
        sin(t * 0.65 + h.x * 6.2832),
        cos(t * 0.52 + h.y * 6.2832)
      ) * 0.22;
      vec2 pt = cell + h + drift - fract(p);
      minSq = min(minSq, dot(pt, pt));
    }
  }
  // 1 - F1 : brillant au centre de chaque cellule (bosse cloud)
  return 1.0 - sqrt(minSq);
}

// ── Densité de nuage composite (Worley multi-échelle + FBM) ─────────────
float cloudDens(vec2 p, float t) {
  // 3 échelles Worley : grande structure / volume moyen / détail fin
  float c1 = worley(p * 2.0,         t * 0.8);         // 50%
  float c2 = worley(p * 4.5 + 2.1,   t * 1.2);         // 30%
  float c3 = worley(p * 9.0 + 5.3,   t * 1.6);         // 20%
  float base = c1 * 0.50 + c2 * 0.30 + c3 * 0.20;

  // FBM domain-warpé par la densité Worley → filaments / déchirures
  vec2 warpPt = p * 6.0 + base * 0.55 + vec2(t * 0.08, 0.0);
  float detail = fbm4(warpPt);

  return clamp(base * 0.62 + detail * 0.48, 0.0, 1.0);
}

void main() {
  vec2 uv  = vUv * 2.0 - 1.0;
  uv.x    *= uAspect;

  float t  = uTime * uBoilSpeed;
  float sc = uTime * uScrollSpeed;

  // UV de base : légèrement étiré verticalement (énergie montante)
  vec2 p = vec2(uv.x * 1.1, uv.y * 0.75 - sc);

  // ── Densité principale ───────────────────────────────────────────────
  float dens = cloudDens(p, t);

  // Seuil : uDensity haut = plus de matière (threshold bas)
  float thresh   = mix(0.62, 0.42, clamp(uDensity - 0.5, 0.0, 1.0));
  // Softness : uContrast haut = bords nets, bas = fumée
  float softness = mix(0.30, 0.08, clamp(uContrast, 0.0, 1.0));
  float shaped   = smoothstep(thresh, thresh + softness, dens);

  if (shaped < 0.004) discard;

  // ── Self-shadowing (faux éclairage volumétrique) ─────────────────────
  // Lumière vient du haut-gauche. On échantillonne légèrement en direction
  // de la lumière : si la densité là-bas est plus élevée → ombre sur nous.
  vec2  lightDir     = normalize(vec2(-0.30, 0.55));
  float densToLight  = cloudDens(p + lightDir * uLightOffset, t);

  // lit = 1 → crête exposée (lumière), 0 → creux ombré
  float lit = clamp(0.5 + (dens - densToLight) * 2.2, 0.0, 1.0);
  lit = smoothstep(0.0, 1.0, lit); // courbe douce

  // ── Couleur grayscale ────────────────────────────────────────────────
  // Additive : noir = transparent, blanc = lumière ajoutée.
  // Ombres profondes = gris très sombre, crêtes = blanc pur.
  vec3 col = mix(vec3(0.06, 0.05, 0.08), vec3(1.0), lit);

  float a = clamp(shaped * uAlpha, 0.0, 0.94);

  gl_FragColor = vec4(col, a);
}
`;

export function WormholeCloudLayer({ knobs }: { knobs: CloudLayerKnobs }) {
  const meshRef = useRef<Mesh>(null);
  const matRef  = useRef<ShaderMaterial>(null);
  const { viewport } = useThree();

  const uniforms = useMemo(() => ({
    uTime:        { value: 0 },
    uDensity:     { value: knobs.density },
    uContrast:    { value: knobs.contrast },
    uLightOffset: { value: knobs.lightOffset },
    uBoilSpeed:   { value: knobs.boilSpeed },
    uScrollSpeed: { value: knobs.scrollSpeed },
    uAlpha:       { value: knobs.alpha },
    uAspect:      { value: 1 },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useFrame(({ clock, camera }) => {
    const mesh = meshRef.current;
    const mat  = matRef.current;
    if (!mesh || !mat) return;

    mat.uniforms.uTime.value        = clock.elapsedTime;
    mat.uniforms.uDensity.value     = knobs.density;
    mat.uniforms.uContrast.value    = knobs.contrast;
    mat.uniforms.uLightOffset.value = knobs.lightOffset;
    mat.uniforms.uBoilSpeed.value   = knobs.boilSpeed;
    mat.uniforms.uScrollSpeed.value = knobs.scrollSpeed;
    mat.uniforms.uAlpha.value       = knobs.alpha;
    mat.uniforms.uAspect.value      = viewport.aspect || 1;

    const cam = camera as PerspectiveCamera;
    mesh.position.copy(cam.position);
    mesh.quaternion.copy(cam.quaternion);
    mesh.translateZ(-1.6);
    const h = 2 * Math.tan((cam.fov * Math.PI) / 360) * 1.6;
    const w = h * (viewport.aspect || 1);
    mesh.scale.set(w * 1.05, h * 1.05, 1);
  });

  return (
    <mesh ref={meshRef} renderOrder={51} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={nebulaVertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}
