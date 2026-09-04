/**
 * Reveal camera pose from the same revealT as birth/draw.
 * Birth = Hero du template actif au centre · draw = pull-back bbox silhouette.
 */

import { BIRTH_SEGMENTS } from "@/src/components/contribute/constellation/graphs/birth";
import {
  drawnBounds,
  fitCameraZ,
  offsetBounds,
  templateBounds,
} from "@/src/components/contribute/constellation/graphs/frame";
import type { LeoStrokeStep } from "@/src/components/contribute/constellation/graphs/leo";
import { easeOutCubic } from "@/src/components/contribute/constellation/graphs/reveal";
import { ACTIVE_TEMPLATE } from "@/src/components/contribute/constellation/graphs/resolveConstellation";
import type { ConstellationTemplate } from "@/src/components/contribute/constellation/graphs/types";

/** Matches Constellation group in SanctuaryUniverse. */
export const CONSTELLATION_GROUP_OFFSET = [-0.45, -0.7, 0] as const;

/**
 * Cadre hub partagé (HubSkyCamera + RevealCamera birth).
 * Remonte le regard pour centrer l’étoile (pas le slot prénom Html).
 */
export const HUB_LOOK_Y_LIFT = 0.22;
export const HUB_CAM_Z_END = 5.15;

/** Birth Z = hub settled — cohérent avec le gel PNG / Continuer. Invité KEEP. */
export const REVEAL_CAM_BIRTH_Z = HUB_CAM_Z_END;
/**
 * Wizard rituel — plan plus serré (nom + naissance plus gros).
 * Ne pas baisser `REVEAL_CAM_BIRTH_Z` : l’invité et le hub restent à 5.15.
 */
export const WIZARD_REVEAL_BIRTH_Z = 3.2;
export const REVEAL_CAM_IDLE_Z = 7.5;

/** Pull-back begins just after first stroke leaves Hero (traits @ C_END). */
export const REVEAL_CAM_PULL_START = BIRTH_SEGMENTS.C_END + 0.02;

/** Weight of stroke draw vs wall-clock for framing (stroke-led = voir le graphe). */
const STROKE_PULL_WEIGHT = 0.62;

export type RevealCameraPose = {
  /** 0 = naissance serrée · 1 = cadre silhouette idle */
  pull: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  camX: number;
  camY: number;
  camZ: number;
};

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

/** Passe une boîte locale dans le repère monde (offset groupe + échelle). */
function toWorld(bounds: ReturnType<typeof templateBounds>, graphScale: number) {
  return offsetBounds(
    bounds,
    CONSTELLATION_GROUP_OFFSET[0],
    CONSTELLATION_GROUP_OFFSET[1],
    graphScale,
  );
}

function heroLocal(
  template: ConstellationTemplate,
): [number, number, number] {
  const hero = template.nodes.find((n) => n.role === "hero");
  return hero?.position ?? [0, 0, 0];
}

export function heroWorldPos(
  graphScale = 1,
  template: ConstellationTemplate = ACTIVE_TEMPLATE,
): {
  x: number;
  y: number;
  z: number;
} {
  const [lx, ly, lz] = heroLocal(template);
  return {
    x: CONSTELLATION_GROUP_OFFSET[0] + lx * graphScale,
    y: CONSTELLATION_GROUP_OFFSET[1] + ly * graphScale,
    z: lz * graphScale,
  };
}

/**
 * Centroïde des nœuds (monde) — cadre settle indépendant du signe (Leo/Libra/…).
 * Légère bias Hero pour garder le nom dans le verre.
 */
export function silhouetteLookFromTemplate(
  template: ConstellationTemplate = ACTIVE_TEMPLATE,
  graphScale = 1,
): { x: number; y: number; z: number } {
  const nodes = template.nodes;
  if (nodes.length < 1) {
    return heroWorldPos(graphScale, template);
  }
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (const n of nodes) {
    sx += n.position[0];
    sy += n.position[1];
    sz += n.position[2];
  }
  const inv = 1 / nodes.length;
  const cx =
    CONSTELLATION_GROUP_OFFSET[0] + sx * inv * graphScale;
  const cy =
    CONSTELLATION_GROUP_OFFSET[1] + sy * inv * graphScale;
  const cz = sz * inv * graphScale;
  const hero = heroWorldPos(graphScale, template);
  /** 72 % bbox + 28 % Hero — silhouette centrée, prénom pas collé au bord bas. */
  return {
    x: cx * 0.72 + hero.x * 0.28,
    y: cy * 0.72 + (hero.y + HUB_LOOK_Y_LIFT * graphScale) * 0.28,
    z: cz * 0.72 + hero.z * 0.28,
  };
}

/**
 * Pull starts @ REVEAL_CAM_PULL_START · easeOut + blend drawU (suit le trait).
 * A–C : cadre hub (étoile centre écran · nom Html sous l’étoile).
 * D–F : pull-back bbox du template actif.
 */
export type RevealCameraView = {
  /** Champ vertical de la caméra, en degrés. */
  fov: number;
  /** Largeur / hauteur du viewport. */
  aspect: number;
};

export function resolveRevealCamera(
  revealT: number,
  graphScale = 1,
  drawU = 0,
  template: ConstellationTemplate = ACTIVE_TEMPLATE,
  view?: RevealCameraView,
  /** Ordre des traits — permet de cadrer la portion déjà tracée. */
  sequence?: readonly LeoStrokeStep[],
  strokeOverlap?: number,
  birthCamZ: number = REVEAL_CAM_BIRTH_Z,
): RevealCameraPose {
  const t = clamp01(revealT);
  const cEnd = BIRTH_SEGMENTS.C_END;
  const strokeU =
    drawU > 0
      ? clamp01(drawU)
      : t <= cEnd
        ? 0
        : (t - cEnd) / Math.max(1e-6, 1 - cEnd);

  const timeU =
    t <= REVEAL_CAM_PULL_START
      ? 0
      : (t - REVEAL_CAM_PULL_START) /
        Math.max(1e-6, 1 - REVEAL_CAM_PULL_START);

  const strokePull = easeOutCubic(strokeU);
  const timePull = easeOutCubic(timeU);
  const pull = clamp01(
    strokePull * STROKE_PULL_WEIGHT + timePull * (1 - STROKE_PULL_WEIGHT),
  );

  const hero = heroWorldPos(graphScale, template);
  const idle = silhouetteLookFromTemplate(template, graphScale);

  const birthLookX = hero.x;
  const birthLookY = hero.y + HUB_LOOK_Y_LIFT * graphScale;
  const birthLookZ = hero.z;

  const lookX = birthLookX + (idle.x - birthLookX) * pull;
  const lookY = birthLookY + (idle.y - birthLookY) * pull;
  const lookZ = birthLookZ + (idle.z - birthLookZ) * pull;

  const camX = 0 + idle.x * 0.08 * pull;
  const camY = 0 + idle.y * 0.05 * pull;
  const paced =
    birthCamZ + (REVEAL_CAM_IDLE_Z - birthCamZ) * pull;

  /**
   * Le recul suit le dessin : on recule juste assez pour contenir ce qui est
   * déjà tracé. Sans ça la constellation déborde pendant tout le tracé, le
   * temps que le rythme du pull rattrape le trait.
   */
  const camZ = (() => {
    if (!view || strokeU <= 0) return paced;
    const local = sequence
      ? drawnBounds(template, sequence, strokeU, strokeOverlap)
      : templateBounds(template);
    const needed = fitCameraZ(
      toWorld(local, graphScale),
      lookX,
      lookY,
      view.fov,
      view.aspect,
    );
    if (!Number.isFinite(needed) || needed <= 0) return paced;
    return Math.max(paced, needed);
  })();

  return { pull, lookX, lookY, lookZ, camX, camY, camZ };
}
