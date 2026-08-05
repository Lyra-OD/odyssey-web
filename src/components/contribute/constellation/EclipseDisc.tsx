"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Color,
  Mesh,
  NormalBlending,
  PerspectiveCamera,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";

import type { VisualTier } from "./useVisualTier";
import { useSkyTheme } from "./skyTheme";
import { idleCameraRef } from "./IdleCameraDrift";
import { skyIntroRef } from "./SkyIntroEclipse";

/**
 * EclipseDisc — craft : occultation (trou noir fixe, soleil derrière) · sky rare.
 */
const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Craft — transit : trou noir fixe, soleil passe derrière (droite → gauche).
 * uAlignment = phase 0→1 (0.5 = totalité). uProgress = révélation ciel.
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
uniform vec2 uOffset;

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

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uAspect;

  // Phase unique : 0 départ · 0.5 totalité · 1 fin
  float phase = clamp(uAlignment, 0.0, 1.0);
  float skyOut = clamp(uProgress, 0.0, 1.0);
  float breath = 1.0 + 0.018 * sin(uTime * 0.65);

  float S = 0.37 * max(uSingularityScale, 0.5);
  float Rsun = S * 0.90;
  float Rmoon = S * 1.04;

  // Trou noir fixe
  vec2 moon = vec2(0.0, 0.0);
  // Soleil : arc droite → gauche (passe derrière)
  float travel = 0.78 * max(uAspect, 1.0);
  float sunX = mix(travel, -travel, phase) + uOffset.x * 0.2;
  float sunY = -0.025 + 0.035 * sin(phase * 3.14159265) + uOffset.y * 0.2;
  vec2 sun = vec2(sunX, sunY);

  vec2 qSun = p - sun;
  float rSun = length(qSun);
  vec2 dirSun = (rSun > 1e-4) ? qSun / rSun : vec2(1.0, 0.0);

  vec2 qMoon = p - moon;
  float rMoon = length(qMoon);
  vec2 dirMoon = (rMoon > 1e-4) ? qMoon / rMoon : vec2(1.0, 0.0);

  float sdfMoon = rMoon - Rmoon;
  float sdfSun = rSun - Rsun;

  float moonMask = 1.0 - smoothstep(-0.0025, 0.0025, sdfMoon);
  float sunMask = 1.0 - smoothstep(-0.003, 0.003, sdfSun);
  float sunVisible = sunMask * (1.0 - moonMask);

  // Séparation centres → couverture / totalité
  float d = length(sun - moon);
  float cTot = max(Rmoon - Rsun, 0.001);
  float cExt = Rmoon + Rsun;
  float overlap = 1.0 - smoothstep(cTot, cExt, d);
  float totality = 1.0 - smoothstep(0.0, cTot * 1.15, d);

  // Limb darkening léger (pas de collier noir au bord)
  float limbDark = mix(0.78, 1.0, pow(clamp(1.0 - rSun / max(Rsun, 1e-3), 0.0, 1.0), 0.7));

  // Corona soie — chevauche le limbe (pas de trou noir entre disque et glow)
  float distSun = max(0.0, sdfSun);
  float t = uTime * 0.028;
  vec2 boil =
    dirSun * 2.35 +
    vec2(distSun * 2.5, t * 0.5) +
    vec2(
      fbm(dirSun * 1.55 + vec2(t * 1.0, distSun)) * 0.4,
      fbm(dirSun * 1.85 - vec2(t * 0.75, 2.2)) * 0.4
    );
  float n1 = fbm(boil + vec2(t * 0.35, 0.0));
  float n2 = fbm(boil * 1.8 + vec2(-t * 0.22, 3.3));
  float silk = 0.52 + 0.48 * n1;
  float feathers = pow(max(0.0, n2), 2.25) * 0.62;
  float spokes =
    pow(max(0.0, n1 * 0.65 + n2 * 0.35), 3.3) * exp(-distSun * 2.4) * 0.45;

  // nearHalo commence un peu AVANT le bord (chevauchement)
  float nearHalo = exp(-pow(max(distSun - 0.008, 0.0) * 3.2, 1.15));
  float midVeil = exp(-pow(distSun * 1.85, 1.1)) * 0.55;
  float farVeil = exp(-pow(distSun * 1.2, 1.05)) * 0.42;
  float asym = 0.86 + 0.14 * clamp(0.5 + 0.4 * dirSun.y, 0.0, 1.0);

  float coronaField =
    asym * (
      nearHalo * silk * 1.2 +
      midVeil * (0.4 + feathers) +
      farVeil * (0.3 + feathers * 0.55) +
      spokes * 0.55
    );
  float coronaGate = mix(0.9, 1.3, pow(overlap, 1.1));
  // Corona aussi un peu sous le limbe (évite le ring noir)
  float coronaMask = 1.0 - moonMask * 0.92;
  float corona =
    coronaField * coronaMask * coronaGate * uCoronaAmp * breath * uBodyFade;

  // Photosphère soft + rim blanc (jamais un trait noir)
  float softDisc = 1.0 - smoothstep(-0.012, 0.01, sdfSun);
  float rimSun =
    (1.0 - moonMask) *
    exp(-pow(sdfSun * 48.0, 2.0)) *
    0.7;
  float photosphere =
    (1.0 - moonMask) *
    (softDisc * limbDark * 1.1 + rimSun) *
    (0.95 + 0.08 * breath) *
    uBodyFade;

  // Photon ring : uniquement en totalité
  float limb =
    exp(-pow(sdfMoon * 78.0, 2.0)) *
    smoothstep(-0.01, 0.005, sdfMoon) *
    totality *
    (2.4 + 0.6 * breath) *
    uBodyFade;
  float photon = limb;

  // Diamond C2/C3 : côté = direction vers le soleil (bon bord auto)
  vec2 toSun = (d > 1e-4) ? (sun - moon) / d : vec2(1.0, 0.0);
  float nearContact = exp(-pow((d - cTot) * 36.0, 2.0));
  float diamondGate = nearContact * (1.0 - totality * 0.9);
  float beadAng = pow(max(0.0, dot(dirMoon, toSun)), 36.0);
  float beadRad = exp(-pow(sdfMoon * 32.0, 2.0));
  float diamond =
    (1.0 - moonMask) * diamondGate * beadAng * beadRad *
    (0.35 + 0.9 * uDiamond) * uBodyFade;

  vec3 col = vec3(1.0) * (
    photosphere * 1.1 +
    corona * 1.25 +
    photon * 0.85 +
    diamond * 1.35
  );
  col *= 1.0 - moonMask;
  col *= uBodyFade;
  col *= 1.0 - skyOut;

  float matter = max(photosphere, max(corona * 0.85, max(photon * 0.4, diamond * 0.7)));
  float alpha = matter * uBodyFade * (1.0 - skyOut) * uOpacity;
  alpha = max(alpha, moonMask * 0.98 * uBodyFade * (1.0 - skyOut) * uOpacity);

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
  /** 0 = début, ~1 = sortie / ciel (après totalité). */
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
          uOffset: { value: new Vector2(0, 0) },
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
      mat.uniforms.uSingularityScale.value = Math.max(craft.scaleMul, 0.5);
      mat.uniforms.uAspect.value = Math.max(size.width / size.height, 0.01);
      if (!mat.uniforms.uOffset) {
        mat.uniforms.uOffset = { value: new Vector2(0, 0) };
      }
      const ox = Number.isFinite(craft.offsetX) ? craft.offsetX : 0;
      const oy = Number.isFinite(craft.offsetY) ? craft.offsetY : 0;
      (mat.uniforms.uOffset.value as Vector2).set(
        Math.max(-0.6, Math.min(0.6, ox)),
        Math.max(-0.3, Math.min(0.3, oy)),
      );

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
