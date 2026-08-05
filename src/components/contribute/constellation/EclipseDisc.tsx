"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Mesh, NormalBlending, ShaderMaterial } from "three";

import type { VisualTier } from "./useVisualTier";
import { useSkyTheme } from "./skyTheme";
import { idleCameraRef } from "./IdleCameraDrift";
import { skyIntroRef } from "./SkyIntroEclipse";

/**
 * Sky Eclipse — soleil → totalité (graine logo).
 * Modes : `craft` | rare idle | intro (OFF).
 */
const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * uEclipse 0 = soleil brillant, 1 = totalité (disque noir + corona).
 * Look cible : photo éclipse totale (rim blanc, corona crème / ambre).
 */
const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uCoronaAmp;
uniform float uEclipse;
uniform vec3 uBody;
uniform vec3 uCorona;
uniform vec3 uRim;
uniform vec3 uSun;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.07 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float ang = (r < 1e-4) ? 0.0 : atan(p.y, p.x);
  float t = uTime * 0.06;
  float e = clamp(uEclipse, 0.0, 1.0);

  float R = 0.38;

  // Disque net
  float body = 1.0 - smoothstep(R - 0.004, R + 0.001, r);

  // Soleil (avant totalité) — disque chaud + halo photosphère
  float sunBody = body;
  float sunHalo = exp(-pow(max(0.0, r - R) * 8.0, 2.0)) * (1.0 - e);
  vec3 sunCol = uSun * (sunBody * 1.15 + sunHalo * 0.85);
  sunCol *= (1.0 - e * 0.98);

  // Corps noir en totalité
  vec3 darkCol = uBody * body * e;

  // Liseré blanc très fin (diamond ring / edge)
  float rim =
    smoothstep(R - 0.01, R, r) * (1.0 - smoothstep(R, R + 0.022, r));
  rim *= smoothstep(0.2, 0.75, e);

  // Corona uniquement hors disque — crème → ambre
  float outside = smoothstep(R - 0.001, R + 0.012, r);
  float fall = exp(-pow((r - R) * 2.1, 1.15));
  float fallFar = exp(-pow((r - R) * 1.15, 1.5)) * 0.45;
  float n1 = fbm(vec2(ang * 1.8 + t * 0.35, r * 2.8));
  float n2 = fbm(vec2(ang * 4.2 - t * 0.25, r * 3.5 + 2.0));
  float streamers =
    pow(max(0.0, sin(ang * 7.0 + n1 * 4.0 + t * 0.5)), 14.0) * 0.55 +
    pow(max(0.0, sin(ang * 3.0 - n2 * 3.0)), 8.0) * 0.25;
  float coronaShape =
    outside * (fall * (0.55 + 0.45 * n1) + fallFar * (0.4 + 0.6 * n2) + streamers * fall);
  float coronaVis = smoothstep(0.15, 0.7, e) * uCoronaAmp;
  float corona = coronaShape * coronaVis;

  vec3 coronaWarm = mix(uRim, uCorona, clamp((r - R) * 2.2, 0.0, 1.0));
  vec3 coronaCol = coronaWarm * corona * 1.25;

  vec3 col = sunCol + darkCol + uRim * rim * 2.4 + coronaCol;

  float alpha = max(sunBody * (1.0 - e * 0.15), body * e);
  alpha = max(alpha, max(rim * 0.95, corona * 0.8));
  alpha = max(alpha, sunHalo * 0.7);
  alpha *= uOpacity;
  if (alpha < 0.008) discard;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

export type EclipseCraftDrive = {
  opacity: number;
  coronaAmp: number;
  scaleMul: number;
  /** 0 = soleil, 1 = totalité (soleil devenu noir). */
  eclipse: number;
};

type Props = {
  tier: VisualTier;
  craft?: EclipseCraftDrive;
};

const CRAFT_BASE_SCALE = 5.4;

export function EclipseDisc({ tier, craft }: Props) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);
  const theme = useSkyTheme();
  const cfg = theme.eclipse;
  const idle = theme.scene.idle;
  const intro = theme.scene.intro;
  const isCraft = Boolean(craft);

  const material = useMemo(() => {
    return new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      fog: false,
      blending: NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: isCraft ? 1 : 0 },
        uCoronaAmp: { value: 1.2 },
        uEclipse: { value: isCraft ? 1 : 1 },
        uBody: { value: new Color("#000000") },
        uCorona: { value: new Color(isCraft ? "#c4a882" : cfg.corona) },
        uRim: { value: new Color("#fff8ee") },
        uSun: { value: new Color("#ffe7b0") },
      },
    });
  }, [cfg.corona, isCraft]);

  useEffect(() => {
    material.vertexShader = vertexShader;
    material.fragmentShader = fragmentShader;
    material.needsUpdate = true;
  }, [material]);

  useFrame(({ clock }) => {
    const mat = matRef.current ?? material;
    const mesh = meshRef.current;
    mat.uniforms.uTime.value = clock.elapsedTime;

    let bloom = 0;
    let corona = cfg.coronaAmp;
    let scaleMul = 1;
    let eclipse = 1;
    let pos: [number, number, number] = cfg.position;

    if (craft) {
      bloom = craft.opacity;
      corona = craft.coronaAmp;
      scaleMul = craft.scaleMul;
      eclipse = craft.eclipse;
      pos = [0, 0.08, 0];
    } else if (skyIntroRef.active && skyIntroRef.disc > 0.01) {
      bloom = skyIntroRef.disc * 0.95;
      corona =
        cfg.coronaAmp *
        (intro?.coronaAmp ?? 1.25) *
        (0.7 + skyIntroRef.disc * 0.5);
      scaleMul = skyIntroRef.discScale;
      eclipse = 1;
      pos = [0, 0.05, -4.2];
    } else if (tier === "desktop") {
      const pulse =
        idleCameraRef.rareTarget === "eclipse" ? idleCameraRef.rarePulse : 0;
      const amp = idle?.rareEclipsePulse ?? 0.92;
      bloom = pulse * amp;
      corona = cfg.coronaAmp * (0.35 + pulse * 1.1);
      eclipse = 1;
    }

    mat.uniforms.uOpacity.value = bloom;
    mat.uniforms.uCoronaAmp.value = corona;
    mat.uniforms.uEclipse.value = eclipse;
    if (mesh) {
      mesh.visible = bloom > 0.01;
      mesh.position.set(pos[0], pos[1], pos[2]);
      const base = craft ? CRAFT_BASE_SCALE : cfg.scale[0];
      mesh.scale.set(base * scaleMul, base * scaleMul, 1);
    }
  });

  if (!craft && tier !== "desktop") return null;

  return (
    <mesh
      ref={meshRef}
      visible={isCraft}
      position={craft ? [0, 0.08, 0] : cfg.position}
      scale={
        craft ? [CRAFT_BASE_SCALE, CRAFT_BASE_SCALE, 1] : cfg.scale
      }
      frustumCulled={false}
      renderOrder={cfg.renderOrder}
    >
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  );
}
