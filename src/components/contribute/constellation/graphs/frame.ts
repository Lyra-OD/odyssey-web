/**
 * Cadre canonique d'une constellation (règle avant les 12 signes).
 *
 * Le Lion a montré le piège : son Hero (Regulus) est dans le coin inférieur
 * gauche de sa propre figure. La caméra visant le Hero pendant le tracé, la
 * moitié de la constellation sortait de l'écran. Dessiner dix signes de plus
 * sans règle, c'est reproduire ce bug dix fois.
 *
 * Règle : chaque gabarit est recentré sur sa boîte englobante et ramené à une
 * taille canonique ; la caméra calcule ensuite le recul nécessaire pour
 * contenir cette boîte, au lieu d'un Z fixe accordé à un seul signe.
 */

import {
  type LeoStrokeStep,
  strokeKey,
} from "@/src/components/contribute/constellation/graphs/leo";
import { resolveStrokeDraw } from "@/src/components/contribute/constellation/graphs/reveal";
import type {
  ConstellationNodeDef,
  ConstellationTemplate,
} from "@/src/components/contribute/constellation/graphs/types";

export type TemplateBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  halfWidth: number;
  halfHeight: number;
};

const EMPTY_BOUNDS: TemplateBounds = {
  minX: 0,
  maxX: 0,
  minY: 0,
  maxY: 0,
  centerX: 0,
  centerY: 0,
  width: 0,
  height: 0,
  halfWidth: 0,
  halfHeight: 0,
};

function boundsFrom(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
): TemplateBounds {
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return EMPTY_BOUNDS;
  const width = maxX - minX;
  const height = maxY - minY;
  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    width,
    height,
    halfWidth: width / 2,
    halfHeight: height / 2,
  };
}

export function templateBounds(
  template: ConstellationTemplate,
): TemplateBounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const n of template.nodes) {
    minX = Math.min(minX, n.position[0]);
    maxX = Math.max(maxX, n.position[0]);
    minY = Math.min(minY, n.position[1]);
    maxY = Math.max(maxY, n.position[1]);
  }
  return boundsFrom(minX, maxX, minY, maxY);
}

/**
 * Boîte de ce qui est **déjà tracé** à cet instant du reveal.
 *
 * C'est elle que la caméra doit contenir, pas la figure complète : sinon le
 * passage naissance → tracé imposerait un dézoom brutal sur une constellation
 * encore invisible. Ici le cadre grandit exactement au rythme du dessin.
 */
export function drawnBounds(
  template: ConstellationTemplate,
  sequence: readonly LeoStrokeStep[],
  drawU: number,
  strokeOverlap?: number,
): TemplateBounds {
  const byId = new Map(template.nodes.map((n) => [n.id, n.position]));
  const hero =
    template.nodes.find((n) => n.role === "hero")?.position ?? [0, 0, 0];

  let minX = hero[0];
  let maxX = hero[0];
  let minY = hero[1];
  let maxY = hero[1];
  const include = (x: number, y: number) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };

  const draw = resolveStrokeDraw(drawU, sequence, {
    heroShare: 0,
    strokeOverlap,
  });

  for (const step of sequence) {
    if (step.kind !== "stroke") continue;
    const progress = draw.edgeDraw[strokeKey(step.from, step.to)] ?? 0;
    if (progress <= 0) continue;
    const a = byId.get(step.from);
    const b = byId.get(step.to);
    if (!a || !b) continue;
    include(a[0], a[1]);
    include(a[0] + (b[0] - a[0]) * progress, a[1] + (b[1] - a[1]) * progress);
  }

  return boundsFrom(minX, maxX, minY, maxY);
}

/** Décale et met à l'échelle une boîte dans le repère monde. */
export function offsetBounds(
  bounds: TemplateBounds,
  offsetX: number,
  offsetY: number,
  scale: number,
): TemplateBounds {
  return boundsFrom(
    offsetX + bounds.minX * scale,
    offsetX + bounds.maxX * scale,
    offsetY + bounds.minY * scale,
    offsetY + bounds.maxY * scale,
  );
}

/**
 * Demi-extension cible de la figure, en unités monde.
 * Calé sur le Lion actuel (≈5,7 × 3,5) pour que les signes déjà accordés ne
 * changent pas d'échelle perçue — les nouveaux signes s'y conforment.
 */
export const FRAME_TARGET_HALF_WIDTH = 2.85;
export const FRAME_TARGET_HALF_HEIGHT = 1.76;

/** Part du cadre occupée par la figure au settle (le reste = respiration). */
export const FRAME_FILL = 0.82;

/**
 * Recentre la figure sur sa boîte et l'ajuste au cadre canonique, sans
 * déformer : un seul facteur d'échelle, la silhouette du signe est préservée.
 * Le Hero garde sa place **dans** la figure — c'est la figure qu'on centre,
 * pas le Hero, sinon les signes dont l'étoile principale est excentrée
 * (Lion, Scorpion) seraient tordus.
 */
export function normalizeTemplateFrame(
  template: ConstellationTemplate,
): ConstellationTemplate {
  const b = templateBounds(template);
  if (b.width <= 0 && b.height <= 0) return template;

  const scaleX =
    b.halfWidth > 0 ? FRAME_TARGET_HALF_WIDTH / b.halfWidth : Infinity;
  const scaleY =
    b.halfHeight > 0 ? FRAME_TARGET_HALF_HEIGHT / b.halfHeight : Infinity;
  const scale = Math.min(scaleX, scaleY);
  if (!Number.isFinite(scale) || scale <= 0) return template;

  const nodes: ConstellationNodeDef[] = template.nodes.map((n) => ({
    ...n,
    position: [
      (n.position[0] - b.centerX) * scale,
      (n.position[1] - b.centerY) * scale,
      n.position[2] * scale,
    ],
  }));

  return { ...template, nodes };
}

/**
 * Recul minimal pour contenir la boîte autour du point visé.
 * On mesure depuis le point visé (pas depuis le centre) : pendant le tracé la
 * caméra regarde encore le Hero, et c'est là que la figure débordait.
 */
export function fitCameraZ(
  bounds: TemplateBounds,
  lookX: number,
  lookY: number,
  fovDeg: number,
  aspect: number,
  fill = FRAME_FILL,
): number {
  const tan = Math.tan((Math.max(1, fovDeg) * Math.PI) / 360);
  if (tan <= 0) return 0;

  const reachX = Math.max(
    Math.abs(bounds.maxX - lookX),
    Math.abs(lookX - bounds.minX),
  );
  const reachY = Math.max(
    Math.abs(bounds.maxY - lookY),
    Math.abs(lookY - bounds.minY),
  );

  const safeFill = Math.min(0.98, Math.max(0.2, fill));
  const zForHeight = reachY / (tan * safeFill);
  const zForWidth = reachX / (tan * Math.max(0.1, aspect) * safeFill);

  return Math.max(zForHeight, zForWidth);
}
