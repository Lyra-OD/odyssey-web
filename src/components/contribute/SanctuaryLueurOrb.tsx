"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { WebGLRenderer } from "three";

import { LueurNode } from "@/src/components/contribute/LueurNode";
import {
  tierDpr,
  useVisualTier,
} from "@/src/components/contribute/constellation/useVisualTier";
import { ClientWebGLGate } from "@/src/components/contribute/constellation/webglGate";

export type SanctuaryLueurOrbProps = {
  variant?: "single" | "sky";
  size?: "card" | "ritual" | "sky";
  className?: string;
  "aria-label"?: string;
};

function createRenderer(canvas: HTMLCanvasElement | OffscreenCanvas) {
  const opts: WebGLContextAttributes = {
    alpha: true,
    antialias: false,
    depth: true,
    stencil: false,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: false,
  };
  const context =
    canvas.getContext("webgl2", opts) ||
    canvas.getContext("webgl", opts) ||
    (canvas as HTMLCanvasElement).getContext?.("experimental-webgl", opts);

  if (!context) {
    throw new Error("Aucun contexte WebGL pour la carte Lueur.");
  }

  return new WebGLRenderer({
    canvas,
    context: context as WebGLRenderingContext,
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
    failIfMajorPerformanceCaveat: false,
  });
}

/**
 * Lueur produit — atome WebGL (plus de vidéo MP4).
 */
export function SanctuaryLueurOrb({
  size = "card",
  className = "",
  "aria-label": ariaLabel,
}: SanctuaryLueurOrbProps) {
  const tier = useVisualTier();
  const nodeVariant = size === "ritual" ? "hero" : "premium";
  const stageClass =
    size === "ritual"
      ? "sanctuary-lueur-stage sanctuary-lueur-stage--ritual"
      : "sanctuary-lueur-stage";

  return (
    <div
      className={`${stageClass} ${className}`.trim()}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="sanctuary-lueur-frame sanctuary-lueur-frame--webgl">
        <ClientWebGLGate
          fallback={() => (
            <div className="flex h-full min-h-[12rem] w-full items-center justify-center">
              <div className="h-24 w-24 rounded-full bg-teal-400/25 blur-2xl" />
            </div>
          )}
        >
          <Canvas
            dpr={tierDpr(tier)}
            camera={{ position: [0, 0, 2.2], fov: 40 }}
            gl={createRenderer}
            style={{ background: "transparent" }}
          >
            <Suspense fallback={null}>
              <ambientLight intensity={0.25} />
              <LueurNode variant={nodeVariant} floating={false} phase={0.4} />
            </Suspense>
          </Canvas>
        </ClientWebGLGate>
      </div>
    </div>
  );
}

/** @deprecated plus de source vidéo */
export const LUEUR_VIDEO_SRC = "/lueur.mp4";
