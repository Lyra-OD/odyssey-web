"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Mesh, NormalBlending, ShaderMaterial } from "three";

import type { VisualTier } from "./useVisualTier";
import { useSkyTheme } from "./skyTheme";
import { idleCameraRef } from "./IdleCameraDrift";
import { skyIntroRef } from "./SkyIntroEclipse";

/**
 * Sky Eclipse — craft étape par étape.
 * Étape 1 (craft) : disque noir + fond. Rien d’autre.
 * Rare idle / intro : chemins existants (hors craft).
 */
const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** Étape 1 — cercle noir parfait. Guide très léger pour le voir sur fond noir. */
const craftStep1Fragment = /* glsl */ `
uniform float uOpacity;
uniform float uGuide;
uniform vec3 uBody;
uniform vec3 uGuideCol;

varying vec2 vUv;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float R = 0.38;

  // Disque noir net
  float body = 1.0 - smoothstep(R - 0.002, R + 0.001, r);

  // Guide craft (temporaire étape 1) — trait fin pour lire la forme
  float guide =
    smoothstep(R - 0.006, R, r) * (1.0 - smoothstep(R, R + 0.01, r));

  vec3 col = uBody * body + uGuideCol * guide * uGuide;
  float alpha = max(body, guide * uGuide) * uOpacity;
  if (alpha < 0.004) discard;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

/** Rare / intro — silhouette simple (hors chantier craft). */
const skyFragment = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uCoronaAmp;
uniform vec3 uBody;
uniform vec3 uCorona;
uniform vec3 uRim;

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

void main() {
  if (uOpacity < 0.01) discard;
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float ang = (r < 1e-4) ? 0.0 : atan(p.y, p.x);
  float t = uTime * 0.07;
  float R = 0.40;
  float body = 1.0 - smoothstep(R - 0.01, R + 0.002, r);
  float rim =
    smoothstep(R - 0.018, R, r) * (1.0 - smoothstep(R, R + 0.035, r));
  float outside = smoothstep(R, R + 0.03, r);
  float fall = exp(-pow((r - R) * 2.4, 1.35));
  float grain = noise(vec2(ang * 3.0 + t * 0.6, r * 4.0));
  float corona =
    outside * fall * (0.65 + 0.35 * grain) * uCoronaAmp;
  vec3 col = uBody * body + uRim * rim * 2.0 + uCorona * corona;
  float alpha = max(body, max(rim * 0.9, corona * 0.7)) * uOpacity;
  if (alpha < 0.008) discard;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

export type EclipseCraftDrive = {
  /** 1 = étape 1 (disque seul). */
  step: 1;
  /** Affiche le guide de contour (craft). */
  showGuide: boolean;
  scaleMul: number;
};

type Props = {
  tier: VisualTier;
  craft?: EclipseCraftDrive;
};

const CRAFT_BASE_SCALE = 5.2;

export function EclipseDisc({ tier, craft }: Props) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);
  const theme = useSkyTheme();
  const cfg = theme.eclipse;
  const idle = theme.scene.idle;
  const isCraft = Boolean(craft);

  const material = useMemo(() => {
    if (isCraft) {
      return new ShaderMaterial({
        vertexShader,
        fragmentShader: craftStep1Fragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        fog: false,
        blending: NormalBlending,
        uniforms: {
          uOpacity: { value: 1 },
          uGuide: { value: 1 },
          uBody: { value: new Color("#000000") },
          uGuideCol: { value: new Color("#3a3a42") },
        },
      });
    }
    return new ShaderMaterial({
      vertexShader,
      fragmentShader: skyFragment,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      fog: false,
      blending: NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uCoronaAmp: { value: cfg.coronaAmp },
        uBody: { value: new Color(cfg.body) },
        uCorona: { value: new Color(cfg.corona) },
        uRim: { value: new Color(cfg.rim) },
      },
    });
  }, [isCraft, cfg.body, cfg.corona, cfg.rim, cfg.coronaAmp]);

  useFrame(({ clock }) => {
    const mat = matRef.current ?? material;
    const mesh = meshRef.current;

    if (craft) {
      mat.uniforms.uOpacity.value = 1;
      mat.uniforms.uGuide.value = craft.showGuide ? 1 : 0;
      if (mesh) {
        mesh.visible = true;
        mesh.position.set(0, 0.05, 0);
        const s = CRAFT_BASE_SCALE * craft.scaleMul;
        mesh.scale.set(s, s, 1);
      }
      return;
    }

    mat.uniforms.uTime.value = clock.elapsedTime;
    let bloom = 0;
    let corona = cfg.coronaAmp;
    let pos: [number, number, number] = cfg.position;

    if (skyIntroRef.active && skyIntroRef.disc > 0.01) {
      bloom = skyIntroRef.disc * 0.95;
      corona = cfg.coronaAmp * (0.7 + skyIntroRef.disc * 0.5);
      pos = [0, 0.05, -4.2];
    } else if (tier === "desktop") {
      const pulse =
        idleCameraRef.rareTarget === "eclipse" ? idleCameraRef.rarePulse : 0;
      bloom = pulse * (idle?.rareEclipsePulse ?? 0.92);
      corona = cfg.coronaAmp * (0.35 + pulse * 1.1);
    }

    mat.uniforms.uOpacity.value = bloom;
    if (mat.uniforms.uCoronaAmp) mat.uniforms.uCoronaAmp.value = corona;
    if (mesh) {
      mesh.visible = bloom > 0.01;
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.scale.set(cfg.scale[0], cfg.scale[1], 1);
    }
  });

  if (!craft && tier !== "desktop") return null;

  return (
    <mesh
      ref={meshRef}
      visible={isCraft}
      position={craft ? [0, 0.05, 0] : cfg.position}
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
