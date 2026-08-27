"use client";

import { useEffect, useMemo, useRef } from "react";
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Color, MeshBasicMaterial, ShaderMaterial, SRGBColorSpace } from "three";

import type { VisualTier } from "./useVisualTier";
import { opacityForTier, useSkyTheme } from "./skyTheme";
import { skyIntroMul } from "./SkyIntroEclipse";

export const SKY_PANORAMA_TEXTURE = "/craft/sky/milky-way-v1.jpg";

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** Photo plein cadre — soft optionnel vers le void (sans rétrécir l’image). */
const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
uniform float uDim;
uniform float uSoft;
uniform vec3 uVoid;

varying vec2 vUv;

void main() {
  vec4 tex = texture2D(uMap, vUv);
  vec3 col = tex.rgb * uDim;

  float soft = max(uSoft, 0.0);
  if (soft > 0.001) {
    float fx =
      smoothstep(0.0, soft, vUv.x) * smoothstep(0.0, soft, 1.0 - vUv.x);
    float fy =
      smoothstep(0.0, soft * 0.6, vUv.y) *
      smoothstep(0.0, soft * 0.6, 1.0 - vUv.y);
    col = mix(col, uVoid, 1.0 - (fx * fy));
  }

  float alpha = tex.a * uOpacity;
  if (alpha < 0.004) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

type SkyPanoramaProps = {
  tier: VisualTier;
};

/**
 * Fond photo + plan noir séparé derrière.
 * Scale = taille de la **photo** · voidScale = taille du **noir infini** (indépendant).
 */
export function SkyPanorama({ tier }: SkyPanoramaProps) {
  const matRef = useRef<ShaderMaterial>(null);
  const theme = useSkyTheme();
  const cfg = theme.skyPanorama;
  const opacity = opacityForTier(cfg.opacity, tier);
  const texture = useTexture(cfg.texturePath);
  const voidColor = cfg.voidColor;

  const photoMaterial = useMemo(() => {
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    return new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      fog: false,
      uniforms: {
        uMap: { value: texture },
        uOpacity: { value: opacity },
        uDim: { value: cfg.dim },
        uSoft: { value: cfg.blackSoft },
        uVoid: { value: new Color(voidColor) },
      },
    });
  }, [texture, opacity, cfg.dim, cfg.blackSoft, voidColor]);

  const voidMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(voidColor),
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        fog: false,
      }),
    [voidColor],
  );

  useEffect(() => {
    photoMaterial.vertexShader = vertexShader;
    photoMaterial.fragmentShader = fragmentShader;
    photoMaterial.needsUpdate = true;
  }, [photoMaterial]);

  useFrame(() => {
    const mat = matRef.current ?? photoMaterial;
    mat.uniforms.uOpacity.value = opacity * skyIntroMul(1);
    mat.uniforms.uDim.value = cfg.dim;
    mat.uniforms.uSoft.value = cfg.blackSoft;
    (mat.uniforms.uVoid.value as Color).set(voidColor);
    voidMaterial.color.set(voidColor);
    voidMaterial.opacity = skyIntroMul(1);
  });

  if (tier !== "desktop" || opacity < 0.001) return null;

  const voidZ = cfg.position[2] - 0.4;

  return (
    <group>
      {/* Noir qui remplit le FOV — indépendant de la taille photo */}
      {cfg.voidScale > 0.01 ? (
        <mesh
          frustumCulled={false}
          renderOrder={cfg.renderOrder - 1}
          position={[cfg.position[0], cfg.position[1], voidZ]}
          scale={[cfg.voidScale, cfg.voidScale * 0.55, 1]}
          rotation={cfg.rotation}
        >
          <planeGeometry args={[1, 1, 1, 1]} />
          <primitive object={voidMaterial} attach="material" />
        </mesh>
      ) : null}

      <mesh
        frustumCulled={false}
        renderOrder={cfg.renderOrder}
        position={cfg.position}
        scale={cfg.scale}
        rotation={cfg.rotation}
      >
        <planeGeometry args={[1, 1, 1, 1]} />
        <primitive object={photoMaterial} ref={matRef} attach="material" />
      </mesh>
    </group>
  );
}
