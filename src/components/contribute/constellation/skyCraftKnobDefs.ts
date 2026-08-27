import type { SkyCraftLayerId } from "./skyCraftLayers";
import type { DeepPartial, RareSkyTarget, SkyTheme } from "./skyTheme";

export type SkyCraftKnobDef = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
};

export type SkyCraftColorDef = {
  key: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
};

/** Cibles idle rare — `eclipse` réservé labs / intro. */
export const SKY_CRAFT_RARE_TARGETS: readonly RareSkyTarget[] = [
  "rose",
  "mauve",
  "teal",
  "band",
  "aurora",
  "eclipse",
] as const;

type PatchTheme = (partial: DeepPartial<SkyTheme>) => void;

function knob(
  key: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  onChange: (v: number) => void,
): SkyCraftKnobDef {
  return { key, label, min, max, step, value, onChange };
}

function opacityDesktop(
  label: string,
  value: number,
  onChange: (v: number) => void,
  max = 1,
): SkyCraftKnobDef {
  return knob(`${label}-opacity`, label, value, 0, max, 0.01, onChange);
}

function colorKnob(
  key: string,
  label: string,
  value: string,
  onChange: (hex: string) => void,
): SkyCraftColorDef {
  return { key, label, value, onChange };
}

function gasColorKnobs(
  patch: PatchTheme,
  layerKey: "gasFar" | "gasRose" | "gasMauve" | "gasTeal",
  layer: SkyTheme[typeof layerKey],
): SkyCraftColorDef[] {
  const colors: SkyCraftColorDef[] = [
    colorKnob(`${layerKey}-color`, "Color", layer.color, (v) =>
      patch({ [layerKey]: { color: v } }),
    ),
    colorKnob(`${layerKey}-deep`, "Deep", layer.deep, (v) =>
      patch({ [layerKey]: { deep: v } }),
    ),
  ];
  if (layerKey === "gasRose" && layer.colorHot) {
    colors.push(
      colorKnob(`${layerKey}-hot`, "Hot", layer.colorHot, (v) =>
        patch({ gasRose: { colorHot: v } }),
      ),
    );
  }
  return colors;
}

function patchPosition(
  patch: PatchTheme,
  theme: SkyTheme,
  layerKey: keyof SkyTheme,
  axis: 0 | 1 | 2,
  value: number,
) {
  const layer = theme[layerKey] as { position: [number, number, number] };
  const next: [number, number, number] = [...layer.position];
  next[axis] = value;
  patch({ [layerKey]: { position: next } } as DeepPartial<SkyTheme>);
}

function patchScale(
  patch: PatchTheme,
  theme: SkyTheme,
  layerKey: keyof SkyTheme,
  axis: 0 | 1,
  value: number,
) {
  const layer = theme[layerKey] as { scale: [number, number, number] };
  const next: [number, number, number] = [...layer.scale];
  next[axis] = value;
  patch({ [layerKey]: { scale: next } } as DeepPartial<SkyTheme>);
}

function planeKnobs(
  patch: PatchTheme,
  theme: SkyTheme,
  layerKey: keyof SkyTheme,
  prefix: string,
): SkyCraftKnobDef[] {
  const layer = theme[layerKey] as {
    position: [number, number, number];
    scale: [number, number, number];
    renderOrder: number;
    parallax: { factor: number; lerp: number };
  };
  return [
    knob(
      `${prefix}-posX`,
      "Pos X",
      layer.position[0],
      -8,
      8,
      0.05,
      (v) => patchPosition(patch, theme, layerKey, 0, v),
    ),
    knob(
      `${prefix}-posY`,
      "Pos Y",
      layer.position[1],
      -6,
      6,
      0.05,
      (v) => patchPosition(patch, theme, layerKey, 1, v),
    ),
    knob(
      `${prefix}-posZ`,
      "Pos Z",
      layer.position[2],
      -14,
      -2,
      0.05,
      (v) => patchPosition(patch, theme, layerKey, 2, v),
    ),
    knob(
      `${prefix}-scaleW`,
      "Scale W",
      layer.scale[0],
      4,
      48,
      0.25,
      (v) => patchScale(patch, theme, layerKey, 0, v),
    ),
    knob(
      `${prefix}-scaleH`,
      "Scale H",
      layer.scale[1],
      4,
      28,
      0.25,
      (v) => patchScale(patch, theme, layerKey, 1, v),
    ),
    knob(
      `${prefix}-renderOrder`,
      "Z-order",
      layer.renderOrder,
      -4,
      6,
      1,
      (v) => patch({ [layerKey]: { renderOrder: v } } as DeepPartial<SkyTheme>),
    ),
    knob(
      `${prefix}-parallax`,
      "Parallax",
      layer.parallax.factor,
      -0.35,
      0.35,
      0.005,
      (v) =>
        patch({
          [layerKey]: { parallax: { factor: v } },
        } as DeepPartial<SkyTheme>),
    ),
    knob(
      `${prefix}-parallaxLerp`,
      "Par. lerp",
      layer.parallax.lerp,
      0.005,
      0.08,
      0.001,
      (v) =>
        patch({
          [layerKey]: { parallax: { lerp: v } },
        } as DeepPartial<SkyTheme>),
    ),
  ];
}

function gasKnobs(
  patch: PatchTheme,
  theme: SkyTheme,
  layerKey: "gasFar" | "gasRose" | "gasMauve" | "gasTeal",
  prefix: string,
): SkyCraftKnobDef[] {
  const layer = theme[layerKey];
  return [
    opacityDesktop("Opacity", layer.opacity.desktop, (v) =>
      patch({
        [layerKey]: {
          opacity: { desktop: v, mobile: v * 0.85, reduced: 0 },
        },
      }),
    ),
    knob(
      `${prefix}-loop`,
      "Loop ×",
      layer.loopPeriodMul,
      0.4,
      2.5,
      0.01,
      (v) => patch({ [layerKey]: { loopPeriodMul: v } }),
    ),
    ...planeKnobs(patch, theme, layerKey, prefix),
  ];
}

function starFieldKnobs(
  patch: PatchTheme,
  theme: SkyTheme,
  layerKey: "starsBand" | "starsField",
  prefix: string,
  withBandThickness: boolean,
): SkyCraftKnobDef[] {
  const layer = theme[layerKey];
  const knobs: SkyCraftKnobDef[] = [
    knob(
      `${prefix}-alpha`,
      "Alpha",
      layer.alphaMul,
      0,
      2.5,
      0.01,
      (v) => patch({ [layerKey]: { alphaMul: v } }),
    ),
    knob(
      `${prefix}-size`,
      "Size",
      layer.sizeMul,
      0.2,
      2.5,
      0.01,
      (v) => patch({ [layerKey]: { sizeMul: v } }),
    ),
    knob(
      `${prefix}-scaleMin`,
      "Grain min",
      layer.scaleMin,
      0.05,
      1.2,
      0.01,
      (v) => patch({ [layerKey]: { scaleMin: v } }),
    ),
    knob(
      `${prefix}-scaleRange`,
      "Grain range",
      layer.scaleRange,
      0.1,
      2.5,
      0.01,
      (v) => patch({ [layerKey]: { scaleRange: v } }),
    ),
    knob(
      `${prefix}-brightMin`,
      "Bright min",
      layer.brightMin,
      0,
      1,
      0.01,
      (v) => patch({ [layerKey]: { brightMin: v } }),
    ),
    knob(
      `${prefix}-brightRange`,
      "Bright range",
      layer.brightRange,
      0,
      1,
      0.01,
      (v) => patch({ [layerKey]: { brightRange: v } }),
    ),
    knob(
      `${prefix}-zSpread`,
      "Depth spread",
      layer.zSpread,
      1,
      16,
      0.1,
      (v) => patch({ [layerKey]: { zSpread: v } }),
    ),
    knob(
      `${prefix}-zBias`,
      "Depth bias",
      layer.zBias,
      -8,
      6,
      0.1,
      (v) => patch({ [layerKey]: { zBias: v } }),
    ),
    knob(
      `${prefix}-drift`,
      "Drift",
      layer.drift,
      0,
      0.15,
      0.002,
      (v) => patch({ [layerKey]: { drift: v } }),
    ),
    knob(
      `${prefix}-breathA`,
      "Breath A",
      layer.breathSpeedA,
      0,
      2,
      0.01,
      (v) => patch({ [layerKey]: { breathSpeedA: v } }),
    ),
    knob(
      `${prefix}-breathB`,
      "Breath B",
      layer.breathSpeedB,
      0,
      2,
      0.01,
      (v) => patch({ [layerKey]: { breathSpeedB: v } }),
    ),
    knob(
      `${prefix}-breathAmp`,
      "Breath amp",
      layer.breathAmp,
      0,
      0.35,
      0.005,
      (v) => patch({ [layerKey]: { breathAmp: v } }),
    ),
    knob(
      `${prefix}-repulsion`,
      "Repulsion",
      layer.repulsion,
      0,
      3,
      0.05,
      (v) => patch({ [layerKey]: { repulsion: v } }),
    ),
    knob(
      `${prefix}-repelStr`,
      "Repel str",
      layer.repelStrength,
      0,
      0.5,
      0.005,
      (v) => patch({ [layerKey]: { repelStrength: v } }),
    ),
    knob(
      `${prefix}-renderOrder`,
      "Z-order",
      layer.renderOrder,
      -2,
      6,
      1,
      (v) => patch({ [layerKey]: { renderOrder: v } }),
    ),
    knob(
      `${prefix}-parallax`,
      "Parallax",
      layer.parallax.factor,
      -0.2,
      1,
      0.005,
      (v) =>
        patch({
          [layerKey]: { parallax: { factor: v } },
        }),
    ),
    knob(
      `${prefix}-parallaxLerp`,
      "Par. lerp",
      layer.parallax.lerp,
      0.005,
      0.12,
      0.001,
      (v) =>
        patch({
          [layerKey]: { parallax: { lerp: v } },
        }),
    ),
  ];

  if (withBandThickness) {
    knobs.splice(
      2,
      0,
      knob(
        `${prefix}-bandTight`,
        "Band tight",
        layer.bandThickness ?? 0.86,
        0.35,
        1.6,
        0.01,
        (v) => patch({ [layerKey]: { bandThickness: v } }),
      ),
      knob(
        `${prefix}-rotate`,
        "Rotate",
        theme.scene.milkyRotate,
        -3.14,
        3.14,
        0.01,
        (v) => patch({ scene: { milkyRotate: v } }),
      ),
      knob(
        `${prefix}-posX`,
        "Pos X",
        theme.scene.milkyPosition?.[0] ?? 0,
        -12,
        12,
        0.05,
        (v) => {
          const base = theme.scene.milkyPosition ?? [0, 0, 0];
          const next: [number, number, number] = [...base];
          next[0] = v;
          patch({ scene: { milkyPosition: next } });
        },
      ),
      knob(
        `${prefix}-posY`,
        "Pos Y",
        theme.scene.milkyPosition?.[1] ?? 0,
        -10,
        10,
        0.05,
        (v) => {
          const base = theme.scene.milkyPosition ?? [0, 0, 0];
          const next: [number, number, number] = [...base];
          next[1] = v;
          patch({ scene: { milkyPosition: next } });
        },
      ),
      knob(
        `${prefix}-posZ`,
        "Pos Z",
        theme.scene.milkyPosition?.[2] ?? 0,
        -8,
        8,
        0.05,
        (v) => {
          const base = theme.scene.milkyPosition ?? [0, 0, 0];
          const next: [number, number, number] = [...base];
          next[2] = v;
          patch({ scene: { milkyPosition: next } });
        },
      ),
    );
  }

  return knobs;
}

export type SkyCraftKnobTarget = SkyCraftLayerId | "scene";

export type SkyCraftKnobOptions = {
  /** Lock Scale W/H panorama — agrandit sans déformer. */
  panoramaScaleLock?: boolean;
};

export function buildSkyCraftKnobs(
  target: SkyCraftKnobTarget,
  theme: SkyTheme,
  patch: PatchTheme,
  parallaxIntensity: number,
  setParallaxIntensity: (v: number) => void,
  options: SkyCraftKnobOptions = {},
): SkyCraftKnobDef[] {
  const panoramaScaleLock = options.panoramaScaleLock ?? true;
  switch (target) {
    case "scene":
      return [
        knob(
          "scene-parallax",
          "Parallax ×",
          parallaxIntensity,
          0,
          2,
          0.01,
          setParallaxIntensity,
        ),
        knob(
          "scene-fogNear",
          "Fog near",
          theme.scene.fogNear,
          4,
          24,
          0.25,
          (v) => patch({ scene: { fogNear: v } }),
        ),
        knob(
          "scene-fogFar",
          "Fog far",
          theme.scene.fogFar,
          12,
          48,
          0.25,
          (v) => patch({ scene: { fogFar: v } }),
        ),
        knob(
          "scene-ambient",
          "Ambient",
          theme.scene.ambientIntensity,
          0,
          0.25,
          0.005,
          (v) => patch({ scene: { ambientIntensity: v } }),
        ),
        knob(
          "scene-milkyRotate",
          "Milky rotate",
          theme.scene.milkyRotate,
          -3.14,
          3.14,
          0.01,
          (v) => patch({ scene: { milkyRotate: v } }),
        ),
        knob(
          "scene-milkyPosX",
          "Milky X",
          theme.scene.milkyPosition[0],
          -12,
          12,
          0.05,
          (v) => {
            const next: [number, number, number] = [
              ...theme.scene.milkyPosition,
            ];
            next[0] = v;
            patch({ scene: { milkyPosition: next } });
          },
        ),
        knob(
          "scene-milkyPosY",
          "Milky Y",
          theme.scene.milkyPosition[1],
          -10,
          10,
          0.05,
          (v) => {
            const next: [number, number, number] = [
              ...theme.scene.milkyPosition,
            ];
            next[1] = v;
            patch({ scene: { milkyPosition: next } });
          },
        ),
        knob(
          "scene-milkyPosZ",
          "Milky Z",
          theme.scene.milkyPosition[2],
          -8,
          8,
          0.05,
          (v) => {
            const next: [number, number, number] = [
              ...theme.scene.milkyPosition,
            ];
            next[2] = v;
            patch({ scene: { milkyPosition: next } });
          },
        ),
        knob(
          "scene-loopBase",
          "Loop base",
          theme.baseLoopPeriod,
          18,
          120,
          1,
          (v) => patch({ baseLoopPeriod: v }),
        ),
        knob(
          "scene-idlePeriod",
          "Idle period",
          theme.scene.idle.periodSec,
          24,
          120,
          1,
          (v) => patch({ scene: { idle: { periodSec: v } } }),
        ),
        knob(
          "scene-idleZoom",
          "Idle zoom",
          theme.scene.idle.zoomAmp,
          0,
          1.2,
          0.01,
          (v) => patch({ scene: { idle: { zoomAmp: v } } }),
        ),
        knob(
          "scene-idleMove",
          "Idle move",
          theme.scene.idle.moveAmp,
          0,
          0.35,
          0.005,
          (v) => patch({ scene: { idle: { moveAmp: v } } }),
        ),
        knob(
          "scene-idleDelay",
          "Idle delay",
          theme.scene.idle.delaySec,
          0,
          12,
          0.25,
          (v) => patch({ scene: { idle: { delaySec: v } } }),
        ),
        knob(
          "scene-rareGapMin",
          "Rare gap min",
          theme.scene.idle.rareGapMinSec,
          20,
          400,
          5,
          (v) => patch({ scene: { idle: { rareGapMinSec: v } } }),
        ),
        knob(
          "scene-rareGapMax",
          "Rare gap max",
          theme.scene.idle.rareGapMaxSec,
          40,
          600,
          5,
          (v) => patch({ scene: { idle: { rareGapMaxSec: v } } }),
        ),
        knob(
          "scene-rareDur",
          "Rare dur",
          theme.scene.idle.rareDurationSec,
          2,
          20,
          0.5,
          (v) => patch({ scene: { idle: { rareDurationSec: v } } }),
        ),
        knob(
          "scene-rareGas",
          "Pulse gas",
          theme.scene.idle.rareGasPulse,
          0,
          0.4,
          0.01,
          (v) => patch({ scene: { idle: { rareGasPulse: v } } }),
        ),
        knob(
          "scene-rareBand",
          "Pulse band",
          theme.scene.idle.rareBandPulse,
          0,
          0.5,
          0.01,
          (v) => patch({ scene: { idle: { rareBandPulse: v } } }),
        ),
        knob(
          "scene-rareDust",
          "Pulse dust",
          theme.scene.idle.rareDustPulse,
          0,
          0.3,
          0.01,
          (v) => patch({ scene: { idle: { rareDustPulse: v } } }),
        ),
        knob(
          "scene-rareAurora",
          "Pulse aurora",
          theme.scene.idle.rareAuroraPulse,
          0,
          1.2,
          0.01,
          (v) => patch({ scene: { idle: { rareAuroraPulse: v } } }),
        ),
        knob(
          "scene-rareLueur",
          "Pulse lueur",
          theme.scene.idle.rareLueurPulse,
          0,
          0.8,
          0.01,
          (v) => patch({ scene: { idle: { rareLueurPulse: v } } }),
        ),
        knob(
          "scene-breathBoost",
          "Breath boost",
          theme.scene.idle.breathBoost,
          0,
          1,
          0.01,
          (v) => patch({ scene: { idle: { breathBoost: v } } }),
        ),
        knob(
          "scene-fogBreath",
          "Fog breath",
          theme.scene.idle.fogBreathAmp,
          0,
          2,
          0.05,
          (v) => patch({ scene: { idle: { fogBreathAmp: v } } }),
        ),
      ];

    case "gasFar":
      return gasKnobs(patch, theme, "gasFar", "gasFar");

    case "fond":
      return [];

    case "fog":
      return [
        knob(
          "fog-near",
          "Fog near",
          theme.scene.fogNear,
          4,
          24,
          0.25,
          (v) => patch({ scene: { fogNear: v } }),
        ),
        knob(
          "fog-far",
          "Fog far",
          theme.scene.fogFar,
          12,
          48,
          0.25,
          (v) => patch({ scene: { fogFar: v } }),
        ),
      ];

    case "panorama": {
      const p = theme.skyPanorama;
      return [
        opacityDesktop("Opacity", p.opacity.desktop, (v) =>
          patch({
            skyPanorama: {
              opacity: { desktop: v, mobile: 0, reduced: 0 },
            },
          }),
        ),
        knob("pano-dim", "Dim", p.dim, 0.35, 1, 0.01, (v) =>
          patch({ skyPanorama: { dim: v } }),
        ),
        knob("pano-voidScale", "Noir void", p.voidScale, 0, 160, 1, (v) =>
          patch({ skyPanorama: { voidScale: v } }),
        ),
        knob("pano-blackSoft", "Bord soft", p.blackSoft, 0, 0.35, 0.01, (v) =>
          patch({ skyPanorama: { blackSoft: v } }),
        ),
        knob("pano-posX", "Pos X", p.position[0], -8, 8, 0.05, (v) => {
          const next: [number, number, number] = [...p.position];
          next[0] = v;
          patch({ skyPanorama: { position: next } });
        }),
        knob("pano-posY", "Pos Y", p.position[1], -6, 6, 0.05, (v) => {
          const next: [number, number, number] = [...p.position];
          next[1] = v;
          patch({ skyPanorama: { position: next } });
        }),
        knob("pano-posZ", "Pos Z", p.position[2], -18, -6, 0.1, (v) => {
          const next: [number, number, number] = [...p.position];
          next[2] = v;
          patch({ skyPanorama: { position: next } });
        }),
        knob("pano-scaleW", "Scale W", p.scale[0], 20, 90, 0.5, (v) => {
          if (panoramaScaleLock) {
            const aspect = p.scale[0] / Math.max(p.scale[1], 0.001);
            const h = Math.min(45, Math.max(10, v / aspect));
            patch({ skyPanorama: { scale: [v, h, 1] } });
          } else {
            const next: [number, number, number] = [...p.scale];
            next[0] = v;
            patch({ skyPanorama: { scale: next } });
          }
        }),
        knob("pano-scaleH", "Scale H", p.scale[1], 10, 45, 0.5, (v) => {
          if (panoramaScaleLock) {
            const aspect = p.scale[0] / Math.max(p.scale[1], 0.001);
            const w = Math.min(90, Math.max(20, v * aspect));
            patch({ skyPanorama: { scale: [w, v, 1] } });
          } else {
            const next: [number, number, number] = [...p.scale];
            next[1] = v;
            patch({ skyPanorama: { scale: next } });
          }
        }),
        knob("pano-rotZ", "Tilt", p.rotation[2], -0.6, 0.6, 0.01, (v) => {
          const r: [number, number, number] = [...p.rotation];
          r[2] = v;
          patch({ skyPanorama: { rotation: r } });
        }),
        knob("pano-parallax", "Parallax", p.parallax.factor, -0.2, 0.1, 0.005, (v) =>
          patch({ skyPanorama: { parallax: { factor: v } } }),
        ),
        knob("pano-parallaxLerp", "Par. lerp", p.parallax.lerp, 0.005, 0.05, 0.001, (v) =>
          patch({ skyPanorama: { parallax: { lerp: v } } }),
        ),
        knob("pano-renderOrder", "Z-order", p.renderOrder, -6, 0, 1, (v) =>
          patch({ skyPanorama: { renderOrder: v } }),
        ),
      ];
    }

    case "gasRose":
      return gasKnobs(patch, theme, "gasRose", "gasRose");
    case "gasMauve":
      return gasKnobs(patch, theme, "gasMauve", "gasMauve");
    case "gasTeal":
      return gasKnobs(patch, theme, "gasTeal", "gasTeal");

    case "ghostStars": {
      const g = theme.ghostStars;
      return [
        opacityDesktop("Opacity", g.opacity.desktop, (v) =>
          patch({
            ghostStars: {
              opacity: { desktop: v, mobile: 0, reduced: 0 },
            },
          }),
        ),
        knob("ghost-count", "Count", g.count, 0, 48, 1, (v) =>
          patch({ ghostStars: { count: Math.round(v) } }),
        ),
        knob("ghost-size", "Size", g.sizeMul, 0.5, 6, 0.05, (v) =>
          patch({ ghostStars: { sizeMul: v } }),
        ),
        knob("ghost-zSpread", "Depth spread", g.zSpread, 1, 12, 0.1, (v) =>
          patch({ ghostStars: { zSpread: v } }),
        ),
        knob("ghost-zBias", "Depth bias", g.zBias, -14, -2, 0.1, (v) =>
          patch({ ghostStars: { zBias: v } }),
        ),
        knob("ghost-renderOrder", "Z-order", g.renderOrder, -4, 4, 1, (v) =>
          patch({ ghostStars: { renderOrder: v } }),
        ),
        knob("ghost-parallax", "Parallax", g.parallax.factor, -0.35, 0.1, 0.005, (v) =>
          patch({ ghostStars: { parallax: { factor: v } } }),
        ),
        knob("ghost-parallaxLerp", "Par. lerp", g.parallax.lerp, 0.005, 0.05, 0.001, (v) =>
          patch({ ghostStars: { parallax: { lerp: v } } }),
        ),
      ];
    }

    case "cosmicDust": {
      const d = theme.cosmicDust;
      return [
        opacityDesktop("Opacity", d.opacity.desktop, (v) =>
          patch({
            cosmicDust: {
              opacity: { desktop: v, mobile: v * 0.85, reduced: v * 0.5 },
            },
          }),
        ),
        ...planeKnobs(patch, theme, "cosmicDust", "dust"),
      ];
    }

    case "dustLanes": {
      const l = theme.milkyDustLanes;
      return [
        opacityDesktop("Opacity", l.opacity.desktop, (v) =>
          patch({
            milkyDustLanes: {
              opacity: { desktop: v, mobile: v * 0.75, reduced: 0 },
            },
          }),
        ),
        knob("lanes-contrast", "Contrast", l.contrast, 0, 1, 0.01, (v) =>
          patch({ milkyDustLanes: { contrast: v } }),
        ),
        ...planeKnobs(patch, theme, "milkyDustLanes", "lanes"),
      ];
    }

    case "zodiacal": {
      const z = theme.zodiacal;
      return [
        opacityDesktop("Opacity", z.opacity.desktop, (v) =>
          patch({
            zodiacal: {
              opacity: { desktop: v, mobile: v * 0.75, reduced: 0 },
            },
          }),
        ),
        knob("zodiac-idleBoost", "Idle boost", z.idleBoost, 0, 0.6, 0.01, (v) =>
          patch({ zodiacal: { idleBoost: v } }),
        ),
        ...planeKnobs(patch, theme, "zodiacal", "zodiac"),
      ];
    }

    case "aurora": {
      const a = theme.aurora;
      return [
        opacityDesktop("Opacity", a.opacity.desktop, (v) =>
          patch({
            aurora: {
              opacity: { desktop: v, mobile: v * 0.75, reduced: 0 },
            },
          }),
        ),
        ...planeKnobs(patch, theme, "aurora", "aurora"),
      ];
    }

    case "starsBand":
      return starFieldKnobs(patch, theme, "starsBand", "band", true);

    case "starsField":
      return starFieldKnobs(patch, theme, "starsField", "field", false);

    case "shootingStars": {
      const s = theme.shootingStars;
      return [
        knob("shoot-parallax", "Parallax", s.parallax.factor, 0, 1.2, 0.01, (v) =>
          patch({ shootingStars: { parallax: { factor: v } } }),
        ),
        knob("shoot-parallaxLerp", "Par. lerp", s.parallax.lerp, 0.01, 0.15, 0.001, (v) =>
          patch({ shootingStars: { parallax: { lerp: v } } }),
        ),
        knob("shoot-echoDelay", "Echo delay", s.echoDelaySec, 0, 1.2, 0.01, (v) =>
          patch({ shootingStars: { echoDelaySec: v } }),
        ),
        knob("shoot-echoOpacity", "Echo α", s.echoOpacity, 0, 1, 0.01, (v) =>
          patch({ shootingStars: { echoOpacity: v } }),
        ),
      ];
    }

    case "constellation": {
      const c = theme.constellation;
      return [
        knob("const-parallax", "Parallax", c.parallax.factor, 0, 0.8, 0.005, (v) =>
          patch({ constellation: { parallax: { factor: v } } }),
        ),
        knob("const-parallaxLerp", "Par. lerp", c.parallax.lerp, 0.01, 0.1, 0.001, (v) =>
          patch({ constellation: { parallax: { lerp: v } } }),
        ),
      ];
    }

    default:
      return [];
  }
}

export function buildSkyCraftColors(
  target: SkyCraftKnobTarget,
  theme: SkyTheme,
  patch: PatchTheme,
): SkyCraftColorDef[] {
  switch (target) {
    case "scene":
      return [
        colorKnob("scene-bg", "Background", theme.scene.background, (v) =>
          patch({ scene: { background: v } }),
        ),
        colorKnob("scene-fog", "Fog", theme.scene.fogColor, (v) =>
          patch({ scene: { fogColor: v } }),
        ),
      ];
    case "panorama":
      return [
        colorKnob("pano-void", "Void", theme.skyPanorama.voidColor, (v) =>
          patch({ skyPanorama: { voidColor: v } }),
        ),
      ];
    case "fond":
      return [
        colorKnob("fond-color", "Fond", theme.fond.color, (v) =>
          patch({
            fond: { color: v },
            scene: { background: v },
          }),
        ),
      ];
    case "fog":
      return [
        colorKnob("fog-color", "Fog", theme.scene.fogColor, (v) =>
          patch({ scene: { fogColor: v } }),
        ),
      ];
    case "gasFar":
      return gasColorKnobs(patch, "gasFar", theme.gasFar);
    case "gasRose":
      return gasColorKnobs(patch, "gasRose", theme.gasRose);
    case "gasMauve":
      return gasColorKnobs(patch, "gasMauve", theme.gasMauve);
    case "gasTeal":
      return gasColorKnobs(patch, "gasTeal", theme.gasTeal);
    case "ghostStars":
      return [
        colorKnob("ghost-tint", "Tint", theme.ghostStars.tint, (v) =>
          patch({ ghostStars: { tint: v } }),
        ),
      ];
    case "cosmicDust":
      return [
        colorKnob("dust-dust", "Dust", theme.cosmicDust.dust, (v) =>
          patch({ cosmicDust: { dust: v } }),
        ),
        colorKnob("dust-tint", "Tint", theme.cosmicDust.tint, (v) =>
          patch({ cosmicDust: { tint: v } }),
        ),
      ];
    case "dustLanes":
      return [
        colorKnob("lanes-lane", "Lane", theme.milkyDustLanes.lane, (v) =>
          patch({ milkyDustLanes: { lane: v } }),
        ),
        colorKnob("lanes-deep", "Deep", theme.milkyDustLanes.deep, (v) =>
          patch({ milkyDustLanes: { deep: v } }),
        ),
      ];
    case "zodiacal":
      return [
        colorKnob("zodiac-warm", "Warm", theme.zodiacal.warm, (v) =>
          patch({ zodiacal: { warm: v } }),
        ),
        colorKnob("zodiac-core", "Core", theme.zodiacal.core, (v) =>
          patch({ zodiacal: { core: v } }),
        ),
      ];
    case "aurora":
      return [
        colorKnob("aurora-cool", "Cool", theme.aurora.cool, (v) =>
          patch({ aurora: { cool: v } }),
        ),
        colorKnob("aurora-edge", "Edge", theme.aurora.edge, (v) =>
          patch({ aurora: { edge: v } }),
        ),
      ];
    case "starsBand":
      return [
        colorKnob("band-tint", "Tint", theme.starsBand.tint, (v) =>
          patch({ starsBand: { tint: v } }),
        ),
      ];
    case "starsField":
      return [
        colorKnob("field-tint", "Tint", theme.starsField.tint, (v) =>
          patch({ starsField: { tint: v } }),
        ),
      ];
    case "shootingStars": {
      const s = theme.shootingStars;
      return [
        colorKnob("shoot-tip", "Tip", s.tip, (v) =>
          patch({ shootingStars: { tip: v } }),
        ),
        colorKnob("shoot-mid", "Mid", s.mid, (v) =>
          patch({ shootingStars: { mid: v } }),
        ),
        colorKnob("shoot-tail", "Tail", s.tail, (v) =>
          patch({ shootingStars: { tail: v } }),
        ),
      ];
    }
    default:
      return [];
  }
}

export function toggleSkyCraftRareTarget(
  theme: SkyTheme,
  patch: PatchTheme,
  target: RareSkyTarget,
): void {
  const current = theme.scene.idle.rareTargets;
  const has = current.includes(target);
  const next = has
    ? current.filter((t) => t !== target)
    : [...current, target];
  if (next.length === 0) return;
  patch({ scene: { idle: { rareTargets: next } } });
}

export function setSkyCraftRareEnabled(
  patch: PatchTheme,
  enabled: boolean,
): void {
  patch({ scene: { idle: { rareEnabled: enabled } } });
}

export function setSkyCraftRareSpecialStreak(
  patch: PatchTheme,
  enabled: boolean,
): void {
  patch({ scene: { idle: { rareSpecialStreak: enabled } } });
}
