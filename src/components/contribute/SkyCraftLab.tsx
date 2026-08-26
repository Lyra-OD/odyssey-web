"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SanctuaryUniverse } from "@/src/components/contribute/SanctuaryUniverse";
import {
  SKY_LAB_DEFAULT_LAYERS,
  type SkyCraftLayerId,
} from "@/src/components/contribute/constellation/skyCraftLayers";
import {
  defaultSkyTheme,
  mergeSkyTheme,
  type DeepPartial,
  type SkyTheme,
} from "@/src/components/contribute/constellation/skyTheme";
import { useVisualTier } from "@/src/components/contribute/constellation/useVisualTier";
import type { Locale } from "@/i18n.config";

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
    <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
      {knobs.map((knob) => {
        const decimals = knob.step < 1 ? 2 : 0;
        return (
          <label
            key={knob.key}
            className="flex min-w-0 flex-col gap-0.5 text-[9px] uppercase tracking-[0.1em] text-white/50"
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
              min={knob.min}
              max={knob.max}
              step={knob.step}
              value={knob.value}
              onChange={(e) => knob.onChange(Number(e.target.value))}
              className="h-1 w-full cursor-pointer accent-teal-500/80"
            />
          </label>
        );
      })}
    </div>
  );
}

const COPY = {
  fr: {
    title: "Craft ciel",
    subtitle: "Fond Sanctuaire — layers · opacités · parallaxe",
    layers: "Layers",
    knobs: "Knobs",
    reset: "Réinit.",
    tier: "Tier",
    hidePanel: "Masquer",
    showPanel: "Knobs",
    testCiel: "test-ciel",
    testLueur: "Lueur",
    testEclipse: "Éclipse",
    testWormhole: "Wormhole",
    layerLabels: {
      gasFar: "Gaz lointain",
      ghostStars: "Ghost stars",
      gasRose: "Gaz rose",
      gasMauve: "Gaz mauve",
      gasTeal: "Gaz teal",
      cosmicDust: "Poussière",
      zodiacal: "Zodiacal",
      aurora: "Aurore",
      eclipse: "Éclipse",
      starsBand: "Voie lactée",
      starsField: "Étoiles proches",
      shootingStars: "Filantes",
      constellation: "Constellation",
    } satisfies Record<SkyCraftLayerId, string>,
  },
  en: {
    title: "Sky craft",
    subtitle: "Sanctuary backdrop — layers · opacity · parallax",
    layers: "Layers",
    knobs: "Knobs",
    reset: "Reset",
    tier: "Tier",
    hidePanel: "Hide",
    showPanel: "Knobs",
    testCiel: "test-ciel",
    testLueur: "Lueur",
    testEclipse: "Eclipse",
    testWormhole: "Wormhole",
    layerLabels: {
      gasFar: "Far gas",
      ghostStars: "Ghost stars",
      gasRose: "Rose gas",
      gasMauve: "Mauve gas",
      gasTeal: "Teal gas",
      cosmicDust: "Dust veil",
      zodiacal: "Zodiacal",
      aurora: "Aurora",
      eclipse: "Eclipse",
      starsBand: "Milky band",
      starsField: "Near stars",
      shootingStars: "Shooting stars",
      constellation: "Constellation",
    } satisfies Record<SkyCraftLayerId, string>,
  },
} as const;

function tierOpacityKnob(
  label: string,
  value: number,
  onChange: (v: number) => void,
): KnobDef {
  return {
    key: label,
    label,
    min: 0,
    max: 1,
    step: 0.01,
    value,
    onChange,
  };
}

/**
 * Lab craft fond ciel — `/fr/contribute/test-sky` (dev only).
 */
export function SkyCraftLab({ locale = "fr" }: { locale?: Locale }) {
  const tier = useVisualTier();
  const t = COPY[locale === "en" ? "en" : "fr"];
  const [panelOpen, setPanelOpen] = useState(true);
  const [layers, setLayers] = useState(SKY_LAB_DEFAULT_LAYERS);
  const [themeOverrides, setThemeOverrides] = useState<DeepPartial<SkyTheme>>({});
  const [parallaxIntensity, setParallaxIntensity] = useState(1);

  const resolvedTheme = useMemo(
    () => mergeSkyTheme(defaultSkyTheme, themeOverrides),
    [themeOverrides],
  );

  const patchTheme = (partial: DeepPartial<SkyTheme>) => {
    setThemeOverrides((prev) =>
      mergeSkyTheme(mergeSkyTheme(defaultSkyTheme, prev), partial),
    );
  };

  const setGasOpacity = (
    key: "gasFar" | "gasRose" | "gasMauve" | "gasTeal",
    desktop: number,
  ) => {
    patchTheme({
      [key]: {
        opacity: { desktop, mobile: desktop * 0.85, reduced: 0 },
      },
    });
  };

  const resetAll = () => {
    setLayers({ ...SKY_LAB_DEFAULT_LAYERS });
    setThemeOverrides({});
    setParallaxIntensity(1);
  };

  const toggleLayer = (id: SkyCraftLayerId) => {
    setLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const knobs: KnobDef[] = [
    tierOpacityKnob("Parallax", parallaxIntensity, setParallaxIntensity),
    tierOpacityKnob(
      "Fog far",
      resolvedTheme.scene.fogFar,
      (v) => patchTheme({ scene: { fogFar: v } }),
    ),
    tierOpacityKnob(
      "Gaz teal",
      resolvedTheme.gasTeal.opacity.desktop,
      (v) => setGasOpacity("gasTeal", v),
    ),
    tierOpacityKnob(
      "Gaz mauve",
      resolvedTheme.gasMauve.opacity.desktop,
      (v) => setGasOpacity("gasMauve", v),
    ),
    tierOpacityKnob(
      "Gaz rose",
      resolvedTheme.gasRose.opacity.desktop,
      (v) => setGasOpacity("gasRose", v),
    ),
    tierOpacityKnob(
      "Gaz loin",
      resolvedTheme.gasFar.opacity.desktop,
      (v) => setGasOpacity("gasFar", v),
    ),
    tierOpacityKnob(
      "Poussière",
      resolvedTheme.cosmicDust.opacity.desktop,
      (v) =>
        patchTheme({
          cosmicDust: {
            opacity: { desktop: v, mobile: v * 0.85, reduced: v * 0.5 },
          },
        }),
    ),
    tierOpacityKnob(
      "Band α",
      resolvedTheme.starsBand.alphaMul,
      (v) => patchTheme({ starsBand: { alphaMul: v } }),
    ),
    tierOpacityKnob(
      "Band size",
      resolvedTheme.starsBand.sizeMul,
      (v) => patchTheme({ starsBand: { sizeMul: v } }),
    ),
    tierOpacityKnob(
      "Field α",
      resolvedTheme.starsField.alphaMul,
      (v) => patchTheme({ starsField: { alphaMul: v } }),
    ),
  ];

  const layerIds = Object.keys(SKY_LAB_DEFAULT_LAYERS) as SkyCraftLayerId[];

  const labLinkClass =
    "rounded-sm border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/55 hover:border-white/30";

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100 antialiased">
      <div className="fixed inset-0 z-0">
        <SanctuaryUniverse
          mode="immersive"
          locale={locale === "en" ? "en" : "fr"}
          skyTheme={resolvedTheme}
          skyLayers={layers}
          skyCraftChrome={false}
          parallaxIntensity={parallaxIntensity}
          constellationVisible={layers.constellation}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 px-4 pt-4 md:px-8 md:pt-6">
        <p className="text-[10px] font-light uppercase tracking-[0.28em] text-white/40 md:text-xs">
          {t.title}
        </p>
        <p className="text-xs font-light text-white/40 md:text-sm">{t.subtitle}</p>
        <p className="text-[10px] text-white/30">
          {t.tier}{" "}
          <span className="font-mono text-teal-400/70">{tier}</span>
        </p>
      </div>

      {!panelOpen ? (
        <div className="pointer-events-auto absolute bottom-4 right-4 z-30">
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
              <Link href={`/${locale}/contribute/test-ciel`} className={labLinkClass}>
                {t.testCiel}
              </Link>
              <Link href={`/${locale}/contribute/test-lueur`} className={labLinkClass}>
                {t.testLueur}
              </Link>
              <Link
                href={`/${locale}/contribute/test-eclipse`}
                className={labLinkClass}
              >
                {t.testEclipse}
              </Link>
              <Link
                href={`/${locale}/contribute/test-wormhole`}
                className={labLinkClass}
              >
                {t.testWormhole}
              </Link>
              <button
                type="button"
                onClick={resetAll}
                className="rounded-sm border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-teal-400/80 hover:border-teal-400/40"
              >
                {t.reset}
              </button>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="ml-auto rounded-sm border border-white/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/70 hover:border-teal-400/40 hover:text-teal-100"
              >
                {t.hidePanel}
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                {t.layers}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {layerIds.map((id) => (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white/60 hover:border-teal-500/25"
                  >
                    <input
                      type="checkbox"
                      checked={layers[id]}
                      onChange={() => toggleLayer(id)}
                      className="h-3 w-3 accent-teal-400"
                    />
                    <span className="truncate">{t.layerLabels[id]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                {t.knobs}
              </p>
              <CraftKnobGrid knobs={knobs} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
