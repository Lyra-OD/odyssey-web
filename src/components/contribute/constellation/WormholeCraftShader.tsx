"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { PerspectiveCamera } from "three";
import { Color, ShaderMaterial, type Mesh } from "three";

import { nebulaVertexShader } from "./nebulaCommon";

/** Knobs craft wormhole — Quiet Luxury (blanc / argent). */
export type WormholeCraftKnobs = {
  /** 0 = points figés · ~2 = warp plein. */
  velocity: number;
  /** Courbe d’étirement radial (A24 : ~1.6–2). */
  stretchPow: number;
  /** Densité angulaire (secteur étoiles). */
  density: number;
  /** Opacité globale du voile. */
  opacity: number;
  /** Pic HDR tête de traînée (accroche bloom). */
  headGain: number;
  /** Longueur relative de la queue (0–1). */
  tail: number;
  /** Soft du centre (évite singularité). */
  coreSoft: number;
};

export const WORMHOLE_CRAFT_DEFAULTS: WormholeCraftKnobs = {
  velocity: 1.15,
  stretchPow: 1.75,
  density: 48,
  opacity: 0.92,
  headGain: 1.35,
  tail: 0.72,
  coreSoft: 0.08,
};

/**
 * Warp Quiet Luxury — plane plein écran.
 * Polar + stretch ∝ velocity → streaks ; velocity→0 → points → alpha craft.
 */
const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uVelocity;
uniform float uStretchPow;
uniform float uDensity;
uniform float uOpacity;
uniform float uHeadGain;
uniform float uTail;
uniform float uCoreSoft;
uniform float uAspect;
uniform vec3 uSilver;
uniform vec3 uWhite;

varying vec2 vUv;

float hash11(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uAspect;

  float r = length(p);
  float ang = atan(p.y, p.x);

  // Soft core — pas de singularité
  float core = smoothstep(0.0, uCoreSoft, r);

  float vel = max(uVelocity, 0.0);
  float stretch = pow(vel, uStretchPow);

  // Secteurs angulaires → étoiles aléatoires sur 360°
  float sectors = max(uDensity, 8.0);
  float aId = floor((ang + 3.14159265) / 6.2831853 * sectors);
  float aFrac = fract((ang + 3.14159265) / 6.2831853 * sectors);
  float starGate = smoothstep(0.0, 0.12, aFrac) * smoothstep(1.0, 0.88, aFrac);

  float h0 = hash11(aId * 19.17 + 2.3);
  float h1 = hash11(aId * 7.91 + 11.4);
  float h2 = hash11(aId * 3.3 + 5.7);

  // Avance radiale (loop) — matière vers la caméra
  float travel = uTime * (0.15 + vel * 0.85) + h0;
  // Étirement warp : le bruit radial s’allonge avec vel
  float radialScale = 1.0 + stretch * 5.5;
  float z = fract(r * radialScale * (0.55 + h1 * 0.9) - travel);

  // Tête = pic net ; queue soft proportionnelle à stretch
  float headW = mix(0.035, 0.012, clamp(stretch * 0.35, 0.0, 1.0));
  float tailW = mix(0.08, 0.55, clamp(stretch * uTail, 0.0, 1.0));
  float head = exp(-z * z / max(headW * headW, 1e-5));
  float body = exp(-z / max(tailW, 1e-4));
  float streak = mix(head, body, 0.55) * head + body * 0.35;
  streak *= starGate;

  // 2ᵉ octave angulaire très faible — grain argenté
  float grain = hash21(vec2(aId, floor(z * 40.0 + h2 * 10.0)));
  streak *= 0.82 + 0.18 * grain;

  // Falloff bord + centre
  float vignette = 1.0 - smoothstep(0.75, 1.45, r);
  float lum = streak * core * vignette;

  // Tête HDR pour bloom ; queue plus argent
  float headMask = pow(head * starGate * core, 1.4);
  vec3 col = mix(uSilver, uWhite, headMask);
  col *= (0.55 + uHeadGain * headMask);

  // Quand vel tombe : streaks → points (déjà via stretch) + fade craft
  float alive = smoothstep(0.0, 0.08, vel) * 0.35 + smoothstep(0.0, 0.55, vel) * 0.65;
  float alpha = lum * uOpacity * alive;
  alpha = clamp(alpha, 0.0, 1.0);

  gl_FragColor = vec4(col, alpha);
}
`;

export function WormholeCraftPlane({
  knobs,
}: {
  knobs: WormholeCraftKnobs;
}) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);
  const { viewport } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uVelocity: { value: knobs.velocity },
      uStretchPow: { value: knobs.stretchPow },
      uDensity: { value: knobs.density },
      uOpacity: { value: knobs.opacity },
      uHeadGain: { value: knobs.headGain },
      uTail: { value: knobs.tail },
      uCoreSoft: { value: knobs.coreSoft },
      uAspect: { value: 1 },
      uSilver: { value: new Color("#c8d0d8") },
      uWhite: { value: new Color("#f5f7fa") },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- synced in useFrame
    [],
  );

  useFrame(({ clock, camera }) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uVelocity.value = knobs.velocity;
    mat.uniforms.uStretchPow.value = knobs.stretchPow;
    mat.uniforms.uDensity.value = knobs.density;
    mat.uniforms.uOpacity.value = knobs.opacity;
    mat.uniforms.uHeadGain.value = knobs.headGain;
    mat.uniforms.uTail.value = knobs.tail;
    mat.uniforms.uCoreSoft.value = knobs.coreSoft;
    mat.uniforms.uAspect.value = viewport.aspect || 1;

    const cam = camera as PerspectiveCamera;
    mesh.position.copy(cam.position);
    mesh.quaternion.copy(cam.quaternion);
    mesh.translateZ(-1.6);
    const h = 2 * Math.tan((cam.fov * Math.PI) / 360) * 1.6;
    const w = h * (viewport.aspect || 1);
    mesh.scale.set(w * 1.05, h * 1.05, 1);
  });

  return (
    <mesh ref={meshRef} renderOrder={50} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={nebulaVertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
