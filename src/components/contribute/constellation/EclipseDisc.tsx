"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  Mesh,
  NormalBlending,
  PerspectiveCamera,
  ShaderMaterial,
  Vector3,
} from "three";

import type { VisualTier } from "./useVisualTier";
import { useSkyTheme } from "./skyTheme";
import { idleCameraRef } from "./IdleCameraDrift";
import { skyIntroRef } from "./SkyIntroEclipse";

/**
 * EclipseDisc — trou noir (lentille) + disque d’accrétion FBM + burn-away.
 */
const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Singularité + lentille UV + photon ring + accrétion FBM.
 * uProgress → implode / burn. Mobile : FBM 3 oct + cell4.
 */
const craftFragment = /* glsl */ `
uniform float uOpacity;
uniform float uCoronaAmp;
uniform float uDiamond;
uniform float uAlignment;
uniform float uBodyFade;
uniform float uProgress;
uniform float uSingularityScale;
uniform float uAspect;
uniform float uTime;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
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
  v += a * noise(p); p = p * 2.02 + vec2(1.1, 6.3); a *= 0.5;
  v += a * noise(p); p = p * 2.01 + vec2(2.3, 1.7); a *= 0.5;
  v += a * noise(p);
  return v;
}

float cell4(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 r00 = vec2(hash(i), hash(i + 19.7));
  vec2 r10 = vec2(hash(i + vec2(1.0, 0.0)), hash(i + 31.3));
  vec2 r01 = vec2(hash(i + vec2(0.0, 1.0)), hash(i + 47.1));
  vec2 r11 = vec2(hash(i + vec2(1.0, 1.0)), hash(i + 67.9));
  float d00 = length(r00 - f);
  float d10 = length(vec2(1.0, 0.0) + r10 - f);
  float d01 = length(vec2(0.0, 1.0) + r01 - f);
  float d11 = length(vec2(1.0, 1.0) + r11 - f);
  return min(min(d00, d10), min(d01, d11));
}

void main() {
  // Plein écran : UVs centrés + ratio pour un cercle parfait
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uAspect;

  float implode = smoothstep(0.0, 0.55, uProgress);
  float burn = smoothstep(0.4, 1.0, uProgress);
  float die = smoothstep(0.85, 1.0, uProgress);

  vec2 sing = vec2(
    (1.0 - uAlignment) * -0.16 * uAspect,
    (1.0 - uAlignment) * 0.035
  );
  float R = 0.28 * uSingularityScale * (1.0 + 0.28 * implode);

  // —— Lentille gravitationnelle (UV warp) ——
  vec2 q = p - sing;
  float rQ = length(q);
  float warpStr = 0.055 * (1.0 + 0.35 * implode) * (1.0 - burn * 0.5);
  float rSafe = max(rQ, 0.018);
  float pull = clamp(warpStr / rSafe, 0.0, 0.88);
  vec2 qLens = q * (1.0 - pull);
  float swirl = 0.12 * warpStr * (1.0 - smoothstep(0.0, 0.55, rSafe));
  float ca = cos(swirl);
  float sa = sin(swirl);
  qLens = vec2(ca * qLens.x - sa * qLens.y, sa * qLens.x + ca * qLens.y);
  vec2 pLens = sing + qLens;

  // Burn scatter (espace écran)
  p *= 1.0 + 0.07 * implode;
  float radScreen = length(p - sing);
  vec2 dirScreen = (radScreen > 1e-4) ? (p - sing) / radScreen : vec2(1.0, 0.0);
  p += dirScreen * (fbm(dirScreen * 2.8 + 1.7) - 0.45) * burn * 0.05;

  q = p - sing;
  rQ = length(q);
  dirScreen = (rQ > 1e-4) ? q / rQ : vec2(1.0, 0.0);

  float radL = length(pLens - sing);
  vec2 dirL = (radL > 1e-4) ? (pLens - sing) / radL : vec2(1.0, 0.0);

  float breath = 1.0 + 0.025 * sin(uTime * 0.65) * (1.0 - burn);

  // —— Horizon des événements (gouffre) ——
  float sdf = rQ - R;
  float abyss = pow(clamp(-sdf / max(R, 1e-3), 0.0, 1.0), 0.55);
  float horizon = pow(smoothstep(0.0, 1.0, abyss), 1.35) * uBodyFade;

  // —— Photon ring HDR ——
  float photon =
    exp(-pow(sdf * 62.0, 2.0)) *
    smoothstep(-0.02, 0.01, sdf) *
    (5.2 + 1.5 * breath) *
    uBodyFade *
    (1.0 - burn * 0.35);

  // —— Disque d’accrétion FBM sur UVs lentillés ——
  float dist = max(0.0, sdf);
  float distAsh = dist / (1.0 + burn * 0.18);
  float distL = max(0.0, radL - R);
  float distLAsh = distL / (1.0 + burn * 0.18);
  float outside = smoothstep(0.0, 0.025, sdf);

  float t = uTime * 0.028;
  vec2 boil =
    dirL * 2.35 +
    vec2(distLAsh * 2.5, t * 0.5) +
    vec2(
      fbm(dirL * 1.55 + vec2(t * 1.0, distLAsh)) * 0.4,
      fbm(dirL * 1.85 - vec2(t * 0.75, 2.2)) * 0.4
    );
  float n1 = fbm(boil + vec2(t * 0.35, 0.0));
  float n2 = fbm(boil * 1.8 + vec2(-t * 0.22, 3.3));

  float silk = 0.52 + 0.48 * n1;
  float feathers = pow(max(0.0, n2), 2.25) * 0.62;
  float spokes =
    pow(max(0.0, n1 * 0.65 + n2 * 0.35), 3.3) * exp(-distLAsh * 2.4) * 0.45;

  float limbGate = smoothstep(0.0, 0.035, distAsh);
  float nearHalo = exp(-pow(distAsh * 3.6, 1.2)) * limbGate;
  float midVeil = exp(-pow(distAsh * 1.95, 1.12)) * 0.52;
  float farVeil = exp(-pow(distAsh * 1.25, 1.08)) * 0.4;

  float wNear = mix(1.35, 1.05, uAlignment);
  float wFar = mix(0.22, 1.0, uAlignment);
  float asym = 0.84 + 0.16 * clamp(0.5 + 0.4 * dirL.y - 0.15 * dirL.x, 0.0, 1.0);

  float accretion =
    outside * asym * (
      nearHalo * silk * wNear +
      midVeil * (0.38 + feathers) * mix(0.35, 1.0, uAlignment) +
      farVeil * (0.28 + feathers * 0.55) * wFar +
      spokes * mix(0.2, 1.0, uAlignment)
    );

  float grain = (hash(pLens * 380.0 + floor(uTime * 7.0) * 0.1) - 0.5) * 0.035;
  accretion = max(0.0, accretion + grain * smoothstep(0.02, 0.22, accretion));
  float corona = accretion * uCoronaAmp * breath * uBodyFade;

  float contact =
    smoothstep(0.45, 0.88, uAlignment) *
    (1.0 - smoothstep(0.92, 1.0, uAlignment));
  float beadAng = pow(max(0.0, -dirScreen.x * 0.95 + dirScreen.y * 0.15), 48.0);
  float beadRad = exp(-pow((distAsh - 0.008) * 28.0, 2.0));
  float diamond =
    outside * contact * beadAng * beadRad *
    (0.55 + 1.8 * uDiamond) * uBodyFade * (1.0 - burn);

  // —— Burn-away, spectacle Ouest ——
  float field = fbm(dirL * 3.1 + vec2(radL * 1.4, burn * 0.5));
  float cells = 1.0 - cell4(dirL * 5.5 + radL * 3.2);
  float hybrid = field * 0.68 + cells * 0.32;
  float east = max(dirScreen.x, 0.0);
  float west = max(-dirScreen.x, 0.0);
  float threshold = mix(-0.15, 1.22, burn) + east * 0.22 * burn;
  float band = 0.11 + 0.06 * burn;
  float alive = smoothstep(threshold - band, threshold + band, hybrid);

  vec3 col = vec3(1.0) * (corona * 1.2 + diamond * 2.6 + photon);
  col *= 1.0 - horizon;
  col *= alive;

  float edge = 1.0 - abs(alive * 2.0 - 1.0);
  edge *= edge;
  float westGlow = 0.55 + 0.75 * west;
  col += vec3(1.0) * edge * 4.0 * burn * (1.0 - die) * westGlow;

  col *= 1.0 - die;

  float matter = max(horizon, max(corona * 0.92, max(diamond * 0.95, photon * 0.4)));
  matter *= alive;
  float alpha = matter * (1.0 - die) * uOpacity;
  alpha = max(alpha, edge * burn * 0.35 * (1.0 - die) * uOpacity);
  alpha = max(alpha, horizon * (1.0 - die) * uOpacity);

  if (alpha < 0.004 && length(col) < 0.01) discard;

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

/** Rare sky — hors craft. */
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
  float ang = atan(p.y, p.x);
  float t = uTime * 0.07;
  float R = 0.40;
  float body = 1.0 - smoothstep(R - 0.01, R + 0.002, r);
  float rim =
    smoothstep(R - 0.018, R, r) * (1.0 - smoothstep(R, R + 0.035, r));
  float outside = smoothstep(R, R + 0.03, r);
  float fall = exp(-pow((r - R) * 2.4, 1.35));
  float grain = noise(vec2(ang * 3.0 + t * 0.6, r * 4.0));
  float corona = outside * fall * (0.65 + 0.35 * grain) * uCoronaAmp;
  vec3 col = uBody * body + uRim * rim * 2.0 + uCorona * corona;
  float alpha = max(body, max(rim * 0.9, corona * 0.7)) * uOpacity;
  if (alpha < 0.008) discard;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

export type EclipseCraftDrive = {
  step: 1 | 2 | 3;
  showGuide: boolean;
  scaleMul: number;
  coronaAmp: number;
  diamondAmp: number;
  alignment: number;
  bodyFade: number;
  /** 0 = singularité, 1 = cendres éteintes. */
  progress: number;
  offsetX: number;
  offsetY: number;
};

type Props = {
  tier: VisualTier;
  craft?: EclipseCraftDrive;
};

const _vpTarget = new Vector3(0, 0, 0);

export function EclipseDisc({ tier, craft }: Props) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<ShaderMaterial>(null);
  const theme = useSkyTheme();
  const cfg = theme.eclipse;
  const idle = theme.scene.idle;
  const isCraft = Boolean(craft);
  const { camera, viewport, size } = useThree();

  const material = useMemo(() => {
    if (isCraft) {
      return new ShaderMaterial({
        vertexShader,
        fragmentShader: craftFragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        fog: false,
        blending: NormalBlending,
        uniforms: {
          uOpacity: { value: 1 },
          uCoronaAmp: { value: 1 },
          uDiamond: { value: 0 },
          uAlignment: { value: 1 },
          uBodyFade: { value: 1 },
          uProgress: { value: 0 },
          uSingularityScale: { value: 1 },
          uAspect: { value: 1 },
          uTime: { value: 0 },
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

  useEffect(() => {
    material.vertexShader = vertexShader;
    material.fragmentShader = isCraft ? craftFragment : skyFragment;
    material.needsUpdate = true;
  }, [material, isCraft]);

  useFrame(({ clock }) => {
    const mat = matRef.current ?? material;
    const mesh = meshRef.current;

    if (craft) {
      mat.uniforms.uTime.value = clock.elapsedTime;
      mat.uniforms.uOpacity.value = 1;
      mat.uniforms.uCoronaAmp.value =
        craft.step >= 2 ? craft.coronaAmp : 0;
      mat.uniforms.uDiamond.value =
        craft.step >= 2 ? craft.diamondAmp : 0;
      mat.uniforms.uAlignment.value = craft.alignment;
      mat.uniforms.uBodyFade.value = craft.bodyFade;
      mat.uniforms.uProgress.value = craft.progress;
      mat.uniforms.uSingularityScale.value = craft.scaleMul;
      mat.uniforms.uAspect.value = Math.max(size.width / size.height, 0.01);

      if (mesh) {
        mesh.visible = true;
        // Plane = 100% du viewport (overscan léger anti-clip)
        const cam = camera as PerspectiveCamera;
        _vpTarget.set(0, 0, 0);
        const vp = viewport.getCurrentViewport(cam, _vpTarget);
        mesh.position.set(0, 0, 0);
        mesh.scale.set(vp.width * 1.06, vp.height * 1.06, 1);
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
      position={craft ? [0, 0, 0] : cfg.position}
      scale={craft ? [1, 1, 1] : cfg.scale}
      frustumCulled={false}
      renderOrder={cfg.renderOrder}
    >
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} ref={matRef} attach="material" />
    </mesh>
  );
}
