"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
  Vector2,
} from "three";

import { tierDustCount, type VisualTier } from "./useVisualTier";

const vertexShader = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;
uniform float uRepulsion;
attribute float aScale;
attribute float aBrightness;
varying float vAlpha;
varying float vBright;

void main() {
  vec3 pos = position;

  pos.x += sin(uTime * 0.04 + position.z * 0.8) * 0.012;
  pos.y += cos(uTime * 0.035 + position.x * 0.6) * 0.01;

  vec2 toMouse = pos.xy - uMouse;
  float dist = length(toMouse);
  float force = smoothstep(uRepulsion, 0.0, dist);
  pos.xy += normalize(toMouse + 0.0001) * force * 0.18;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aScale * (42.0 / max(-mv.z, 0.8));
  vAlpha = aBrightness * smoothstep(18.0, 4.0, -mv.z);
  vBright = aBrightness;
}
`;

const fragmentShader = /* glsl */ `
varying float vAlpha;
varying float vBright;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);

  // Étoile nette : cœur + croix de diffraction légère
  float core = 1.0 - smoothstep(0.0, 0.12, d);
  float spikeX = (1.0 - smoothstep(0.0, 0.035, abs(uv.x))) * (1.0 - smoothstep(0.0, 0.42, abs(uv.y)));
  float spikeY = (1.0 - smoothstep(0.0, 0.035, abs(uv.y))) * (1.0 - smoothstep(0.0, 0.42, abs(uv.x)));
  float spikes = max(spikeX, spikeY) * 0.55;
  float soft = (1.0 - smoothstep(0.0, 0.4, d)) * 0.15;

  float a = (core + spikes + soft) * vAlpha;
  if (a < 0.03) discard;

  vec3 col = mix(vec3(0.75, 0.82, 0.95), vec3(1.0, 0.98, 0.94), vBright);
  gl_FragColor = vec4(col, a);
}
`;

type StarDustProps = {
  tier: VisualTier;
};

/**
 * Champ galactique : bande de Voie lactée + étoiles fines avec spikes.
 */
export function StarDust({ tier }: StarDustProps) {
  const materialRef = useRef<ShaderMaterial>(null);
  const { viewport, pointer } = useThree();
  const count = tierDustCount(tier);

  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const brightness = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      // ~70% dans une bande galactique diagonale, ~30% champ profond
      const inBand = Math.random() < 0.72;
      let x: number;
      let y: number;
      let z: number;

      if (inBand) {
        const t = (Math.random() - 0.5) * 22;
        const thickness = (Math.random() - 0.5) * 1.6;
        // Bande inclinée (galaxie vue de biais)
        x = t * 0.85 + thickness * 0.4;
        y = t * 0.22 + thickness * 0.95;
        z = (Math.random() - 0.5) * 8 - 2;
      } else {
        x = (Math.random() - 0.5) * 20;
        y = (Math.random() - 0.5) * 12;
        z = (Math.random() - 0.5) * 14 - 1;
      }

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      const bright = Math.pow(Math.random(), 2.2);
      brightness[i] = 0.25 + bright * 0.75;
      scales[i] = 0.15 + bright * 0.85;
    }

    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("aScale", new BufferAttribute(scales, 1));
    geo.setAttribute("aBrightness", new BufferAttribute(brightness, 1));
    return geo;
  }, [count]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uMouse: { value: new Vector2(0, 0) },
          uRepulsion: { value: 1.2 },
          uTint: { value: new Color("#c8d4f0") },
        },
      }),
    [],
  );

  useFrame(({ clock }) => {
    const mat = materialRef.current ?? material;
    mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uMouse.value.set(
      pointer.x * viewport.width * 0.45,
      pointer.y * viewport.height * 0.45,
    );
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <primitive object={material} ref={materialRef} attach="material" />
    </points>
  );
}
