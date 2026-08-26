"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
  Vector2,
} from "three";

import { tierDustCount, type VisualTier } from "./useVisualTier";
import { ParallaxLayer } from "./ParallaxLayer";
import { cameraZoomRef, ZOOM_DEFAULT } from "./WheelZoom";
import { type StarFieldTheme, useSkyTheme } from "./skyTheme";
import { idleCameraRef } from "./IdleCameraDrift";
import { skyIntroMul } from "./SkyIntroEclipse";

const vertexShader = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;
uniform float uRepulsion;
uniform float uRepelStrength;
uniform float uDrift;
uniform float uBreathSpeedA;
uniform float uBreathSpeedB;
uniform float uBreathAmp;
uniform float uSizeMul;
uniform float uAlphaMul;
uniform float uZoomComp;
attribute float aScale;
attribute float aBrightness;
varying float vAlpha;
varying float vBright;

void main() {
  vec3 pos = position;

  pos.x += sin(uTime * uDrift + position.z * 0.8) * 0.012;
  pos.y += cos(uTime * uDrift * 0.88 + position.x * 0.6) * 0.01;

  vec2 toMouse = pos.xy - uMouse;
  float dist = length(toMouse);
  float force = smoothstep(uRepulsion, 0.0, dist);
  pos.xy += normalize(toMouse + 0.0001) * force * uRepelStrength;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float depth = max(-mv.z, 0.6);
  gl_Position = projectionMatrix * mv;

  float s1 = sin(uTime * uBreathSpeedA + position.x * 2.4 + position.z * 1.1);
  float s2 = sin(uTime * uBreathSpeedB + position.y * 3.1 + 2.0);
  float beat = s1 * s2;
  float breath = 1.0 + uBreathAmp * (0.55 * s1 + 0.30 * s2 + 0.35 * beat);

  float sizeAtten = 58.0 / depth;
  gl_PointSize = aScale * uSizeMul * breath * sizeAtten * uZoomComp;

  float depthFade = smoothstep(32.0, 5.0, depth);
  float zoomBoost = mix(1.0, 1.35, clamp(uZoomComp - 1.0, 0.0, 1.5));
  vAlpha = aBrightness * uAlphaMul * breath * depthFade * zoomBoost;
  vBright = aBrightness;
}
`;

const fragmentShader = /* glsl */ `
varying float vAlpha;
varying float vBright;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);

  float core = 1.0 - smoothstep(0.0, 0.12, d);
  float spikeX = (1.0 - smoothstep(0.0, 0.035, abs(uv.x))) * (1.0 - smoothstep(0.0, 0.42, abs(uv.y)));
  float spikeY = (1.0 - smoothstep(0.0, 0.035, abs(uv.y))) * (1.0 - smoothstep(0.0, 0.42, abs(uv.x)));
  float spikes = max(spikeX, spikeY) * 0.55;
  float soft = (1.0 - smoothstep(0.0, 0.4, d)) * 0.15;

  float a = (core + spikes + soft) * vAlpha;
  if (a < 0.02) discard;

  vec3 col = mix(vec3(0.82, 0.88, 1.0), vec3(1.0, 0.99, 0.96), vBright);
  gl_FragColor = vec4(col, min(a * 1.15, 1.0));
}
`;

type FieldKind = "band" | "field";

/** PRNG déterministe — chaque layer a sa seed → toucher la bande ne re-shuffle pas le field. */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LAYER_SEED: Record<FieldKind, number> = {
  band: 0xba12d001,
  field: 0xf1e1d002,
};

function buildGeometry(
  count: number,
  kind: FieldKind,
  cfg: StarFieldTheme,
): BufferGeometry {
  const rand = mulberry32(LAYER_SEED[kind]);
  const geo = new BufferGeometry();
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const brightness = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    let x: number;
    let y: number;
    let z: number;

    if (kind === "band") {
      const t = (rand() - 0.5) * 24;
      const u = rand() + rand() + rand() - 1.5;
      const thickness = u * 1.05;
      x = t * 0.85 + thickness * 0.4;
      y = t * 0.22 + thickness * 0.95;
      z = (rand() - 0.5) * cfg.zSpread + cfg.zBias;
    } else {
      x = (rand() - 0.5) * 24;
      y = (rand() - 0.5) * 15;
      z = (rand() - 0.5) * cfg.zSpread + cfg.zBias;
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    const bright = Math.pow(rand(), kind === "field" ? 1.35 : 1.7);
    brightness[i] = cfg.brightMin + bright * cfg.brightRange;
    scales[i] = cfg.scaleMin + bright * cfg.scaleRange;
  }

  geo.setAttribute("position", new BufferAttribute(positions, 3));
  geo.setAttribute("aScale", new BufferAttribute(scales, 1));
  geo.setAttribute("aBrightness", new BufferAttribute(brightness, 1));
  return geo;
}

function createMaterial(cfg: StarFieldTheme): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new Vector2(0, 0) },
      uRepulsion: { value: cfg.repulsion },
      uRepelStrength: { value: cfg.repelStrength },
      uDrift: { value: cfg.drift },
      uBreathSpeedA: { value: cfg.breathSpeedA },
      uBreathSpeedB: { value: cfg.breathSpeedB },
      uBreathAmp: { value: cfg.breathAmp },
      uSizeMul: { value: cfg.sizeMul },
      uAlphaMul: { value: cfg.alphaMul },
      uZoomComp: { value: 1 },
      uTint: { value: new Color(cfg.tint) },
    },
  });
}

type StarFieldProps = {
  kind: FieldKind;
  count: number;
  cfg: StarFieldTheme;
};

function StarField({ kind, count, cfg }: StarFieldProps) {
  const materialRef = useRef<ShaderMaterial>(null);
  const { viewport, pointer } = useThree();
  const rareBandPulse = useSkyTheme().scene.idle?.rareBandPulse ?? 0;

  const geometry = useMemo(
    () => buildGeometry(count, kind, cfg),
    [count, kind, cfg],
  );
  const material = useMemo(() => createMaterial(cfg), [cfg]);

  useEffect(() => {
    material.vertexShader = vertexShader;
    material.fragmentShader = fragmentShader;
    material.needsUpdate = true;
  }, [material]);

  useFrame(({ clock }) => {
    const mat = materialRef.current ?? material;
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uMouse.value.set(
      pointer.x * viewport.width * 0.45,
      pointer.y * viewport.height * 0.45,
    );
    const zoomRatio = cameraZoomRef.current / ZOOM_DEFAULT;
    mat.uniforms.uZoomComp.value = Math.max(0.85, zoomRatio);
    const outScale = Math.max(1, zoomRatio);
    mat.uniforms.uRepulsion.value = cfg.repulsion * outScale;
    mat.uniforms.uRepelStrength.value = cfg.repelStrength * outScale;
    const bandPulse =
      kind === "band" && idleCameraRef.rareTarget === "band"
        ? idleCameraRef.rarePulse * rareBandPulse
        : 0;
    mat.uniforms.uAlphaMul.value =
      cfg.alphaMul * (1 + bandPulse) * skyIntroMul(1);
  });

  return (
    <points
      geometry={geometry}
      frustumCulled={false}
      renderOrder={cfg.renderOrder}
    >
      <primitive object={material} ref={materialRef} attach="material" />
    </points>
  );
}

type StarDustProps = {
  tier: VisualTier;
  showBand?: boolean;
  showField?: boolean;
};

/**
 * 2 layers : bande + field. Knobs : `skyTheme.starsBand` / `starsField`.
 */
export function StarDust({
  tier,
  showBand = true,
  showField = true,
}: StarDustProps) {
  const theme = useSkyTheme();
  const total = tierDustCount(tier);
  const bandCount = tier === "reduced" ? total : Math.floor(total * 0.96);
  const fieldCount = total - bandCount;
  const band = theme.starsBand;
  const field = theme.starsField;

  return (
    <group>
      {showBand && bandCount > 0 ? (
      <ParallaxLayer
        factor={band.parallax.factor}
        lerp={band.parallax.lerp}
        zoomOutCompensate
      >
        <StarField kind="band" count={bandCount} cfg={band} />
      </ParallaxLayer>
      ) : null}
      {showField && fieldCount > 0 ? (
        <ParallaxLayer
          factor={field.parallax.factor}
          lerp={field.parallax.lerp}
          zoomOutCompensate
        >
          <StarField kind="field" count={fieldCount} cfg={field} />
        </ParallaxLayer>
      ) : null}
    </group>
  );
}
