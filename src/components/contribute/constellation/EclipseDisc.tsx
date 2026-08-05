"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Mesh, NormalBlending, ShaderMaterial } from "three";

import type { VisualTier } from "./useVisualTier";
import { useSkyTheme } from "./skyTheme";
import { idleCameraRef } from "./IdleCameraDrift";
import { skyIntroRef } from "./SkyIntroEclipse";

/**
 * Sky Eclipse — disque sombre + corona (graine logo).
 * Modes : `craft` (lab) | rare idle | intro (OFF).
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

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  // Évite NaN au centre (atan(0,0))
  float ang = (r < 1e-4) ? 0.0 : atan(p.y, p.x);
  float t = uTime * 0.08;

  float R = 0.40;
  float body = 1.0 - smoothstep(R - 0.01, R + 0.002, r);

  float rim =
    smoothstep(R - 0.018, R, r) * (1.0 - smoothstep(R, R + 0.035, r));

  float outside = smoothstep(R, R + 0.03, r);
  float fall = exp(-pow((r - R) * 2.4, 1.35));
  float grain = noise(vec2(ang * 3.0 + t * 0.6, r * 4.0));
  float streamers =
    pow(max(0.0, sin(ang * 6.0 + t + grain * 2.5)), 12.0) * 0.4;
  float corona =
    outside * fall * (0.65 + 0.35 * grain + streamers) * uCoronaAmp;

  vec3 col = uBody * body;
  col += uRim * rim * 2.2;
  col += mix(uCorona, uRim, 0.35 + grain * 0.2) * corona * 1.35;

  float alpha = max(body, max(rim * 0.95, corona * 0.75));
  alpha *= uOpacity;
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

export type EclipseCraftDrive = {
  opacity: number;
  coronaAmp: number;
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
  const intro = theme.scene.intro;
  const isCraft = Boolean(craft);

  const material = useMemo(() => {
    const mat = new ShaderMaterial({
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
        uBody: { value: new Color(isCraft ? "#000000" : cfg.body) },
        uCorona: { value: new Color(isCraft ? "#c5d0e4" : cfg.corona) },
        uRim: { value: new Color(isCraft ? "#ffffff" : cfg.rim) },
      },
    });
    return mat;
  }, [cfg.body, cfg.corona, cfg.rim, isCraft]);

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
    let pos: [number, number, number] = cfg.position;

    if (craft) {
      bloom = Math.max(0.85, craft.opacity);
      corona = Math.max(1.05, craft.coronaAmp);
      scaleMul = craft.scaleMul;
      pos = [0, 0.1, 0];
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
      const base = craft ? CRAFT_BASE_SCALE : cfg.scale[0];
      mesh.scale.set(base * scaleMul, base * scaleMul, 1);
    }
  });

  if (!craft && tier !== "desktop") return null;

  return (
    <mesh
      ref={meshRef}
      visible={isCraft}
      position={craft ? [0, 0.1, 0] : cfg.position}
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
