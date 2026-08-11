"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo } from "react";

import { EclipseDisc } from "@/src/components/contribute/constellation/EclipseDisc";
import { ECLIPSE_LOGO_RECIPE } from "@/src/components/contribute/constellation/eclipseLogoRecipe";
import {
  defaultSkyTheme,
  SkyThemeProvider,
} from "@/src/components/contribute/constellation/skyTheme";
import { ClientWebGLGate } from "@/src/components/contribute/constellation/webglGate";
import {
  tierDpr,
  useVisualTier,
} from "@/src/components/contribute/constellation/useVisualTier";

function ForceRenderLoop() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let raf = 0;
    let running = true;
    const tick = () => {
      if (!running) return;
      invalidate();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [invalidate]);
  return null;
}

type Props = {
  /** Taille du mark (carré), px. Ignoré si `fill`. */
  size?: number;
  /** Remplit le parent (parent doit être carré / aspect-square). */
  fill?: boolean;
  className?: string;
  /** false = fige la matière (Vie 0) pour capture / print. */
  animate?: boolean;
  /**
   * Die-cut ODYSSEY (défaut true = lockup complet).
   * false = matière seule (export DA « disc »).
   */
  showWordmark?: boolean;
  "aria-label"?: string;
};

/**
 * Marque Odyssey Eclipse — lockup (matière + die-cut ODYSSEY) ou disc seul.
 * Pas de knobs : le lab / play restent pour itérer ; ici = produit.
 */
export function OdysseyEclipseMark({
  size = 160,
  fill = false,
  className = "",
  animate = true,
  showWordmark = true,
  "aria-label": ariaLabel = "Odyssey",
}: Props) {
  const tier = useVisualTier();
  const recipe = ECLIPSE_LOGO_RECIPE;

  const craft = useMemo(
    () => ({
      step: 3 as const,
      showGuide: false,
      moonScale: recipe.moonScale,
      sunScale: recipe.sunScale,
      coronaAmp: recipe.coronaAmp,
      coronaSpread: recipe.coronaSpread,
      coronaIrregular: recipe.coronaIrregular,
      coronaRays: recipe.coronaRays,
      coronaSoft: recipe.coronaSoft,
      photonAmp: recipe.photonAmp,
      lifeAmp: animate ? recipe.lifeAmp : 0,
      diamondAmp: recipe.diamondAmp,
      alignment: recipe.alignment,
      bodyFade: recipe.bodyFade,
      progress: recipe.progress,
      offsetX: recipe.offsetX,
      offsetY: recipe.offsetY,
      /** Pose figée — récit d’apparition = play. */
      wordmarkMul: showWordmark ? 1 : 0,
    }),
    [animate, recipe, showWordmark],
  );

  const bloomIntensity = 0.38 + recipe.diamondAmp * 0.55;

  return (
    <div
      className={`relative overflow-hidden bg-black ${className}`}
      style={fill ? { width: "100%", height: "100%" } : { width: size, height: size }}
      role="img"
      aria-label={ariaLabel}
    >
      <ClientWebGLGate
        fallback={() => (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-[62%] w-[62%] rounded-full border border-white/35" />
          </div>
        )}
      >
        <Canvas
          className="h-full w-full"
          style={{ width: "100%", height: "100%" }}
          frameloop="demand"
          dpr={tierDpr(tier)}
          camera={{ position: [0, 0, 8], fov: 42, near: 0.1, far: 40 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
            preserveDrawingBuffer: true,
          }}
          onCreated={({ gl }) => {
            gl.setClearColor("#000000", 1);
          }}
        >
          <Suspense fallback={null}>
            <SkyThemeProvider theme={defaultSkyTheme}>
              <ForceRenderLoop />
              <color attach="background" args={["#000000"]} />
              <EclipseDisc tier="desktop" craft={craft} />
              <EffectComposer multisampling={0}>
                <Bloom
                  luminanceThreshold={0.75}
                  luminanceSmoothing={0.35}
                  intensity={bloomIntensity}
                  mipmapBlur
                />
              </EffectComposer>
            </SkyThemeProvider>
          </Suspense>
        </Canvas>
      </ClientWebGLGate>
    </div>
  );
}
