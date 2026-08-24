"use client";

import { Canvas, useThree } from "@react-three/fiber";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { Color, WebGLRenderer } from "three";

import {
  DEFAULT_HERO_SPIKES,
  DEFAULT_HERO_TEAL,
  DEFAULT_HERO_WHITE,
  HeroStar,
  type HeroLayerKnobs,
} from "@/src/components/contribute/constellation/HeroStar";
import { SanctuaryUniverse } from "@/src/components/contribute/SanctuaryUniverse";
import { SanctuaryLueurOrb } from "@/src/components/contribute/SanctuaryLueurOrb";
import { ClientWebGLGate } from "@/src/components/contribute/constellation/webglGate";
import {
  tierDpr,
  useVisualTier,
} from "@/src/components/contribute/constellation/useVisualTier";

type Locale = "fr" | "en";
type LabTab = "hero" | "constellation" | "produit";

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

function createBlackRenderer(canvas: HTMLCanvasElement | OffscreenCanvas) {
  const opts: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: true,
    powerPreference: "high-performance",
  };
  const context =
    canvas.getContext("webgl2", opts) ||
    canvas.getContext("webgl", opts) ||
    (canvas as HTMLCanvasElement).getContext?.("experimental-webgl", opts);
  if (!context) throw new Error("WebGL unavailable");
  return new WebGLRenderer({
    canvas,
    context: context as WebGLRenderingContext,
    alpha: false,
    antialias: false,
    powerPreference: "high-performance",
  });
}

type KnobDef = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
};

function CraftKnobGrid({ knobs }: { knobs: readonly KnobDef[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {knobs.map((knob) => {
        const decimals = knob.step < 1 ? 2 : 0;
        return (
          <label
            key={knob.key}
            className="flex min-w-0 flex-col gap-1 text-[11px] uppercase tracking-[0.12em] text-white/55"
          >
            <span className="flex items-baseline justify-between gap-1">
              <span className="truncate font-medium text-white/70">
                {knob.label}
              </span>
              <span className="shrink-0 font-mono text-[12px] normal-case tracking-normal text-teal-400/80">
                {knob.value.toFixed(decimals)}
              </span>
            </span>
            <input
              type="range"
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
              min={knob.min}
              max={knob.max}
              step={knob.step}
              value={knob.value}
              onChange={(e) => knob.onChange(Number(e.target.value))}
            />
          </label>
        );
      })}
    </div>
  );
}

const COPY = {
  fr: {
    title: "Craft Lueur",
    sub: "Hero · Constellation · Lueur produit",
    tabHero: "1 — Hero",
    tabConstellation: "2 — Constellation",
    tabProduit: "3 — Lueur produit",
    hintHero: "3 layers indépendants — blanc · teal · spikes",
    hintConstellation: "Graphe Leo avec Hero au centre",
    hintProduit: "SKU / carte — même famille visuelle",
    layerWhite: "Layer blanc (cœur)",
    layerTeal: "Layer teal (glow)",
    layerSpikes: "Layer spikes",
    layer3d: "3D (profondeur + tilt)",
    size: "Taille",
    glow: "Intensité",
    breath: "Respiration",
    depth: "Profondeur Z",
    amount: "Force spikes",
    rotate: "Rotation",
    parallax: "Parallax souris",
    sky: "Ciel",
    eclipse: "Éclipse",
    wormhole: "Wormhole",
  },
  en: {
    title: "Lueur craft",
    sub: "Hero · Constellation · Product Lueur",
    tabHero: "1 — Hero",
    tabConstellation: "2 — Constellation",
    tabProduit: "3 — Product Lueur",
    hintHero: "3 independent layers — white · teal · spikes",
    hintConstellation: "Leo graph with Hero at center",
    hintProduit: "SKU / card — same visual family",
    layerWhite: "White layer (core)",
    layerTeal: "Teal layer (glow)",
    layerSpikes: "Spikes layer",
    layer3d: "3D (depth + tilt)",
    size: "Size",
    glow: "Intensity",
    breath: "Breath",
    depth: "Depth Z",
    amount: "Spike strength",
    rotate: "Rotation",
    parallax: "Mouse parallax",
    sky: "Sky",
    eclipse: "Eclipse",
    wormhole: "Wormhole",
  },
} as const;

function layerKnobs(
  prefix: string,
  labels: {
    size: string;
    glow: string;
    breath: string;
    depth: string;
    amount: string;
    rotate: string;
  },
  state: HeroLayerKnobs,
  setState: React.Dispatch<React.SetStateAction<HeroLayerKnobs>>,
): KnobDef[] {
  return [
    {
      key: `${prefix}-size`,
      label: labels.size,
      min: 0.05,
      max: 4,
      step: 0.01,
      value: state.size,
      onChange: (v) => setState((s) => ({ ...s, size: v })),
    },
    {
      key: `${prefix}-glow`,
      label: labels.glow,
      min: 0,
      max: 2.5,
      step: 0.01,
      value: state.glow,
      onChange: (v) => setState((s) => ({ ...s, glow: v })),
    },
    {
      key: `${prefix}-breath`,
      label: labels.breath,
      min: 0.05,
      max: 0.7,
      step: 0.01,
      value: state.breath,
      onChange: (v) => setState((s) => ({ ...s, breath: v })),
    },
    {
      key: `${prefix}-depth`,
      label: labels.depth,
      min: -0.6,
      max: 0.6,
      step: 0.01,
      value: state.depth,
      onChange: (v) => setState((s) => ({ ...s, depth: v })),
    },
    {
      key: `${prefix}-amount`,
      label: labels.amount,
      min: 0,
      max: 2.5,
      step: 0.01,
      value: state.amount,
      onChange: (v) => setState((s) => ({ ...s, amount: v })),
    },
    {
      key: `${prefix}-rotate`,
      label: labels.rotate,
      min: 0,
      max: 360,
      step: 1,
      value: state.rotationDeg,
      onChange: (v) => setState((s) => ({ ...s, rotationDeg: v })),
    },
  ];
}

/**
 * Lab craft — contrôles style wormhole/éclipse (readout teal).
 */
export function LueurCraftLab({ locale = "fr" }: { locale?: Locale }) {
  const tier = useVisualTier();
  const t = COPY[locale];
  const [tab, setTab] = useState<LabTab>("hero");
  const [white, setWhite] = useState<HeroLayerKnobs>(DEFAULT_HERO_WHITE);
  const [teal, setTeal] = useState<HeroLayerKnobs>(DEFAULT_HERO_TEAL);
  const [spikes, setSpikes] = useState<HeroLayerKnobs>(DEFAULT_HERO_SPIKES);
  const [parallax, setParallax] = useState(0.45);

  const tabs: { id: LabTab; label: string; hint: string }[] = [
    { id: "hero", label: t.tabHero, hint: t.hintHero },
    { id: "constellation", label: t.tabConstellation, hint: t.hintConstellation },
    { id: "produit", label: t.tabProduit, hint: t.hintProduit },
  ];

  const layerLabels = {
    size: t.size,
    glow: t.glow,
    breath: t.breath,
    depth: t.depth,
    amount: t.amount,
    rotate: t.rotate,
  };
  const whiteKnobs = layerKnobs("w", layerLabels, white, setWhite);
  const tealKnobs = layerKnobs("t", layerLabels, teal, setTeal);
  const spikeKnobs = layerKnobs("s", layerLabels, spikes, setSpikes);
  const depth3dKnobs: KnobDef[] = [
    {
      key: "parallax",
      label: t.parallax,
      min: 0,
      max: 1.2,
      step: 0.01,
      value: parallax,
      onChange: setParallax,
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100 antialiased">
      {tab === "hero" ? (
        <ClientWebGLGate
          fallback={(message) => (
            <div className="flex min-h-screen items-center justify-center px-6 text-center text-sm text-white/50">
              {message}
            </div>
          )}
        >
          <div className="fixed inset-0 z-0">
            <Canvas
              className="h-full w-full"
              frameloop="demand"
              dpr={tierDpr(tier)}
              camera={{ position: [0, 0, 4.2], fov: 42, near: 0.1, far: 40 }}
              gl={createBlackRenderer}
              onCreated={({ gl }) => {
                gl.setClearColor(new Color("#000000"), 1);
              }}
            >
              <Suspense fallback={null}>
                <ForceRenderLoop />
                <color attach="background" args={["#000000"]} />
                <HeroStar
                  white={white}
                  teal={teal}
                  spikes={spikes}
                  parallax={parallax}
                />
              </Suspense>
            </Canvas>
          </div>
        </ClientWebGLGate>
      ) : null}

      {tab === "constellation" ? (
        <div className="fixed inset-0 z-0">
          <SanctuaryUniverse mode="immersive" locale={locale} />
        </div>
      ) : null}

      {tab === "produit" ? (
        <div className="fixed inset-0 z-0 flex flex-col items-center justify-center gap-10 bg-gradient-to-b from-zinc-950 to-black px-6 pb-48">
          <div className="flex flex-wrap items-end justify-center gap-12">
            <div className="flex flex-col items-center gap-3">
              <SanctuaryLueurOrb size="card" aria-label="Lueur carte" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                card
              </span>
            </div>
            <div className="flex flex-col items-center gap-3">
              <SanctuaryLueurOrb size="ritual" aria-label="Lueur rituel" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                ritual
              </span>
            </div>
            <div className="flex h-48 w-48 flex-col items-center justify-center gap-3">
              <ClientWebGLGate
                fallback={() => (
                  <div className="h-24 w-24 rounded-full bg-teal-400/20 blur-xl" />
                )}
              >
                <Canvas
                  className="h-40 w-40"
                  dpr={tierDpr(tier)}
                  camera={{ position: [0, 0, 3.2], fov: 40 }}
                  gl={createBlackRenderer}
                  onCreated={({ gl }) => {
                    gl.setClearColor(new Color("#000000"), 1);
                  }}
                >
                  <Suspense fallback={null}>
                    <ForceRenderLoop />
                    <HeroStar
                      white={{ ...white, size: white.size * 0.55 }}
                      teal={{ ...teal, size: teal.size * 0.55 }}
                      spikes={{ ...spikes, size: spikes.size * 0.55 }}
                      parallax={parallax * 0.6}
                    />
                  </Suspense>
                </Canvas>
              </ClientWebGLGate>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                hero atom (cible)
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-1 px-5 pt-6 md:px-10 md:pt-10">
        <p className="text-xs font-light uppercase tracking-[0.28em] text-white/45 md:text-sm">
          {t.title}
        </p>
        <p className="text-sm font-light text-white/50 md:text-base">{t.sub}</p>
      </div>

      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 max-h-[42vh] overflow-y-auto border-t border-white/10 bg-black/55 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-sm border px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] ${
                  tab === item.id
                    ? "border-white/40 text-white/90"
                    : "border-white/15 text-white/55 hover:border-white/30"
                }`}
              >
                {item.label}
              </button>
            ))}
            <Link
              href={`/${locale}/contribute/test-ciel`}
              className="rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55 hover:border-white/30"
            >
              {t.sky}
            </Link>
            <Link
              href={`/${locale}/contribute/test-eclipse`}
              className="rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55 hover:border-white/30"
            >
              {t.eclipse}
            </Link>
            <Link
              href={`/${locale}/contribute/test-wormhole`}
              className="rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55 hover:border-white/30"
            >
              {t.wormhole}
            </Link>
            <p className="ml-auto hidden text-[11px] font-light tracking-wide text-white/30 sm:block">
              {tabs.find((x) => x.id === tab)?.hint}
            </p>
          </div>

          {tab === "hero" || tab === "produit" ? (
            <div className="flex flex-col gap-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-400/70">
                {t.layerWhite}
              </p>
              <CraftKnobGrid knobs={whiteKnobs} />
              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-400/70">
                {t.layerTeal}
              </p>
              <CraftKnobGrid knobs={tealKnobs} />
              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-400/70">
                {t.layerSpikes}
              </p>
              <CraftKnobGrid knobs={spikeKnobs} />
              <p className="text-[10px] uppercase tracking-[0.2em] text-teal-400/70">
                {t.layer3d}
              </p>
              <CraftKnobGrid knobs={depth3dKnobs} />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
