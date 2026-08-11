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
 * Craft — occultation → totalité → diamond bas (glow logo) → fin cinéma hors shader.
 * uAlignment 0→1 = soleil se gare derrière (pas de sortie).
 * uDiamond = diamond ring bas. uProgress / uBodyFade = sortie vers ciel.
 */
const craftFragment = /* glsl */ `
uniform float uOpacity;
uniform float uCoronaAmp;
uniform float uCoronaSpread;
uniform float uCoronaIrregular;
uniform float uCoronaRays;
uniform float uCoronaSoft;
uniform float uDiamond;
uniform float uPhoton;
uniform float uLife;
uniform float uAlignment;
uniform float uBodyFade;
uniform float uProgress;
uniform float uMoonScale;
uniform float uSunScale;
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

  float phase = clamp(uAlignment, 0.0, 1.0);
  float skyOut = clamp(uProgress, 0.0, 1.0);
  // Vie 0 = figé (captures) · 1 = matière vivante
  float life = clamp(uLife, 0.0, 1.0);
  float tLive = uTime * life;
  float breath = 1.0 + 0.018 * sin(tLive * 0.65) * life;

  // Bases identiques → slider égal = même rayon disque (contrôle 1:1)
  float Rmoon = 0.36 * max(uMoonScale, 0.35);
  float Rsun = 0.36 * max(uSunScale, 0.35);

  // Trou noir fixe — soleil arrive de la droite et S'ARRÊTE derrière
  vec2 moon = vec2(0.0, 0.0);
  float travel = 0.78 * max(uAspect, 1.0);
  vec2 sunStart = vec2(travel, -0.02) + uOffset * 0.2;
  vec2 sun = mix(sunStart, moon, phase);

  vec2 qSun = p - sun;
  float rSun = length(qSun);
  vec2 dirSun = (rSun > 1e-4) ? qSun / rSun : vec2(1.0, 0.0);

  vec2 qMoon = p - moon;
  float rMoon = length(qMoon);
  vec2 dirMoon = (rMoon > 1e-4) ? qMoon / rMoon : vec2(1.0, 0.0);

  float sdfMoon = rMoon - Rmoon;
  float sdfSun = rSun - Rsun;

  float moonMask = 1.0 - smoothstep(-0.0025, 0.0025, sdfMoon);

  float d = length(sun - moon);
  float cTot = max(abs(Rmoon - Rsun), 0.001);
  float cExt = Rmoon + Rsun;
  float overlap = 1.0 - smoothstep(cTot, cExt, d);
  float totality = phase > 0.92
    ? (1.0 - smoothstep(0.0, max(Rmoon - Rsun, 0.001) * 1.2, d))
    : 0.0;

  float limbDark = mix(0.78, 1.0, pow(clamp(1.0 - rSun / max(Rsun, 1e-3), 0.0, 1.0), 0.7));

  float distSun = max(0.0, sdfSun);

  // —— Corona 100% soleil (taille lune n’influence que le masque d’occlusion) ——
  float spread = max(uCoronaSpread, 0.25);
  float irreg = clamp(uCoronaIrregular, 0.0, 2.5);
  float rays = clamp(uCoronaRays, 0.0, 2.5);
  float soft = max(uCoronaSoft, 0.25);

  // Vie seule → breath / soie / enveloppe (même si irreg = 0)
  float envPulse = sin(tLive * 0.42) * 0.5 + 0.5;
  float softLive = soft * (1.0 + life * 0.09 * (envPulse - 0.5));
  float spreadLive = spread * (1.0 + life * 0.07 * sin(tLive * 0.31 + 1.1));
  float lifePulse = mix(1.0, 0.93 + 0.12 * sin(tLive * 0.55 + 0.8), life);

  vec2 dirC = dirSun;
  float distN = distSun / max(Rsun * spreadLive, 0.04);

  // Crawl doux (Vie) + drift plumes fort (Irrégularité)
  float softSpinT = tLive * 0.02;
  float caS = cos(softSpinT * 0.45);
  float saS = sin(softSpinT * 0.45);
  vec2 dirSoft = vec2(dirC.x * caS - dirC.y * saS, dirC.x * saS + dirC.y * caS);
  dirSoft = mix(dirC, dirSoft, life * 0.55);

  float drift = tLive * (0.028 + irreg * 0.045);
  float ca = cos(drift * 0.55);
  float sa = sin(drift * 0.55);
  vec2 dirSpin = vec2(dirC.x * ca - dirC.y * sa, dirC.x * sa + dirC.y * ca);
  vec2 dirPlume = mix(dirSoft, dirSpin, life * clamp(irreg * 0.7, 0.0, 1.0));
  vec2 dirDrift = dirPlume;

  float t = tLive * (0.018 + 0.012 * life);
  float angA = fbm(dirDrift * (2.2 + irreg * 1.4) + vec2(t * 0.12, 1.9));
  float angB = fbm(dirDrift * (4.0 + irreg * 2.2) - vec2(2.4, t * 0.08));
  // irreg = caractère cassé ; Vie seule garde une soie animée douce
  float plumeGate = mix(
    mix(0.7, 0.55 + 0.35 * angA, life),
    0.2 + 0.8 * pow(clamp(angA, 0.0, 1.0), 1.35),
    clamp(irreg, 0.0, 1.0)
  );
  float plumeLen = mix(
    1.0,
    mix(0.55, 1.9, pow(clamp(angB, 0.0, 1.0), 1.15)),
    clamp(irreg * 0.85, 0.0, 1.0)
  );

  // Émergence rayons — Vie (même sans irreg) ; irreg accentue
  float rayEmerge = fbm(dirDrift * 1.6 + vec2(tLive * 0.09, 4.2));
  float raySide =
    0.55 + 0.45 * sin(dirDrift.x * 3.1 + dirDrift.y * 2.4 + tLive * 0.35);
  float rayLive =
    rays *
    mix(
      1.0,
      0.6 + 0.55 * rayEmerge * raySide,
      life * clamp(0.35 + rays * 0.4, 0.0, 1.0)
    );

  vec2 fiberUV =
    dirDrift * (2.5 + angA * (0.45 + irreg * 0.9)) +
    vec2(distN * (1.0 / max(plumeLen, 0.45)), t * (0.4 + 0.55 * life));
  float fiber = fbm(fiberUV);
  float fiber2 = fbm(fiberUV * (1.7 + irreg * 0.5) + vec2(3.2, -1.4 + tLive * 0.08));
  float silk = 0.4 + 0.6 * fiber;
  // Soie vivante même à irreg 0
  float silkLive = mix(silk, 0.35 + 0.65 * fiber * (0.75 + 0.4 * fiber2), life);
  float wisps = pow(
    max(0.0, fiber * 0.5 + fiber2 * 0.5),
    mix(2.0, mix(2.2, 1.35, clamp(irreg * 0.5, 0.0, 1.0)), life)
  );

  // Scintillement soie — plus lisible sans irreg
  float silkShimmer =
    mix(1.0, 0.88 + 0.18 * fbm(dirDrift * 5.5 + vec2(tLive * 0.55, distN * 2.0)), life);

  float fallInner = 1.55 / softLive;
  float fallMid = (0.52 / softLive) / max(plumeLen, 0.45);
  float fallFar = (0.26 / softLive) / max(plumeLen, 0.45);

  float inner =
    exp(-pow(distN * fallInner, 1.1)) *
    (0.7 + 0.55 * silkLive) *
    (0.85 + 0.35 * plumeGate);
  float mid =
    exp(-pow(distN * fallMid, 1.0)) *
    mix(silkLive * 0.85, wisps, clamp(irreg * 0.6 + 0.25 * life, 0.0, 1.0)) *
    plumeGate *
    (0.7 + 0.55 * rayLive);
  float far =
    exp(-pow(distN * fallFar, 0.9)) *
    pow(mix(silkLive, wisps, clamp(irreg + 0.2 * life, 0.0, 1.0)), 1.15) *
    plumeGate *
    (0.45 + 0.7 * rayLive);

  float polarBias =
    0.8 +
    0.28 * abs(dirDrift.y) * irreg +
    0.08 * dirDrift.x -
    0.1 * max(-dirDrift.y, 0.0) * irreg;

  float coronaField = polarBias * (inner * 1.15 + mid + far);
  float coronaMask = 1.0 - moonMask;
  float corona =
    coronaField * coronaMask * uCoronaAmp * breath * silkShimmer * lifePulse * uBodyFade;

  // Micro-breath soleil (intensité + limbe soft) — Vie only ; trou noir fixe
  float sunWave = sin(tLive * 0.58 + 1.2);
  float sunBreath = mix(1.0, 0.985 + 0.028 * sunWave, life);
  float rimBreath = mix(1.0, 0.96 + 0.07 * sunWave, life);
  float edgeW = max(
    Rsun * 0.035 * mix(1.0, 0.94 + 0.12 * (0.5 + 0.5 * sunWave), life),
    0.004
  );
  float softDisc = 1.0 - smoothstep(-edgeW, edgeW, sdfSun);
  float rimSun =
    (1.0 - moonMask) *
    exp(-pow((sdfSun / max(Rsun, 1e-3)) * 17.0, 2.0)) *
    0.7 *
    rimBreath;
  float photosphere =
    (1.0 - moonMask) *
    (softDisc * limbDark * 1.1 + rimSun) *
    (0.95 + 0.08 * breath) *
    sunBreath *
    uBodyFade;

  // Anneau photon — breath + mini diffusion + chatoyement
  float photonBreath = mix(1.0, 0.88 + 0.18 * sin(tLive * 0.72 + 0.4), life);
  float photonDiff = mix(1.0, 1.0 + 0.14 * (0.5 + 0.5 * sin(tLive * 0.48)), life);
  float photonSharp = 78.0 / photonDiff;
  float photonShimmer =
    mix(1.0, 0.82 + 0.28 * fbm(dirMoon * 8.0 + vec2(tLive * 0.7, 0.5)), life);
  float limbCore =
    exp(-pow(sdfMoon * photonSharp, 2.0)) *
    smoothstep(-0.01 * photonDiff, 0.005 * photonDiff, sdfMoon);
  float limbVeil =
    exp(-pow(sdfMoon * (26.0 / max(photonDiff, 0.8)), 2.0)) *
    smoothstep(-0.025, 0.03, sdfMoon) *
    0.32 * life;
  float limb =
    (limbCore * 1.0 + limbVeil) *
    totality *
    (1.8 + 0.35 * breath) *
    photonBreath *
    photonShimmer *
    uBodyFade *
    max(uPhoton, 0.0);
  float photon = limb;

  // Flash / diamond — Baily breakup vivant (Vie × irrégularité)
  float flashAmt = max(uDiamond, 0.0);
  float irregF = clamp(uCoronaIrregular, 0.0, 2.5);
  vec2 beadDir = normalize(vec2(0.28, -0.96));
  float along = max(0.0, dot(dirMoon, beadDir));

  float bnA = fbm(dirMoon * (3.4 + irregF * 1.8) + vec2(tLive * 0.07, 2.2));
  float bnB = fbm(dirMoon * (6.8 + irregF * 1.2) - vec2(1.6, tLive * 0.045));
  float bnC = fbm(dirMoon * 11.0 + vec2(tLive * 0.22, -3.1));
  float breakUp = mix(0.72, 0.22 + 0.9 * bnA, clamp(irregF * 0.55, 0.0, 1.0));
  // Un peu plus large / présent que le bead ultra-pincé
  float angPow = mix(20.0, 9.0, clamp(irregF * 0.42, 0.0, 1.0));
  float beadGate = pow(along, angPow) * breakUp * (0.75 + 0.5 * bnB);

  float limbFlash =
    exp(-pow(sdfMoon * 72.0, 2.0)) *
    smoothstep(-0.008, 0.012, sdfMoon);
  float bailyThresh = mix(
    0.58,
    mix(0.38, 0.28 + 0.18 * bnC, life),
    clamp(irregF * 0.5, 0.0, 1.0)
  );
  float baily =
    pow(max(bnB - bailyThresh, 0.0), 1.35) *
    clamp(irregF, 0.0, 1.6) *
    (0.5 + 0.35 * life * bnC);

  float core = exp(-pow(sdfMoon * 95.0, 2.0));
  float midG = exp(-pow(sdfMoon * 42.0, 2.0)) * 0.55;
  float softG = exp(-pow(sdfMoon * 16.0, 2.0)) * 0.22;
  float wideG = exp(-pow(sdfMoon * 8.5, 2.0)) * 0.14;
  float glowStack = core * 1.55 + midG * 1.1 + softG + wideG;
  float flicker = mix(1.0, 0.9 + 0.1 * sin(tLive * 1.85 + bnA * 6.2831), life);

  float diamond =
    (1.0 - moonMask) *
    (
      beadGate * glowStack +
      limbFlash * baily * (core * 1.1 + midG * 0.65)
    ) *
    flashAmt *
    flicker *
    uBodyFade;

  vec3 col = vec3(1.0) * (
    photosphere * 1.05 +
    corona * 1.4 +
    photon * 0.75 +
    diamond * 2.05
  );
  col *= 1.0 - moonMask;
  col *= uBodyFade;
  col *= 1.0 - skyOut;

  float matter = max(photosphere, max(corona * 0.85, max(photon * 0.4, diamond * 0.85)));
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
  moonScale: number;
  sunScale: number;
  coronaAmp: number;
  /** Étendue du glow (1 = défaut). */
  coronaSpread: number;
  /** Asymétrie / plumes (0 = lisse, 1 = défaut, 2 = très irrégulier). */
  coronaIrregular: number;
  /** Force des streamers / rayons. */
  coronaRays: number;
  /** Softness du falloff (plus haut = plus diffus). */
  coronaSoft: number;
  /** Anneau photon / halo limbe (0 = off). */
  photonAmp: number;
  /** Vie matière 0 = figé · 1 = drift plumes + breath flash. */
  lifeAmp: number;
  diamondAmp: number;
  alignment: number;
  bodyFade: number;
  progress: number;
  offsetX: number;
  offsetY: number;
  /**
   * Dolly perspective (craft play) : taille du plane calée sur la caméra *finale*.
   * La caméra avance vraiment → sensation d’avancer, pas un scale 2D.
   */
  perspectiveDolly?: boolean;
  dollyEndZ?: number;
  dollyEndFov?: number;
  /** @deprecated Préférer perspectiveDolly — scale 2D faux zoom. */
  frameScale?: number;
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
          uCoronaSpread: { value: 1 },
          uCoronaIrregular: { value: 1 },
          uCoronaRays: { value: 1 },
          uCoronaSoft: { value: 1 },
          uDiamond: { value: 0 },
          uPhoton: { value: 0 },
          uLife: { value: 0.7 },
          uAlignment: { value: 1 },
          uBodyFade: { value: 1 },
          uProgress: { value: 0 },
          uMoonScale: { value: 1 },
          uSunScale: { value: 1 },
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

  // Recompile + uniforms si le fragment craft change (évite HMR qui garde uSingularityScale partagé)
  useEffect(() => {
    material.vertexShader = vertexShader;
    material.fragmentShader = isCraft ? craftFragment : skyFragment;
    if (isCraft) {
      if (!material.uniforms.uMoonScale) {
        material.uniforms.uMoonScale = { value: 1 };
      }
      if (!material.uniforms.uSunScale) {
        material.uniforms.uSunScale = { value: 1 };
      }
      if (!material.uniforms.uCoronaSpread) {
        material.uniforms.uCoronaSpread = { value: 1 };
      }
      if (!material.uniforms.uCoronaIrregular) {
        material.uniforms.uCoronaIrregular = { value: 1 };
      }
      if (!material.uniforms.uCoronaRays) {
        material.uniforms.uCoronaRays = { value: 1 };
      }
      if (!material.uniforms.uCoronaSoft) {
        material.uniforms.uCoronaSoft = { value: 1 };
      }
      if (!material.uniforms.uPhoton) {
        material.uniforms.uPhoton = { value: 0 };
      }
      if (!material.uniforms.uLife) {
        material.uniforms.uLife = { value: 0.7 };
      }
      if (!material.uniforms.uOffset) {
        material.uniforms.uOffset = { value: new Vector2(0, 0) };
      }
      // Ancien uniform partagé — ne plus l’utiliser
      if (material.uniforms.uSingularityScale) {
        delete material.uniforms.uSingularityScale;
      }
    }
    material.needsUpdate = true;
  }, [material, isCraft, craftFragment]);

  useFrame(({ clock }) => {
    const mat = matRef.current ?? material;
    const mesh = meshRef.current;

    if (craft) {
      if (!mat.uniforms.uMoonScale) mat.uniforms.uMoonScale = { value: 1 };
      if (!mat.uniforms.uSunScale) mat.uniforms.uSunScale = { value: 1 };
      if (!mat.uniforms.uCoronaSpread) mat.uniforms.uCoronaSpread = { value: 1 };
      if (!mat.uniforms.uCoronaIrregular)
        mat.uniforms.uCoronaIrregular = { value: 1 };
      if (!mat.uniforms.uCoronaRays) mat.uniforms.uCoronaRays = { value: 1 };
      if (!mat.uniforms.uCoronaSoft) mat.uniforms.uCoronaSoft = { value: 1 };
      if (!mat.uniforms.uPhoton) mat.uniforms.uPhoton = { value: 0 };
      if (!mat.uniforms.uLife) mat.uniforms.uLife = { value: 0.7 };
      mat.uniforms.uTime.value = clock.elapsedTime;
      mat.uniforms.uOpacity.value = 1;
      mat.uniforms.uCoronaAmp.value =
        craft.step >= 2 ? craft.coronaAmp : 0;
      mat.uniforms.uCoronaSpread.value = craft.coronaSpread;
      mat.uniforms.uCoronaIrregular.value = craft.coronaIrregular;
      mat.uniforms.uCoronaRays.value = craft.coronaRays;
      mat.uniforms.uCoronaSoft.value = craft.coronaSoft;
      mat.uniforms.uPhoton.value = craft.photonAmp;
      mat.uniforms.uLife.value = craft.lifeAmp;
      mat.uniforms.uDiamond.value =
        craft.step >= 2 ? craft.diamondAmp : 0;
      mat.uniforms.uAlignment.value = craft.alignment;
      mat.uniforms.uBodyFade.value = craft.bodyFade;
      mat.uniforms.uProgress.value = craft.progress;
      mat.uniforms.uMoonScale.value = craft.moonScale;
      mat.uniforms.uSunScale.value = craft.sunScale;
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
        mesh.position.set(0, 0, 0);
        const aspect = Math.max(size.width / size.height, 0.01);

        if (
          craft.perspectiveDolly &&
          typeof craft.dollyEndZ === "number" &&
          typeof craft.dollyEndFov === "number"
        ) {
          // Taille monde fixe = plein cadre à la pose finale.
          // La caméra avance → vrai dolly (pas un zoom scale).
          const dist = Math.max(0.5, craft.dollyEndZ);
          const vFov = (craft.dollyEndFov * Math.PI) / 180;
          const height = 2 * Math.tan(vFov / 2) * dist;
          const width = height * aspect;
          mesh.scale.set(width * 1.06, height * 1.06, 1);
        } else {
          const cam = camera as PerspectiveCamera;
          _vpTarget.set(0, 0, 0);
          const vp = viewport.getCurrentViewport(cam, _vpTarget);
          const frame =
            typeof craft.frameScale === "number" &&
            Number.isFinite(craft.frameScale)
              ? Math.max(0.35, Math.min(1.15, craft.frameScale))
              : 1;
          mesh.scale.set(vp.width * 1.06 * frame, vp.height * 1.06 * frame, 1);
        }
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
      key="eclipse-craft-disc-v2"
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
