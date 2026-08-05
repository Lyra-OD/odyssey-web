"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Mesh, ShaderMaterial } from "three";

import type { VisualTier } from "./useVisualTier";
import { useSkyTheme } from "./skyTheme";
import { idleCameraRef } from "./IdleCameraDrift";
import { skyIntroRef } from "./SkyIntroEclipse";

/**
 * Sky Eclipse — disque sombre + corona neutre (graine logo Halo-Éclipse).
 * Modes : `craft` (lab) | rare idle | intro (désactivée — craft d’abord).
 * Knobs : `skyTheme.eclipse`
 */
const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
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

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.08;
    a *= 0.5;
  }
  return v;
}

void main() {
  if (uOpacity < 0.01) discard;

  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float ang = atan(p.y, p.x);

  float t = uTime * 0.07;
  float grain = fbm(vec2(ang * 1.2 + t * 0.35, r * 3.2 - t));

  float body = 1.0 - smoothstep(0.38, 0.46, r);
  float rim = exp(-pow((r - 0.44) * 28.0, 2.0));
  float coronaCore = exp(-pow((r - 0.52) * 7.5, 2.0));
  float coronaOuter = exp(-pow((r - 0.68) * 4.2, 2.0)) * (0.55 + 0.45 * grain);
  float spikes = pow(max(0.0, sin(ang * 3.0 + t + grain * 2.0)), 8.0) * 0.12;
  float corona = (coronaCore * 0.85 + coronaOuter * 0.65 + spikes) * uCoronaAmp;

  vec3 col = uBody * body;
  col += uRim * rim * 1.15;
  col += mix(uCorona, uRim, grain * 0.35) * corona;

  float alpha = body * 0.92 + rim * 0.55 + corona * 0.5;
  alpha *= uOpacity;
  alpha = clamp(alpha, 0.0, 0.85);
  if (alpha < 0.008) discard;

  gl_FragColor = vec4(col, alpha);
}
`;

/** Pilotage lab craft — prioritaire sur rare / intro. */
export type EclipseCraftDrive = {
  opacity: number;
  coronaAmp: number;
  scaleMul: number;
};

type Props = {
  tier: VisualTier;
  /** Lab `/test-eclipse` — force le disc visible et centré. */
  craft?: EclipseCraftDrive;
};

export function EclipseDisc({ tier, craft }: Props) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);
  const theme = useSkyTheme();
  const cfg = theme.eclipse;
  const idle = theme.scene.idle;
  const intro = theme.scene.intro;

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uCoronaAmp: { value: cfg.coronaAmp },
          uBody: { value: new Color(cfg.body) },
          uCorona: { value: new Color(cfg.corona) },
          uRim: { value: new Color(cfg.rim) },
        },
      }),
    [cfg.body, cfg.corona, cfg.rim, cfg.coronaAmp],
  );

  useFrame(({ clock }) => {
    const mat = matRef.current ?? material;
    const mesh = meshRef.current;
    mat.uniforms.uTime.value = clock.elapsedTime;

    let bloom = 0;
    let corona = cfg.coronaAmp;
    let scaleMul = 1;
    let pos: [number, number, number] = cfg.position;

    if (craft) {
      bloom = craft.opacity;
      corona = craft.coronaAmp;
      scaleMul = craft.scaleMul;
      pos = [0, 0, -3.6];
    } else if (skyIntroRef.active && skyIntroRef.disc > 0.01) {
      bloom = skyIntroRef.disc * 0.95;
      corona =
        cfg.coronaAmp *
        (intro?.coronaAmp ?? 1.25) *
        (0.7 + skyIntroRef.disc * 0.5);
      scaleMul = skyIntroRef.discScale;
      pos = [0, 0.05, -4.2];
    } else if (tier === "desktop") {
      const pulse =
        idleCameraRef.rareTarget === "eclipse" ? idleCameraRef.rarePulse : 0;
      const amp = idle?.rareEclipsePulse ?? 0.92;
      bloom = pulse * amp;
      corona = cfg.coronaAmp * (0.35 + pulse * 1.1);
    }

    mat.uniforms.uOpacity.value = bloom;
    mat.uniforms.uCoronaAmp.value = corona;
    if (mesh) {
      mesh.visible = bloom > 0.01;
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.scale.set(
        cfg.scale[0] * scaleMul,
        cfg.scale[1] * scaleMul,
        cfg.scale[2],
      );
    }
  });

  if (!craft && tier !== "desktop") return null;

  return (
    <mesh
      ref={meshRef}
      visible={false}
      position={cfg.position}
      scale={cfg.scale}
      frustumCulled={false}
      renderOrder={cfg.renderOrder}
    >
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  );
}
