"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { PerspectiveCamera } from "three";
import { Color, ShaderMaterial, type Mesh } from "three";

import { nebulaNoiseGlsl, nebulaVertexShader } from "./nebulaCommon";
import { defaultSkyTheme } from "./skyTheme";

/**
 * Knobs craft — tunnel volumétrique cylindrique (palette Sanctuaire).
 */
export type WormholeCraftKnobs = {
  /** Vitesse du vol dans le tube (0 = quasi figé). */
  velocity: number;
  /** Épaisseur / contraste du gaz FBM (0.4–2). */
  density: number;
  /** Opacité globale — 0 = révèle le ciel derrière. */
  alpha: number;
  /** Soft du noyau ambré central. */
  coreSoft: number;
};

export const WORMHOLE_CRAFT_DEFAULTS: WormholeCraftKnobs = {
  velocity: 0.85,
  density: 1.15,
  alpha: 0.92,
  coreSoft: 0.07,
};

/**
 * Tunnel volumétrique — 1 plane.
 * 1) Seam-free (cos/sin, pas atan brut)
 * 2) 3 couches FBM parallax
 * 3) Ridges / filaments
 * 4) Soft core destination
 * 5) Rush stars
 * Palette : defaultSkyTheme uniquement.
 */
const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uVelocity;
uniform float uDensity;
uniform float uAlpha;
uniform float uCoreSoft;
uniform float uAspect;
uniform vec3 uDeep;
uniform vec3 uTeal;
uniform vec3 uTealDeep;
uniform vec3 uAmber;
uniform vec3 uDust;
uniform vec3 uAurora;
uniform vec3 uStar;

varying vec2 vUv;

${nebulaNoiseGlsl}

const float TAU = 6.28318530718;

float fbm4(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

/** Ridge — sculpte des soies (casse le mush). */
float ridge4(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) {
    float n = noise(p);
    v += a * (1.0 - abs(n * 2.0 - 1.0));
    p = m * p;
    a *= 0.5;
  }
  return v;
}

/**
 * UV cylindrique sans couture :
 * l’angle est embarqué sur un cercle (cos/sin) — continuité C0 autour de ±π.
 */
vec2 cylUV(float ang, float depth, float radiusScale, vec2 drift) {
  return vec2(cos(ang), sin(ang)) * radiusScale + vec2(depth, depth * 0.37) + drift;
}

/** Couche gaz : FBM + ridges, vitesse / echelle propres (parallax).
 *  Retour : x = veil, y = tealAmt, z = amberAmt (WebGL1-safe, pas de out). */
vec3 gasLayer(
  float ang,
  float r,
  float vel,
  float densMul,
  float speedMul,
  float radiusScale,
  float zBias,
  vec2 drift,
  float ridgeW
) {
  float tunnelZ = 0.52 / r + uTime * (0.08 + vel * 0.55) * speedMul + zBias;
  vec2 tuv = cylUV(ang, tunnelZ, radiusScale * densMul, drift);

  float soft = fbm4(tuv * vec2(1.15, 0.95));
  float silk = ridge4(tuv * vec2(2.4, 1.35) + 1.7);
  float detail = ridge4(tuv * vec2(4.8, 2.6) + soft * 0.55);

  // Filaments clairsemés — fort contraste, vides noirs entre les soies
  float gas = soft * 0.28 + silk * 0.48 + detail * 0.42;
  gas = mix(gas, silk * detail, ridgeW);
  gas = pow(clamp(gas, 0.0, 1.0), mix(1.55, 1.15, densMul * 0.35));
  gas = smoothstep(0.34 - densMul * 0.05, 0.78 + densMul * 0.04, gas);

  // Parois : plus présentes hors centre ; centre ouvert vers la destination
  float walls = smoothstep(0.035, 0.48, r) * (1.0 - smoothstep(0.92, 1.55, r));
  float veil = gas * walls;

  float tealAmt = smoothstep(0.3, 0.75, soft);
  float amberAmt = smoothstep(0.5, 0.95, silk) * smoothstep(0.35, 0.8, detail);
  return vec3(veil, tealAmt, amberAmt);
}

/** Étoiles warp — points qui fusent du centre (hash cellulaire seamless). */
float rushStars(float ang, float r, float vel, float densMul) {
  float speed = 0.14 + vel * 0.72;
  float tunnelZ = 0.45 / max(r, 1e-4) + uTime * speed;

  // Cellules sur cercle × profondeur — pas de seam angulaire
  float radialCells = 14.0 + densMul * 6.0;
  float depthCells = 22.0;
  vec2 coord = vec2(
    cos(ang) * radialCells + tunnelZ * 0.15,
    sin(ang) * radialCells + tunnelZ * depthCells
  );
  vec2 cell = floor(coord);
  float h = hash(cell);
  // Sparse : gate sans early-return (branch-safe)
  float gate = step(0.88, h);

  vec2 f = fract(coord);
  // Streak radial léger (warp)
  vec2 q = f - 0.5;
  q.y *= 0.35 + vel * 0.25;
  float d = length(q);
  float spark = smoothstep(0.09, 0.0, d);
  spark *= smoothstep(0.02, 0.12, r) * (1.0 - smoothstep(1.1, 1.6, r));
  return spark * gate * (0.55 + 0.45 * hash(cell + 19.0));
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  uv.x *= uAspect;

  float r = max(length(uv), 1e-4);
  float ang = atan(uv.y, uv.x);

  float vel = max(uVelocity, 0.0);
  float densMul = clamp(uDensity, 0.35, 2.2);

  // —— 3 couches parallax (vitesses / échelles distinctes) ——
  vec3 L0 = gasLayer(ang, r, vel, densMul, 0.55, 0.95, 0.0, vec2(0.0), 0.55);
  vec3 L1 = gasLayer(ang, r, vel, densMul, 1.0, 1.35, 1.7, vec2(2.1, -0.8), 0.7);
  vec3 L2 = gasLayer(ang, r, vel, densMul, 1.65, 1.85, 3.4, vec2(-1.4, 2.6), 0.82);

  float veil = clamp(L0.x * 0.45 + L1.x * 0.75 + L2.x * 0.95, 0.0, 1.0);
  float mixTeal = clamp(L0.y * 0.35 + L1.y * 0.45 + L2.y * 0.55, 0.0, 1.0);
  float mixAmber = clamp(L0.z * 0.25 + L1.z * 0.4 + L2.z * 0.55, 0.0, 1.0) * 0.7;

  // Colorimétrie Sanctuaire — deep / teal / poussière / ambre / aurora edge
  vec3 col = mix(uDeep, uTealDeep, 0.62);
  col = mix(col, uTeal, mixTeal * 0.8);
  col = mix(col, uAurora, mixTeal * 0.22);
  col = mix(col, uDust, (1.0 - mixTeal) * 0.35);
  col = mix(col, uAmber, mixAmber);

  // —— Soft core destination (cache singularité, pas flash blanc) ——
  float coreR = max(uCoreSoft, 0.02);
  float core = exp(-(r * r) / (coreR * coreR * 2.6));
  core *= 0.5 + 0.5 * (1.0 - smoothstep(0.0, 0.55, vel * 0.3));
  col = mix(col, uAmber, core * 0.72);
  col = mix(col, uTeal, core * 0.28);

  // —— Rush particles (starsField tint) ——
  float stars = rushStars(ang, r, vel, densMul);
  col = mix(col, uStar, stars * 0.95);
  col = mix(col, uTeal, stars * 0.15);

  float alpha = (veil * (0.5 + 0.5 * densMul * 0.45) + core * 0.48 + stars * 0.85) * uAlpha;
  alpha = clamp(alpha, 0.0, 0.96);
  alpha *= 1.0 - smoothstep(1.15, 1.65, r);

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

  const uniforms = useMemo(() => {
    const theme = defaultSkyTheme;
    return {
      uTime: { value: 0 },
      uVelocity: { value: knobs.velocity },
      uDensity: { value: knobs.density },
      uAlpha: { value: knobs.alpha },
      uCoreSoft: { value: knobs.coreSoft },
      uAspect: { value: 1 },
      uDeep: { value: new Color(theme.scene.background) },
      uTeal: { value: new Color(theme.gasTeal.color) },
      uTealDeep: { value: new Color(theme.gasTeal.deep) },
      uAmber: { value: new Color(theme.zodiacal.core) },
      uDust: { value: new Color(theme.cosmicDust.tint) },
      uAurora: { value: new Color(theme.aurora.edge) },
      uStar: { value: new Color(theme.starsField.tint) },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- synced in useFrame
  }, []);

  useFrame(({ clock, camera }) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uVelocity.value = knobs.velocity;
    mat.uniforms.uDensity.value = knobs.density;
    mat.uniforms.uAlpha.value = knobs.alpha;
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
