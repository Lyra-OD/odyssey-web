"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Mesh, NormalBlending, ShaderMaterial } from "three";

import type { VisualTier } from "./useVisualTier";
import { useSkyTheme } from "./skyTheme";
import { idleCameraRef } from "./IdleCameraDrift";
import { skyIntroRef } from "./SkyIntroEclipse";

/**
 * Sky Eclipse — soleil → diamond ring → totalité (graine logo).
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
 * Dramaturgie type GIF majestueux :
 * uEclipse 0→1 (soleil → noir)
 * uDiamond  flash « diamond ring » sur le bord
 * Corona soyeuse blanche + micro prominence
 */
const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uCoronaAmp;
uniform float uEclipse;
uniform float uDiamond;
uniform float uDiamondAng;
uniform vec3 uBody;
uniform vec3 uCorona;
uniform vec3 uRim;
uniform vec3 uSun;
uniform vec3 uProminence;

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
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.3, 8.1);
    a *= 0.5;
  }
  return v;
}

float wrapAng(float a) {
  const float PI = 3.14159265;
  return abs(mod(a + PI, PI * 2.0) - PI);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float ang = (r < 1e-4) ? 0.0 : atan(p.y, p.x);
  float t = uTime * 0.05;
  float e = clamp(uEclipse, 0.0, 1.0);
  float dmd = clamp(uDiamond, 0.0, 1.0);

  float R = 0.37;
  float body = 1.0 - smoothstep(R - 0.003, R + 0.0015, r);

  // —— Soleil (s'éteint) ——
  float sunHalo = exp(-pow(max(0.0, r - R) * 7.5, 2.0));
  vec3 sunCol = uSun * (body * 1.2 + sunHalo * 0.9) * (1.0 - e);

  // —— Disque noir (totalité) ——
  vec3 darkCol = uBody * body * e;

  // —— Corona soyeuse (blanc Odyssey) ——
  float outside = smoothstep(R - 0.001, R + 0.018, r);
  float fall = exp(-pow((r - R) * 1.85, 1.05));
  float fallFar = exp(-pow((r - R) * 0.95, 1.4)) * 0.5;
  // Shimmer lent — gazeux, pas « pic »
  float n1 = fbm(vec2(ang * 1.4 + t * 0.25, r * 2.2));
  float n2 = fbm(vec2(ang * 3.2 - t * 0.18, r * 3.0 + 3.1));
  float silk = 0.55 + 0.45 * n1;
  float wisps = pow(max(0.0, n2), 1.8) * 0.55;
  float longRays =
    pow(max(0.0, sin(ang * 5.0 + n1 * 2.5)), 18.0) * 0.22 * fall;
  float coronaShape =
    outside * (fall * silk + fallFar * (0.35 + wisps) + longRays);
  float coronaVis = smoothstep(0.2, 0.78, e) * uCoronaAmp;
  float corona = coronaShape * coronaVis;
  vec3 coronaCol = mix(uRim, uCorona, clamp((r - R) * 1.6, 0.0, 1.0)) * corona;

  // —— Rim fin ——
  float rim =
    smoothstep(R - 0.008, R, r) * (1.0 - smoothstep(R, R + 0.02, r));
  rim *= smoothstep(0.25, 0.8, e) * (1.0 - dmd * 0.35);

  // —— Diamond ring (bead + bloom + croix) ——
  float onEdge = exp(-pow((r - R) * 26.0, 2.0));
  float beadAng = wrapAng(ang - uDiamondAng);
  float bead = exp(-pow(beadAng * 7.5, 2.0)) * onEdge;
  // Bloom large
  float bloom = exp(-pow((r - R) * 6.0, 2.0)) * exp(-pow(beadAng * 3.2, 2.0));
  // Spikes diffraction
  vec2 q = p;
  float cA = cos(uDiamondAng);
  float sA = sin(uDiamondAng);
  vec2 qr = vec2(cA * q.x + sA * q.y, -sA * q.x + cA * q.y);
  float spike =
    (exp(-abs(qr.x) * 55.0) * exp(-abs(qr.y) * 2.2) +
     exp(-abs(qr.y) * 55.0) * exp(-abs(qr.x) * 2.2)) *
    exp(-pow(max(0.0, r - R) * 2.8, 2.0));
  float diamond = (bead * 1.8 + bloom * 1.1 + spike * 0.85) * dmd;
  // Teinte magenta très légère au cœur du bead (comme le GIF)
  vec3 diamondCol =
    mix(uRim, uProminence, bead * 0.25) * diamond * 2.4;

  // —— Micro prominence (totalité) ——
  float promAng = wrapAng(ang - 1.45);
  float prom =
    exp(-pow(promAng * 18.0, 2.0)) *
    exp(-pow((r - R) * 35.0, 2.0)) *
    smoothstep(0.85, 1.0, e) *
    (1.0 - dmd);
  vec3 promCol = uProminence * prom * 1.4;

  vec3 col = sunCol + darkCol + uRim * rim * 1.8 + coronaCol + diamondCol + promCol;

  float alpha = max(body * max(1.0 - e * 0.2, e), sunHalo * (1.0 - e));
  alpha = max(alpha, max(rim * 0.9, corona * 0.85));
  alpha = max(alpha, diamond * 0.95);
  alpha = max(alpha, prom * 0.8);
  alpha *= uOpacity;
  if (alpha < 0.008) discard;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

export type EclipseCraftDrive = {
  opacity: number;
  coronaAmp: number;
  scaleMul: number;
  /** 0 = soleil, 1 = totalité. */
  eclipse: number;
  /** Intensité diamond ring (0–1). */
  diamond: number;
  /** Angle du bead (radians). */
  diamondAng: number;
};

type Props = {
  tier: VisualTier;
  craft?: EclipseCraftDrive;
};

const CRAFT_BASE_SCALE = 5.5;

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
        uCoronaAmp: { value: 1.15 },
        uEclipse: { value: 1 },
        uDiamond: { value: 0 },
        uDiamondAng: { value: 2.4 },
        uBody: { value: new Color("#000000") },
        uCorona: { value: new Color("#dce4f2") },
        uRim: { value: new Color("#ffffff") },
        uSun: { value: new Color("#f4f6fb") },
        uProminence: { value: new Color("#ff6a9a") },
      },
    });
  }, [isCraft]);

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
    let diamond = 0;
    let diamondAng = 2.4;
    let pos: [number, number, number] = cfg.position;

    if (craft) {
      bloom = craft.opacity;
      corona = craft.coronaAmp;
      scaleMul = craft.scaleMul;
      eclipse = craft.eclipse;
      diamond = craft.diamond;
      diamondAng = craft.diamondAng;
      pos = [0, 0.06, 0];
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
    mat.uniforms.uDiamond.value = diamond;
    mat.uniforms.uDiamondAng.value = diamondAng;
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
      position={craft ? [0, 0.06, 0] : cfg.position}
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
