"use client";

import { Canvas, useThree } from "@react-three/fiber";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { Color, WebGLRenderer } from "three";

import {
  DEFAULT_BRIDGES,
  DEFAULT_SLOT_STARS,
  type BridgeFamilyCraft,
  type BridgeLineStyle,
  type BridgesCraft,
  type SlotStarsCraft,
} from "@/src/components/contribute/constellation/craftDefaults";
import {
  DEFAULT_HERO_GLOBAL_SCALE,
  DEFAULT_HERO_PARALLAX,
  DEFAULT_HERO_SPIKES,
  DEFAULT_HERO_TEAL,
  DEFAULT_HERO_WHITE,
  HeroStar,
  type HeroLayerKnobs,
} from "@/src/components/contribute/constellation/HeroStar";
import { resolveBirth } from "@/src/components/contribute/constellation/graphs/birth";
import { resolveDrawPhase } from "@/src/components/contribute/constellation/graphs/drawPhase";
import {
  DEFAULT_CONSTELLATION_REVEAL_MS,
  DEFAULT_HERO_SHARE,
  DEFAULT_STROKE_OVERLAP,
} from "@/src/components/contribute/constellation/graphs/reveal";
import {
  LEO_SLOT_IDS,
  defaultCraftSlotLit,
  leoSlotWeight,
} from "@/src/components/contribute/constellation/graphs/resolveConstellation";
import {
  SanctuaryUniverse,
  type ConstellationRevealCraft,
} from "@/src/components/contribute/SanctuaryUniverse";
import type { CurrentTipStyle } from "@/src/components/contribute/constellation/LightBridges";
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
  disabled?: boolean;
};

function CraftKnobGrid({ knobs }: { knobs: readonly KnobDef[] }) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
      {knobs.map((knob) => {
        const decimals = knob.step < 1 ? 2 : 0;
        return (
          <label
            key={knob.key}
            className={`flex min-w-0 flex-col gap-0.5 text-[9px] uppercase tracking-[0.1em] ${
              knob.disabled ? "opacity-40" : "text-white/50"
            }`}
          >
            <span className="flex items-baseline justify-between gap-1">
              <span className="truncate font-medium text-white/65">
                {knob.label}
              </span>
              <span className="shrink-0 font-mono text-[10px] normal-case tracking-normal text-teal-400/75">
                {knob.value.toFixed(decimals)}
              </span>
            </span>
            <input
              type="range"
              disabled={knob.disabled}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white disabled:cursor-not-allowed"
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
    hintConstellation:
      "Même Hero que l’onglet 1 — change Hero, vois ici l’ensemble",
    hintProduit: "SKU / carte — même famille visuelle",
    layerWhite: "Layer blanc (cœur)",
    layerTeal: "Layer teal (glow)",
    layerSpikes: "Layer spikes",
    layer3d: "3D (profondeur + tilt)",
    layerMaster: "Taille générale",
    ratiosOk: "Knobs OK — ratios figés",
    ratiosHint: "Coche quand le look layer-par-layer te plaît, puis agrandis tout",
    globalScale: "Taille générale",
    layerReveal: "Tempo (pendant le play / scrub)",
    layerLook: "Look graphe",
    layerSlots: "Étoiles (slots)",
    layerSlotLit: "Mock slots (allumé / ghost)",
    slotLitAll: "Tous allumés",
    slotGhostAll: "Tous ghosts",
    slotLitOn: "ON",
    slotLitOff: "Ghost",
    layerBridgesMajor: "Traits majeurs (silhouette)",
    layerBridgesMinor: "Traits mineurs (détail)",
    layerTip: "Courant (pointe qui dessine)",
    size: "Taille",
    sizeBright: "Taille bright",
    sizeMedium: "Taille medium",
    sizeDim: "Taille dim",
    ghostSize: "Taille ghosts",
    glow: "Intensité",
    breath: "Respiration",
    depth: "Profondeur Z",
    amount: "Force spikes",
    rotate: "Rotation",
    parallax: "Parallax souris",
    timeline: "Scrub reveal",
    play: "Play",
    pause: "Pause",
    restart: "Rejouer",
    duration: "Durée play (s)",
    heroShare: "Solo hero (début)",
    strokeOverlap: "Overlap traits",
    graphScale: "Échelle graphe",
    bridgeWidth: "Épaisseur",
    bridgeOpacity: "Opacité",
    bridgeColor: "Couleur",
    bridgeCore: "Noyau",
    bridgeHalo: "Halo",
    styleSolid: "Continu",
    styleDotted: "Pointillé",
    styleDashed: "Tirets",
    styleGlow: "Glow / ray",
    tipStrength: "Force courant",
    tipSize: "Taille courant",
    tipColor: "Couleur courant",
    tipTrail: "Trait",
    tipStar: "Étoile",
    tipOrb: "Rond + halo",
    ghostDim: "Ghosts (dim)",
    heroEmbed: "Taille hero (ciel)",
    sky: "Ciel",
    eclipse: "Éclipse",
    wormhole: "Wormhole",
    hidePanel: "Masquer",
    showPanel: "Knobs",
  },
  en: {
    title: "Lueur craft",
    sub: "Hero · Constellation · Product Lueur",
    tabHero: "1 — Hero",
    tabConstellation: "2 — Constellation",
    tabProduit: "3 — Product Lueur",
    hintHero: "3 independent layers — white · teal · spikes",
    hintConstellation:
      "Same Hero as tab 1 — change Hero, see the whole here",
    hintProduit: "SKU / card — same visual family",
    layerWhite: "White layer (core)",
    layerTeal: "Teal layer (glow)",
    layerSpikes: "Spikes layer",
    layer3d: "3D (depth + tilt)",
    layerMaster: "Master size",
    ratiosOk: "Knobs OK — ratios locked",
    ratiosHint: "Check when layer-by-layer look is right, then scale everything",
    globalScale: "Master size",
    layerReveal: "Timing (during play / scrub)",
    layerLook: "Graph look",
    layerSlots: "Stars (slots)",
    layerSlotLit: "Mock slots (lit / ghost)",
    slotLitAll: "All lit",
    slotGhostAll: "All ghosts",
    slotLitOn: "ON",
    slotLitOff: "Ghost",
    layerBridgesMajor: "Major lines (silhouette)",
    layerBridgesMinor: "Minor lines (detail)",
    layerTip: "Current tip (drawing head)",
    size: "Size",
    sizeBright: "Bright size",
    sizeMedium: "Medium size",
    sizeDim: "Dim size",
    ghostSize: "Ghost size",
    glow: "Intensity",
    breath: "Breath",
    depth: "Depth Z",
    amount: "Spike strength",
    rotate: "Rotation",
    parallax: "Mouse parallax",
    timeline: "Scrub reveal",
    play: "Play",
    pause: "Pause",
    restart: "Replay",
    duration: "Play duration (s)",
    heroShare: "Hero alone (start)",
    strokeOverlap: "Stroke overlap",
    graphScale: "Graph scale",
    bridgeWidth: "Width",
    bridgeOpacity: "Opacity",
    bridgeColor: "Color",
    bridgeCore: "Core",
    bridgeHalo: "Halo",
    styleSolid: "Solid",
    styleDotted: "Dotted",
    styleDashed: "Dashed",
    styleGlow: "Glow / ray",
    tipStrength: "Tip strength",
    tipSize: "Tip size",
    tipColor: "Tip color",
    tipTrail: "Trail",
    tipStar: "Star",
    tipOrb: "Orb + halo",
    ghostDim: "Ghosts (dim)",
    heroEmbed: "Hero size (sky)",
    sky: "Sky",
    eclipse: "Eclipse",
    wormhole: "Wormhole",
    hidePanel: "Hide",
    showPanel: "Knobs",
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
  const [parallax, setParallax] = useState(DEFAULT_HERO_PARALLAX);
  const [heroRatiosOk, setHeroRatiosOk] = useState(true);
  const [heroGlobalScale, setHeroGlobalScale] = useState(
    DEFAULT_HERO_GLOBAL_SCALE,
  );

  const [revealT, setRevealT] = useState(0);
  const revealTRef = useRef(0);
  const [revealPlaying, setRevealPlaying] = useState(false);
  const [revealDurationMs, setRevealDurationMs] = useState(
    DEFAULT_CONSTELLATION_REVEAL_MS,
  );
  const [heroShare, setHeroShare] = useState(DEFAULT_HERO_SHARE);
  const [strokeOverlap, setStrokeOverlap] = useState(DEFAULT_STROKE_OVERLAP);
  const [graphScale, setGraphScale] = useState(1);
  const [tipStrength, setTipStrength] = useState(1.2);
  const [tipSize, setTipSize] = useState(1);
  const [tipColor, setTipColor] = useState("#5eead4");
  const [tipStyle, setTipStyle] = useState<CurrentTipStyle>("orb");
  const [slotStars, setSlotStars] = useState<SlotStarsCraft>(DEFAULT_SLOT_STARS);
  const [bridges, setBridges] = useState<BridgesCraft>(DEFAULT_BRIDGES);
  const [slotLit, setSlotLit] = useState<Record<string, boolean>>(
    defaultCraftSlotLit,
  );
  const [heroEmbedScale, setHeroEmbedScale] = useState(0.42);
  const [panelOpen, setPanelOpen] = useState(true);
  const revealPlayFromRef = useRef(0);

  useEffect(() => {
    if (tab !== "constellation") {
      setRevealPlaying(false);
      return;
    }
    revealPlayFromRef.current = 0;
    revealTRef.current = 0;
    setRevealT(0);
    setRevealPlaying(true);
  }, [tab]);

  useEffect(() => {
    if (tab !== "constellation" || !revealPlaying) return;
    let raf = 0;
    const t0 = performance.now();
    const r0 = revealPlayFromRef.current;
    const spanMs = Math.max(80, (1 - r0) * revealDurationMs);
    let lastUi = 0;
    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / spanMs);
      const next = r0 + (1 - r0) * u;
      // Live path for WebGL — no React re-render of lab shell
      revealTRef.current = next;
      // Scrubber % only ~10 Hz (was every frame → saccades)
      if (now - lastUi >= 100 || u >= 1) {
        lastUi = now;
        setRevealT(next);
      }
      if (u < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setRevealPlaying(false);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tab, revealPlaying, revealDurationMs]);

  const craftReveal: ConstellationRevealCraft = {
    controlled: true,
    revealT,
    revealTRef,
    heroShare,
    strokeOverlap,
    graphScale,
    tipStrength,
    tipStyle,
    tipColor,
    tipSize,
    ghostDim: slotStars.ghostDim,
    slotStars,
    bridges,
    slotLit,
    heroAtom: {
      white,
      teal,
      spikes,
      embedScale: heroEmbedScale,
      globalScale: heroGlobalScale,
    },
  };

  const onRevealPlay = () => {
    if (revealTRef.current >= 0.999) {
      revealPlayFromRef.current = 0;
      revealTRef.current = 0;
      setRevealT(0);
    } else {
      revealPlayFromRef.current = revealTRef.current;
    }
    setRevealPlaying(true);
  };
  const onRevealPause = () => {
    setRevealPlaying(false);
    setRevealT(revealTRef.current);
  };
  const onRevealRestart = () => {
    setRevealPlaying(false);
    revealPlayFromRef.current = 0;
    revealTRef.current = 0;
    setRevealT(0);
    requestAnimationFrame(() => setRevealPlaying(true));
  };
  const onRevealScrub = (v: number) => {
    setRevealPlaying(false);
    revealTRef.current = v;
    setRevealT(v);
  };

  const birthBeat = resolveBirth(revealT).beat;
  const drawBeat = resolveDrawPhase(revealT).beat;
  const displayBeat = drawBeat ?? birthBeat;

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
  const masterSizeKnobs: KnobDef[] = [
    {
      key: "hero-global",
      label: t.globalScale,
      min: 0.35,
      max: 2.8,
      step: 0.01,
      value: heroGlobalScale,
      onChange: setHeroGlobalScale,
      disabled: !heroRatiosOk,
    },
  ];
  const timingKnobs: KnobDef[] = [
    {
      key: "reveal-t",
      label: t.timeline,
      min: 0,
      max: 1,
      step: 0.001,
      value: revealT,
      onChange: onRevealScrub,
    },
    {
      key: "reveal-dur",
      label: t.duration,
      min: 1,
      max: 12,
      step: 0.1,
      value: revealDurationMs / 1000,
      onChange: (v) => setRevealDurationMs(v * 1000),
    },
    {
      key: "hero-share",
      label: t.heroShare,
      min: 0.05,
      max: 0.55,
      step: 0.01,
      value: heroShare,
      onChange: setHeroShare,
    },
    {
      key: "stroke-overlap",
      label: t.strokeOverlap,
      min: 0,
      max: 0.85,
      step: 0.01,
      value: strokeOverlap,
      onChange: setStrokeOverlap,
    },
  ];
  const lookKnobs: KnobDef[] = [
    {
      key: "graph-scale",
      label: t.graphScale,
      min: 0.4,
      max: 2.2,
      step: 0.01,
      value: graphScale,
      onChange: setGraphScale,
    },
    {
      key: "hero-embed",
      label: t.heroEmbed,
      min: 0.12,
      max: 1.4,
      step: 0.01,
      value: heroEmbedScale,
      onChange: setHeroEmbedScale,
    },
  ];
  const slotKnobs: KnobDef[] = [
    {
      key: "slot-bright",
      label: t.sizeBright,
      min: 0.3,
      max: 2.8,
      step: 0.01,
      value: slotStars.sizeBright,
      onChange: (v) => setSlotStars((s) => ({ ...s, sizeBright: v })),
    },
    {
      key: "slot-medium",
      label: t.sizeMedium,
      min: 0.3,
      max: 2.8,
      step: 0.01,
      value: slotStars.sizeMedium,
      onChange: (v) => setSlotStars((s) => ({ ...s, sizeMedium: v })),
    },
    {
      key: "slot-dim",
      label: t.sizeDim,
      min: 0.3,
      max: 2.8,
      step: 0.01,
      value: slotStars.sizeDim,
      onChange: (v) => setSlotStars((s) => ({ ...s, sizeDim: v })),
    },
    {
      key: "slot-glow",
      label: t.glow,
      min: 0.1,
      max: 2.5,
      step: 0.01,
      value: slotStars.glow,
      onChange: (v) => setSlotStars((s) => ({ ...s, glow: v })),
    },
    {
      key: "slot-breath",
      label: t.breath,
      min: 0.1,
      max: 2.5,
      step: 0.01,
      value: slotStars.breath,
      onChange: (v) => setSlotStars((s) => ({ ...s, breath: v })),
    },
    {
      key: "slot-ghost-size",
      label: t.ghostSize,
      min: 0.2,
      max: 2.5,
      step: 0.01,
      value: slotStars.ghostSize,
      onChange: (v) => setSlotStars((s) => ({ ...s, ghostSize: v })),
    },
    {
      key: "slot-ghost-dim",
      label: t.ghostDim,
      min: 0.05,
      max: 1.5,
      step: 0.05,
      value: slotStars.ghostDim,
      onChange: (v) => setSlotStars((s) => ({ ...s, ghostDim: v })),
    },
  ];

  const patchBridge = (
    tier: keyof BridgesCraft,
    patch: Partial<BridgeFamilyCraft>,
  ) => {
    setBridges((b) => ({ ...b, [tier]: { ...b[tier], ...patch } }));
  };

  const bridgeFamilyKnobs = (tier: keyof BridgesCraft): KnobDef[] => {
    const f = bridges[tier];
    return [
      {
        key: `${tier}-w`,
        label: t.bridgeWidth,
        min: 0.15,
        max: 3.5,
        step: 0.05,
        value: f.width,
        onChange: (v) => patchBridge(tier, { width: v }),
      },
      {
        key: `${tier}-o`,
        label: t.bridgeOpacity,
        min: 0.05,
        max: 2.5,
        step: 0.05,
        value: f.opacity,
        onChange: (v) => patchBridge(tier, { opacity: v }),
      },
    ];
  };

  const styleModes: { id: BridgeLineStyle; label: string }[] = [
    { id: "solid", label: t.styleSolid },
    { id: "dotted", label: t.styleDotted },
    { id: "dashed", label: t.styleDashed },
    { id: "glow", label: t.styleGlow },
  ];

  const colorPresets = [
    "#5eead4",
    "#ccfbf1",
    "#99f6e4",
    "#2dd4bf",
    "#e8eef8",
    "#fde68a",
  ];
  const tipKnobs: KnobDef[] = [
    {
      key: "tip-strength",
      label: t.tipStrength,
      min: 0,
      max: 2.5,
      step: 0.05,
      value: tipStrength,
      onChange: setTipStrength,
    },
    {
      key: "tip-size",
      label: t.tipSize,
      min: 0.2,
      max: 3,
      step: 0.05,
      value: tipSize,
      onChange: setTipSize,
    },
  ];

  const tipModes: { id: CurrentTipStyle; label: string }[] = [
    { id: "trail", label: t.tipTrail },
    { id: "star", label: t.tipStar },
    { id: "orb", label: t.tipOrb },
  ];
  const tipPresets = ["#5eead4", "#ccfbf1", "#a78bfa", "#f472b6", "#38bdf8", "#ffffff"];

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
                  globalScale={heroGlobalScale}
                />
              </Suspense>
            </Canvas>
          </div>
        </ClientWebGLGate>
      ) : null}

      {tab === "constellation" ? (
        <div className="fixed inset-0 z-0">
          <SanctuaryUniverse
            mode="immersive"
            locale={locale}
            craftReveal={craftReveal}
          />
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
                      globalScale={heroGlobalScale}
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

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-0.5 px-4 pt-4 md:px-8 md:pt-6">
        <p className="text-[10px] font-light uppercase tracking-[0.28em] text-white/40 md:text-xs">
          {t.title}
        </p>
        <p className="text-xs font-light text-white/40 md:text-sm">{t.sub}</p>
      </div>

      {!panelOpen ? (
        <div className="pointer-events-auto absolute bottom-4 right-4 z-30 flex flex-wrap items-center justify-end gap-1.5">
          {tab === "constellation" ? (
            <div className="flex items-center gap-1.5 rounded-sm border border-white/20 bg-black/70 px-2 py-1.5 backdrop-blur-md">
              <button
                type="button"
                onClick={onRevealPlay}
                disabled={revealPlaying}
                className="rounded-sm border border-white/25 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/80 hover:border-white/45 disabled:opacity-40"
              >
                {t.play}
              </button>
              <button
                type="button"
                onClick={onRevealPause}
                disabled={!revealPlaying}
                className="rounded-sm border border-white/25 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/80 hover:border-white/45 disabled:opacity-40"
              >
                {t.pause}
              </button>
              <button
                type="button"
                onClick={onRevealRestart}
                className="rounded-sm border border-white/25 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/80 hover:border-white/45"
              >
                {t.restart}
              </button>
              <span className="px-1 font-mono text-[11px] text-teal-400/80">
                {displayBeat} · {(revealT * 100).toFixed(0)}%
              </span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="rounded-sm border border-white/25 bg-black/70 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-white/80 backdrop-blur-md hover:border-teal-400/40 hover:text-teal-100"
          >
            {t.showPanel}
          </button>
        </div>
      ) : (
        <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 max-h-[28vh] overflow-y-auto border-t border-white/10 bg-black/70 px-3 py-2 backdrop-blur-md md:max-h-[32vh] md:px-5 md:py-2.5">
          <div className="mx-auto flex max-w-6xl flex-col gap-2">
            <div className="sticky top-0 z-10 -mx-3 flex flex-wrap items-center gap-1.5 bg-black/80 px-3 py-1.5 backdrop-blur-md md:-mx-5 md:px-5">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`rounded-sm border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${
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
                className="rounded-sm border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/55 hover:border-white/30"
              >
                {t.sky}
              </Link>
              <Link
                href={`/${locale}/contribute/test-eclipse`}
                className="rounded-sm border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/55 hover:border-white/30"
              >
                {t.eclipse}
              </Link>
              <Link
                href={`/${locale}/contribute/test-wormhole`}
                className="rounded-sm border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/55 hover:border-white/30"
              >
                {t.wormhole}
              </Link>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="ml-auto rounded-sm border border-white/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/70 hover:border-teal-400/40 hover:text-teal-100"
              >
                {t.hidePanel}
              </button>
            </div>

          {tab === "hero" || tab === "produit" ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                {t.layerWhite}
              </p>
              <CraftKnobGrid knobs={whiteKnobs} />
              <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                {t.layerTeal}
              </p>
              <CraftKnobGrid knobs={tealKnobs} />
              <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                {t.layerSpikes}
              </p>
              <CraftKnobGrid knobs={spikeKnobs} />
              <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                {t.layer3d}
              </p>
              <CraftKnobGrid knobs={depth3dKnobs} />
              <div className="flex flex-col gap-1.5 border-t border-white/10 pt-2">
                <label className="flex cursor-pointer items-start gap-2 text-[11px] text-white/75">
                  <input
                    type="checkbox"
                    checked={heroRatiosOk}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setHeroRatiosOk(on);
                      if (!on) setHeroGlobalScale(1);
                    }}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-teal-400"
                  />
                  <span>
                    <span className="font-medium uppercase tracking-[0.14em] text-teal-200/90">
                      {t.ratiosOk}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-light normal-case tracking-normal text-white/40">
                      {t.ratiosHint}
                    </span>
                  </span>
                </label>
                <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                  {t.layerMaster}
                </p>
                <CraftKnobGrid knobs={masterSizeKnobs} />
              </div>
            </div>
          ) : null}

          {tab === "constellation" ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={onRevealPlay}
                  disabled={revealPlaying}
                  className="rounded-sm border border-white/25 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/80 hover:border-white/45 disabled:opacity-40"
                >
                  {t.play}
                </button>
                <button
                  type="button"
                  onClick={onRevealPause}
                  disabled={!revealPlaying}
                  className="rounded-sm border border-white/25 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/80 hover:border-white/45 disabled:opacity-40"
                >
                  {t.pause}
                </button>
                <button
                  type="button"
                  onClick={onRevealRestart}
                  className="rounded-sm border border-white/25 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/80 hover:border-white/45"
                >
                  {t.restart}
                </button>
                <span className="font-mono text-[11px] text-teal-400/80">
                  {displayBeat} · {(revealT * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                {t.layerReveal}
              </p>
              <CraftKnobGrid knobs={timingKnobs} />
              <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                {t.layerLook}
              </p>
              <CraftKnobGrid knobs={lookKnobs} />
              <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                {t.layerSlotLit}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next: Record<string, boolean> = {};
                    for (const id of LEO_SLOT_IDS) next[id] = true;
                    setSlotLit(next);
                  }}
                  className="rounded-sm border border-white/20 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-white/70 hover:border-teal-400/40"
                >
                  {t.slotLitAll}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next: Record<string, boolean> = {};
                    for (const id of LEO_SLOT_IDS) next[id] = false;
                    setSlotLit(next);
                  }}
                  className="rounded-sm border border-white/20 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-white/70 hover:border-teal-400/40"
                >
                  {t.slotGhostAll}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {LEO_SLOT_IDS.map((id) => {
                  const on = slotLit[id] === true;
                  const w = leoSlotWeight(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        setSlotLit((s) => ({ ...s, [id]: !s[id] }))
                      }
                      className={`rounded-sm border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] ${
                        on
                          ? "border-teal-400/45 text-teal-100"
                          : "border-white/15 text-white/45"
                      }`}
                      title={`${id} · ${w}`}
                    >
                      {id}
                      <span className="ml-1 opacity-50">{w}</span>
                      <span className="ml-1 font-mono opacity-70">
                        {on ? t.slotLitOn : t.slotLitOff}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                {t.layerSlots}
              </p>
              <CraftKnobGrid knobs={slotKnobs} />
              {(
                [
                  ["major", t.layerBridgesMajor],
                  ["minor", t.layerBridgesMinor],
                ] as const
              ).map(([tier, label]) => {
                const fam = bridges[tier];
                const isGlow = fam.style === "glow";
                return (
                  <div key={tier} className="flex flex-col gap-1.5">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                      {label}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {styleModes.map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() =>
                            patchBridge(tier, { style: mode.id })
                          }
                          className={`rounded-sm border px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] ${
                            fam.style === mode.id
                              ? "border-teal-400/50 text-teal-100"
                              : "border-white/15 text-white/55 hover:border-white/30"
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                    <CraftKnobGrid knobs={bridgeFamilyKnobs(tier)} />
                    <div className="flex flex-wrap items-center gap-2">
                      {isGlow ? (
                        <>
                          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-white/55">
                            <span>{t.bridgeCore}</span>
                            <input
                              type="color"
                              value={fam.coreColor}
                              onChange={(e) =>
                                patchBridge(tier, {
                                  coreColor: e.target.value,
                                })
                              }
                              className="h-6 w-8 cursor-pointer rounded-sm border border-white/20 bg-transparent"
                            />
                          </label>
                          <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-white/55">
                            <span>{t.bridgeHalo}</span>
                            <input
                              type="color"
                              value={fam.haloColor}
                              onChange={(e) =>
                                patchBridge(tier, {
                                  haloColor: e.target.value,
                                })
                              }
                              className="h-6 w-8 cursor-pointer rounded-sm border border-white/20 bg-transparent"
                            />
                          </label>
                        </>
                      ) : (
                        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-white/55">
                          <span>{t.bridgeColor}</span>
                          <input
                            type="color"
                            value={fam.color}
                            onChange={(e) =>
                              patchBridge(tier, { color: e.target.value })
                            }
                            className="h-6 w-8 cursor-pointer rounded-sm border border-white/20 bg-transparent"
                          />
                        </label>
                      )}
                      <div className="flex items-center gap-1">
                        {colorPresets.map((hex) => (
                          <button
                            key={`${tier}-${hex}`}
                            type="button"
                            aria-label={hex}
                            onClick={() =>
                              patchBridge(
                                tier,
                                isGlow
                                  ? { coreColor: hex, haloColor: hex }
                                  : { color: hex },
                              )
                            }
                            className="h-4 w-4 rounded-full border border-white/25"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                {t.layerTip}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {tipModes.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setTipStyle(mode.id)}
                    className={`rounded-sm border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${
                      tipStyle === mode.id
                        ? "border-teal-400/50 text-teal-100"
                        : "border-white/15 text-white/55 hover:border-white/30"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
                <label className="ml-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] text-white/55">
                  <span>{t.tipColor}</span>
                  <input
                    type="color"
                    value={tipColor}
                    onChange={(e) => setTipColor(e.target.value)}
                    className="h-6 w-8 cursor-pointer rounded-sm border border-white/20 bg-transparent"
                  />
                </label>
                <div className="flex items-center gap-1">
                  {tipPresets.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={hex}
                      onClick={() => setTipColor(hex)}
                      className={`h-4 w-4 rounded-full border ${
                        tipColor.toLowerCase() === hex.toLowerCase()
                          ? "border-white"
                          : "border-white/25"
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
              <CraftKnobGrid knobs={tipKnobs} />
            </div>
          ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
