"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTexture } from "@react-three/drei";

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
import { SKY_LAB_HYBRID_GAS_OPACITY } from "@/src/components/contribute/constellation/skyCraftLayers";
import {
  toLegacyLayerMap,
  toLegacySkyTheme,
} from "@/src/components/contribute/constellation/skyCraftStateAdapter";
import {
  isUiTargetVisible,
  SkyCraftStoreProvider,
  useSkyCraftStore,
  type SkyCraftUiTarget,
} from "@/src/components/contribute/constellation/skyCraftStore";
import { SkyCraftPresetsBar } from "@/src/components/contribute/SkyCraftPresets";
import { SKY_PANORAMA_TEXTURE } from "@/src/components/contribute/constellation/SkyPanorama";
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

function CraftKnobLabel({
  label,
  description,
}: {
  label: string;
  description?: string;
}) {
  if (!description) {
    return (
      <span className="truncate font-medium text-white/65">{label}</span>
    );
  }

  // title natif = fiable (le panel a overflow-y-auto → pas de tooltip CSS absolu clipé)
  return (
    <span
      className="inline-flex min-w-0 max-w-[90%] items-center gap-1"
      title={description}
    >
      <span className="truncate border-b border-dotted border-white/45 font-medium text-white/70">
        {label}
      </span>
      <span
        className="shrink-0 cursor-help select-none rounded-sm px-0.5 font-mono text-[10px] leading-none text-teal-400/80 hover:bg-white/10 hover:text-teal-300"
        title={description}
        aria-label={description}
      >
        [?]
      </span>
    </span>
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
              <CraftKnobLabel
                label={knob.label}
                description={knob.description}
              />
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

/** Ordre chips lab — Fond/Fog (scène) puis layers. */
const LAB_CHIP_ORDER: SkyCraftUiTarget[] = [
  "fond",
  "fog",
  "milkyGroup",
  "panorama",
  "gasFar",
  "ghostStars",
  "gasRose",
  "gasMauve",
  "gasTeal",
  "cosmicDust",
  "dustLanes",
  "zodiacal",
  "aurora",
  "starsBand",
  "starsField",
  "shootingStars",
  "constellation",
];

const COPY = {
  fr: {
    title: "Craft ciel",
    subtitle: "Fond Sanctuaire — SkyCraftState → legacy preview",
    layers: "Layers",
    layersAll: "Tout on",
    layersNone: "Tout off",
    knobsFor: "Knobs",
    colors: "Couleurs",
    rarePool: "Pool idle rare",
    rareOn: "Rares actifs",
    rareStreak: "Filante spéciale",
    modeProcedural: "A · Procédural",
    modeHybrid: "B · Photo NASA",
    lockScale: "Lock W/H",
    scene: "Scène",
    logState: "Log state",
    solo: "Solo",
    soloOff: "Quitter solo",
    reset: "Réinit.",
    tier: "Tier",
    hidePanel: "Masquer",
    showPanel: "Knobs",
    selectHint: "Clique un layer — store unique SkyCraftState",
    emptyKnobs: "Aucun knob pour ce layer.",
    testCiel: "test-ciel",
    testLueur: "Lueur",
    testEclipse: "Éclipse",
    testWormhole: "Wormhole",
    testSkyLegacy: "Legacy",
    chipLabels: {
      scene: "Scène",
      fond: "Fond",
      fog: "Fog",
      milkyGroup: "Groupe milky",
      panorama: "Panorama",
      gasFar: "Gaz lointain",
      ghostStars: "Ghost stars",
      gasRose: "Gaz rose",
      gasMauve: "Gaz mauve",
      gasTeal: "Gaz teal",
      cosmicDust: "Poussière",
      dustLanes: "Dark lanes",
      zodiacal: "Zodiacal",
      aurora: "Aurore",
      eclipse: "Éclipse",
      starsBand: "Bande VL",
      starsField: "Étoiles proches",
      shootingStars: "Filantes",
      constellation: "Constellation",
    } satisfies Record<SkyCraftUiTarget, string>,
  },
  en: {
    title: "Sky craft",
    subtitle: "Sanctuary backdrop — SkyCraftState → legacy preview",
    layers: "Layers",
    layersAll: "All on",
    layersNone: "All off",
    knobsFor: "Knobs",
    colors: "Colors",
    rarePool: "Idle rare pool",
    rareOn: "Rares enabled",
    rareStreak: "Special streak",
    modeProcedural: "A · Procedural",
    modeHybrid: "B · NASA photo",
    lockScale: "Lock W/H",
    scene: "Scene",
    logState: "Log state",
    solo: "Solo",
    soloOff: "Exit solo",
    reset: "Reset",
    tier: "Tier",
    hidePanel: "Hide",
    showPanel: "Knobs",
    selectHint: "Click a layer — single SkyCraftState store",
    emptyKnobs: "No knobs for this layer.",
    testCiel: "test-ciel",
    testLueur: "Lueur",
    testEclipse: "Eclipse",
    testWormhole: "Wormhole",
    testSkyLegacy: "Legacy",
    chipLabels: {
      scene: "Scene",
      fond: "Backdrop",
      fog: "Fog",
      milkyGroup: "Milky group",
      panorama: "Panorama",
      gasFar: "Far gas",
      ghostStars: "Ghost stars",
      gasRose: "Rose gas",
      gasMauve: "Mauve gas",
      gasTeal: "Teal gas",
      cosmicDust: "Dust veil",
      dustLanes: "Dark lanes",
      zodiacal: "Zodiacal",
      aurora: "Aurora",
      eclipse: "Eclipse",
      starsBand: "Milky band",
      starsField: "Near stars",
      shootingStars: "Shooting stars",
      constellation: "Constellation",
    } satisfies Record<SkyCraftUiTarget, string>,
  },
} as const;

function SkyCraftLabInner({ locale }: { locale: Locale }) {
  const tier = useVisualTier();
  const t = COPY[locale === "en" ? "en" : "fr"];
  const {
    state,
    soloId,
    patch,
    reset,
    setLayerVisible,
    setAllVisible,
    enterSolo,
    exitSolo,
  } = useSkyCraftStore();

  const [panelOpen, setPanelOpen] = useState(true);
  const [knobTarget, setKnobTarget] = useState<SkyCraftKnobTarget>("panorama");
  const [panoramaScaleLock, setPanoramaScaleLock] = useState(true);
  const [presetFlash, setPresetFlash] = useState<string | null>(null);
  /** Remonte la barre presets après Réinit. (baseline + slot Défaut). */
  const [presetsNonce, setPresetsNonce] = useState(0);

  const legacyTheme = useMemo(() => toLegacySkyTheme(state), [state]);
  const legacyLayers = useMemo(() => toLegacyLayerMap(state), [state]);

  useEffect(() => {
    useTexture.preload(SKY_PANORAMA_TEXTURE);
  }, []);

  useEffect(() => {
    if (!presetFlash) return;
    const tmr = window.setTimeout(() => setPresetFlash(null), 2200);
    return () => window.clearTimeout(tmr);
  }, [presetFlash]);

  /** DevTools / régression — state craft + sortie adaptateur. */
  useEffect(() => {
    const w = window as Window & {
      __SKY_CRAFT__?: {
        state: typeof state;
        legacyTheme: typeof legacyTheme;
        legacyLayers: typeof legacyLayers;
      };
    };
    w.__SKY_CRAFT__ = { state, legacyTheme, legacyLayers };
    return () => {
      delete w.__SKY_CRAFT__;
    };
  }, [state, legacyTheme, legacyLayers]);

  const applyProceduralMode = () => {
    if (soloId) exitSolo();
    patch({
      layers: {
        panorama: { isVisible: false },
      },
    });
    setKnobTarget("gasTeal");
  };

  const applyHybridMode = () => {
    if (soloId) exitSolo();
    setKnobTarget("panorama");
    patch({
      scene: {
        clearColor: "#000000",
        fog: { color: "#000000" },
      },
      layers: {
        panorama: {
          isVisible: true,
          voidColor: "#000000",
          voidScale: 90,
          blackSoft: 0,
        },
        gasFar: { opacity: SKY_LAB_HYBRID_GAS_OPACITY.gasFar },
        gasRose: { opacity: SKY_LAB_HYBRID_GAS_OPACITY.gasRose },
        gasMauve: { opacity: SKY_LAB_HYBRID_GAS_OPACITY.gasMauve },
        gasTeal: { opacity: SKY_LAB_HYBRID_GAS_OPACITY.gasTeal },
      },
    });
  };

  const toggleSolo = () => {
    if (knobTarget === "scene") return;
    if (soloId === knobTarget) {
      exitSolo();
      return;
    }
    enterSolo(knobTarget);
  };

  const logState = () => {
    // eslint-disable-next-line no-console -- bouton régression lab
    console.log("[SkyCraft] state", state);
    // eslint-disable-next-line no-console
    console.log("[SkyCraft] legacyTheme", legacyTheme);
    // eslint-disable-next-line no-console
    console.log("[SkyCraft] legacyLayers", legacyLayers);
    setPresetFlash("logged → console / window.__SKY_CRAFT__");
  };

  const knobs = useMemo(
    () =>
      buildSkyCraftKnobs(knobTarget, state, patch, { panoramaScaleLock }),
    [knobTarget, state, patch, panoramaScaleLock],
  );

  const colors = useMemo(
    () => buildSkyCraftColors(knobTarget, state, patch),
    [knobTarget, state, patch],
  );

  const idle = state.scene.idle;
  const canSolo = knobTarget !== "scene";
  const soloActive = canSolo && soloId === knobTarget;

  const labLinkClass =
    "rounded-sm border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/55 hover:border-white/30";

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100 antialiased">
      <div className="fixed inset-0 z-0">
        <SanctuaryUniverse
          mode="immersive"
          locale={locale === "en" ? "en" : "fr"}
          skyTheme={legacyTheme}
          skyLayers={legacyLayers}
          skyCraftChrome={false}
          parallaxIntensity={state.scene.parallaxIntensity}
          constellationVisible={legacyLayers.constellation}
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
          {soloId ? (
            <>
              {" · "}
              <span className="font-mono text-amber-300/80">
                solo:{t.chipLabels[soloId]}
              </span>
            </>
          ) : null}
          {presetFlash ? (
            <>
              {" · "}
              <span className="font-mono text-teal-300/85">{presetFlash}</span>
            </>
          ) : null}
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
              <button
                type="button"
                onClick={applyProceduralMode}
                className={`rounded-sm border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${
                  !state.layers.panorama.isVisible
                    ? "border-teal-400/45 bg-teal-500/10 text-teal-100"
                    : "border-white/15 text-white/55 hover:border-white/30"
                }`}
              >
                {t.modeProcedural}
              </button>
              <button
                type="button"
                onClick={applyHybridMode}
                className={`rounded-sm border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${
                  state.layers.panorama.isVisible
                    ? "border-teal-400/45 bg-teal-500/10 text-teal-100"
                    : "border-white/15 text-white/55 hover:border-white/30"
                }`}
              >
                {t.modeHybrid}
              </button>
              <button
                type="button"
                onClick={logState}
                className="rounded-sm border border-amber-400/35 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-100/80 hover:border-amber-400/60"
              >
                {t.logState}
              </button>
              <Link
                href={`/${locale}/contribute/test-sky-legacy`}
                className="rounded-sm border border-white/25 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/70 hover:border-amber-400/40 hover:text-amber-100"
              >
                {t.testSkyLegacy}
              </Link>
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
                onClick={() => {
                  reset();
                  setKnobTarget("gasTeal");
                  setPresetsNonce((n) => n + 1);
                }}
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

            <SkyCraftPresetsBar
              key={presetsNonce}
              locale={locale}
              onFlash={setPresetFlash}
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                  {t.layers}
                </p>
                <button
                  type="button"
                  onClick={() => setAllVisible(true)}
                  className="rounded-sm border border-white/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-white/55 hover:border-teal-400/40 hover:text-teal-100"
                >
                  {t.layersAll}
                </button>
                <button
                  type="button"
                  onClick={() => setAllVisible(false)}
                  className="rounded-sm border border-white/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-white/55 hover:border-teal-400/40 hover:text-teal-100"
                >
                  {t.layersNone}
                </button>
                {canSolo ? (
                  <button
                    type="button"
                    onClick={toggleSolo}
                    className={`rounded-sm border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] ${
                      soloActive
                        ? "border-amber-400/50 bg-amber-500/10 text-amber-100"
                        : "border-white/15 text-white/55 hover:border-amber-400/40 hover:text-amber-100"
                    }`}
                  >
                    {soloActive ? t.soloOff : t.solo}
                  </button>
                ) : null}
              </div>
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
                {LAB_CHIP_ORDER.map((id) => {
                  const selected = knobTarget === id;
                  const layerOn = isUiTargetVisible(state, id);
                  return (
                    <div
                      key={id}
                      className={`flex items-center gap-1 rounded-sm border px-1.5 py-0.5 transition-colors ${
                        selected
                          ? "border-teal-400/50 bg-teal-500/10"
                          : soloId === id
                            ? "border-amber-400/40 bg-amber-500/5"
                            : "border-white/10 bg-white/[0.03] hover:border-teal-500/25"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={layerOn}
                        onChange={() => setLayerVisible(id, !layerOn)}
                        className="h-3 w-3 shrink-0 accent-teal-400"
                        aria-label={t.chipLabels[id]}
                        disabled={Boolean(soloId)}
                      />
                      <button
                        type="button"
                        onClick={() => setKnobTarget(id)}
                        className={`truncate px-0.5 py-0.5 text-[9px] uppercase tracking-[0.12em] ${
                          selected ? "text-teal-100" : "text-white/60"
                        }`}
                      >
                        {t.chipLabels[id]}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[9px] uppercase tracking-[0.18em] text-teal-400/70">
                  {t.knobsFor}{" "}
                  <span className="text-white/50">{t.chipLabels[knobTarget]}</span>
                  <span className="ml-2 font-mono text-white/30">
                    ({knobs.length})
                  </span>
                </p>
                {knobTarget === "panorama" ? (
                  <label className="flex cursor-pointer items-center gap-1.5 text-[9px] uppercase tracking-[0.12em] text-white/60">
                    <input
                      type="checkbox"
                      checked={panoramaScaleLock}
                      onChange={(e) => setPanoramaScaleLock(e.target.checked)}
                      className="h-3 w-3 accent-teal-400"
                    />
                    {t.lockScale}
                  </label>
                ) : null}
              </div>
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
                        setSkyCraftRareEnabled(patch, e.target.checked)
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
                        setSkyCraftRareSpecialStreak(patch, e.target.checked)
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
                          toggleSkyCraftRareTarget(state, patch, target)
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

/**
 * Lab craft fond ciel — `/fr/contribute/test-sky` (dev only).
 * Store = `SkyCraftState` · preview = `toLegacy*` → SanctuaryUniverse.
 */
export function SkyCraftLab({ locale = "fr" }: { locale?: Locale }) {
  return (
    <SkyCraftStoreProvider>
      <SkyCraftLabInner locale={locale === "en" ? "en" : "fr"} />
    </SkyCraftStoreProvider>
  );
}
