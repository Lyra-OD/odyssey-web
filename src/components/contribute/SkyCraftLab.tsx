"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SanctuaryUniverse } from "@/src/components/contribute/SanctuaryUniverse";
import {
  buildSkyCraftColors,
  buildSkyCraftKnobs,
  setSkyCraftRareEnabled,
  setSkyCraftRareSpecialStreak,
  SKY_CRAFT_RARE_TARGETS,
  toggleSkyCraftRareTarget,
  type SkyCraftColorDef,
  type SkyCraftKnobDef,
  type SkyCraftKnobTarget,
} from "@/src/components/contribute/constellation/skyCraftKnobDefs";
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

function CraftColorGrid({ colors }: { colors: readonly SkyCraftColorDef[] }) {
  if (colors.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((c) => (
        <label
          key={c.key}
          className="flex min-w-[7rem] items-center gap-2 rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1.5"
        >
          <input
            type="color"
            value={c.value}
            onChange={(e) => c.onChange(e.target.value)}
            className="h-6 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
          />
          <span className="flex min-w-0 flex-col">
            <span className="text-[9px] uppercase tracking-[0.1em] text-white/55">
              {c.label}
            </span>
            <span className="font-mono text-[10px] text-teal-400/75">{c.value}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function CraftKnobGrid({
  knobs,
  emptyLabel,
}: {
  knobs: readonly SkyCraftKnobDef[];
  emptyLabel: string;
}) {
  if (knobs.length === 0) {
    return <p className="text-[10px] text-white/35">{emptyLabel}</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
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
    subtitle: "Fond Sanctuaire — un layer · tous ses knobs",
    layers: "Layers",
    knobsFor: "Knobs",
    colors: "Couleurs",
    rarePool: "Pool idle rare",
    rareOn: "Rares actifs",
    rareStreak: "Filante spéciale",
    scene: "Scène",
    reset: "Réinit.",
    tier: "Tier",
    hidePanel: "Masquer",
    showPanel: "Knobs",
    selectHint: "Clique un layer pour éditer ses knobs",
    emptyKnobs: "Aucun knob pour ce layer.",
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
      dustLanes: "Dark lanes",
      zodiacal: "Zodiacal",
      aurora: "Aurore",
      starsBand: "Voie lactée",
      starsField: "Étoiles proches",
      shootingStars: "Filantes",
      constellation: "Constellation",
    } satisfies Record<SkyCraftLayerId, string>,
  },
  en: {
    title: "Sky craft",
    subtitle: "Sanctuary backdrop — one layer · all its knobs",
    layers: "Layers",
    knobsFor: "Knobs",
    colors: "Colors",
    rarePool: "Idle rare pool",
    rareOn: "Rares enabled",
    rareStreak: "Special streak",
    scene: "Scene",
    reset: "Reset",
    tier: "Tier",
    hidePanel: "Hide",
    showPanel: "Knobs",
    selectHint: "Click a layer to edit its knobs",
    emptyKnobs: "No knobs for this layer.",
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
      dustLanes: "Dark lanes",
      zodiacal: "Zodiacal",
      aurora: "Aurora",
      starsBand: "Milky band",
      starsField: "Near stars",
      shootingStars: "Shooting stars",
      constellation: "Constellation",
    } satisfies Record<SkyCraftLayerId, string>,
  },
} as const;

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
  const [knobTarget, setKnobTarget] = useState<SkyCraftKnobTarget>("gasTeal");

  const resolvedTheme = useMemo(
    () => mergeSkyTheme(defaultSkyTheme, themeOverrides),
    [themeOverrides],
  );

  const patchTheme = (partial: DeepPartial<SkyTheme>) => {
    setThemeOverrides((prev) =>
      mergeSkyTheme(mergeSkyTheme(defaultSkyTheme, prev), partial),
    );
  };

  const resetAll = () => {
    setLayers({ ...SKY_LAB_DEFAULT_LAYERS });
    setThemeOverrides({});
    setParallaxIntensity(1);
    setKnobTarget("gasTeal");
  };

  const toggleLayer = (id: SkyCraftLayerId) => {
    setLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const knobs = useMemo(
    () =>
      buildSkyCraftKnobs(
        knobTarget,
        resolvedTheme,
        patchTheme,
        parallaxIntensity,
        setParallaxIntensity,
      ),
    [knobTarget, resolvedTheme, parallaxIntensity],
  );

  const colors = useMemo(
    () => buildSkyCraftColors(knobTarget, resolvedTheme, patchTheme),
    [knobTarget, resolvedTheme],
  );

  const idle = resolvedTheme.scene.idle;

  const layerIds = Object.keys(SKY_LAB_DEFAULT_LAYERS) as SkyCraftLayerId[];

  const knobTargetLabel =
    knobTarget === "scene"
      ? t.scene
      : t.layerLabels[knobTarget];

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
          {" · "}
          <span className="text-white/25">{t.selectHint}</span>
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
        <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 max-h-[45vh] overflow-y-auto border-t border-white/10 bg-black/70 px-3 py-2 backdrop-blur-md md:max-h-[50vh] md:px-5 md:py-2.5">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
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
                <button
                  type="button"
                  onClick={() => setKnobTarget("scene")}
                  className={`rounded-sm border px-2 py-1 text-[9px] uppercase tracking-[0.12em] transition-colors ${
                    knobTarget === "scene"
                      ? "border-teal-400/50 bg-teal-500/10 text-teal-100"
                      : "border-white/15 bg-white/[0.03] text-white/55 hover:border-white/30"
                  }`}
                >
                  {t.scene}
                </button>
                {layerIds.map((id) => {
                  const selected = knobTarget === id;
                  return (
                    <div
                      key={id}
                      className={`flex items-center gap-1 rounded-sm border px-1.5 py-0.5 transition-colors ${
                        selected
                          ? "border-teal-400/50 bg-teal-500/10"
                          : "border-white/10 bg-white/[0.03] hover:border-teal-500/25"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={layers[id]}
                        onChange={() => toggleLayer(id)}
                        className="h-3 w-3 shrink-0 accent-teal-400"
                        aria-label={t.layerLabels[id]}
                      />
                      <button
                        type="button"
                        onClick={() => setKnobTarget(id)}
                        className={`truncate px-0.5 py-0.5 text-[9px] uppercase tracking-[0.12em] ${
                          selected ? "text-teal-100" : "text-white/60"
                        }`}
                      >
                        {t.layerLabels[id]}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                {t.knobsFor}{" "}
                <span className="text-white/50">{knobTargetLabel}</span>
                <span className="ml-2 font-mono text-white/30">
                  ({knobs.length})
                </span>
              </p>
              <CraftKnobGrid knobs={knobs} emptyLabel={t.emptyKnobs} />
            </div>

            {colors.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                  {t.colors}
                </p>
                <CraftColorGrid colors={colors} />
              </div>
            ) : null}

            {knobTarget === "scene" ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                  {t.rarePool}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-white/60">
                    <input
                      type="checkbox"
                      checked={idle.rareEnabled}
                      onChange={(e) =>
                        setSkyCraftRareEnabled(patchTheme, e.target.checked)
                      }
                      className="h-3 w-3 accent-teal-400"
                    />
                    {t.rareOn}
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-white/60">
                    <input
                      type="checkbox"
                      checked={idle.rareSpecialStreak}
                      onChange={(e) =>
                        setSkyCraftRareSpecialStreak(patchTheme, e.target.checked)
                      }
                      className="h-3 w-3 accent-teal-400"
                    />
                    {t.rareStreak}
                  </label>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SKY_CRAFT_RARE_TARGETS.map((target) => {
                    const active = idle.rareTargets.includes(target);
                    return (
                      <button
                        key={target}
                        type="button"
                        onClick={() =>
                          toggleSkyCraftRareTarget(
                            resolvedTheme,
                            patchTheme,
                            target,
                          )
                        }
                        className={`rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                          active
                            ? "border-teal-400/50 bg-teal-500/15 text-teal-100"
                            : "border-white/10 bg-white/[0.02] text-white/35 hover:border-white/25"
                        }`}
                      >
                        {target}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
