"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { PerspectiveCamera } from "three";
import { AdditiveBlending, Color, ShaderMaterial, type Mesh } from "three";

import { nebulaNoiseGlsl, nebulaVertexShader } from "./nebulaCommon";
import { defaultSkyTheme } from "./skyTheme";

/**
 * Layer 1 — BeamPlane paramétrique.
 * bottomWidth / topWidth indépendants → trapèze parfait.
 */
export type WormholeCraftKnobs = {
  /** Largeur à la base (près de nous). */
  bottomWidth: number;
  /** Largeur à l'apex (point de fuite en haut). */
  topWidth: number;
  /** Vitesse du scintillement. */
  velocity: number;
  /** Intensité globale. */
  alpha: number;
};

export const WORMHOLE_CRAFT_DEFAULTS: WormholeCraftKnobs = {
  bottomWidth: 2.0,
  topWidth: 0.04,
  velocity: 0.45,
  alpha: 0.92,
};

const fragmentShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uBottomWidth;
uniform float uTopWidth;
uniform float uVelocity;
uniform float uAlpha;
uniform float uAspect;
uniform vec3  uTip;
uniform vec3  uMid;
uniform vec3  uTail;

varying vec2 vUv;

${nebulaNoiseGlsl}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uAspect;

  // t = 0 en bas de l'ecran, 1 en haut
  float t = vUv.y;

  // Trapeze parfait : interpolation lineaire entre bottomWidth et topWidth
  float halfW = mix(uBottomWidth, uTopWidth, t);

  // Coordonnee normalisee : 0 = centre, 1 = bord du faisceau
  float nx = uv.x / max(halfW, 1e-4);

  // Hors du faisceau : transparent
  if (abs(nx) > 1.6) discard;

  // ── Couches de lumiere ───────────────────────────────────────────────
  float core    = exp(-nx * nx * 14.0);  // blanc pur, centre fin
  float midGlow = exp(-nx * nx * 2.8);  // gasTeal, plus large
  float haze    = exp(-nx * nx * 0.45); // halo diffus, fondu vers le vide

  // Scintillement vertical (streaks de lumiere qui montent)
  float flow = uTime * (0.1 + max(uVelocity, 0.0) * 0.45);
  float s1   = noise(vec2(nx * 2.0,   t * 9.0  - flow * 3.5));
  float s2   = noise(vec2(nx * 5.0 + 3.7, t * 14.0 - flow * 5.2));
  float flicker = 0.68 + 0.38 * s1 * 0.7 + 0.22 * s2;

  float beam = (core + midGlow * 0.55 + haze * 0.22) * flicker;

  // ── Couleur : blanc pur au centre → gasTeal → fondu ─────────────────
  vec3 col = mix(uMid, uTip, smoothstep(0.0, 0.55, t));
  col = mix(col, vec3(1.0), core * 0.85);       // centre blanc
  col = mix(col, uTail, haze * (1.0 - core) * 0.35); // bords teal fonce

  float a = clamp(beam * uAlpha, 0.0, 1.0);

  gl_FragColor = vec4(col, a);
}
`;

export function WormholeCraftPlane({ knobs }: { knobs: WormholeCraftKnobs }) {
  const meshRef = useRef<Mesh>(null);
  const matRef  = useRef<ShaderMaterial>(null);
  const { viewport } = useThree();

  const uniforms = useMemo(() => {
    const teal = defaultSkyTheme.shootingStars.rareTints.teal;
    return {
      uTime:       { value: 0 },
      uBottomWidth:{ value: knobs.bottomWidth },
      uTopWidth:   { value: knobs.topWidth },
      uVelocity:   { value: knobs.velocity },
      uAlpha:      { value: knobs.alpha },
      uAspect:     { value: 1 },
      uTip:        { value: new Color(teal.tip) },
      uMid:        { value: new Color(teal.mid) },
      uTail:       { value: new Color(teal.tail) },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(({ clock, camera }) => {
    const mesh = meshRef.current;
    const mat  = matRef.current;
    if (!mesh || !mat) return;

    mat.uniforms.uTime.value        = clock.elapsedTime;
    mat.uniforms.uBottomWidth.value = knobs.bottomWidth;
    mat.uniforms.uTopWidth.value    = knobs.topWidth;
    mat.uniforms.uVelocity.value    = knobs.velocity;
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
        blending={AdditiveBlending}
      />
    </mesh>
  );
}
