/**
 * Reveal camera pose from the same revealT as birth/draw.
 * Birth = tight on Hero+name · draw = pull-back to Leo idle frame.
 */

import { BIRTH_SEGMENTS } from "@/src/components/contribute/constellation/graphs/birth";
import { easeOutCubic } from "@/src/components/contribute/constellation/graphs/reveal";

/** Matches Constellation group in SanctuaryUniverse. */
export const CONSTELLATION_GROUP_OFFSET = [-0.45, -0.7, 0] as const;

/** Leo hero local (S = 0.78). */
const HERO_LOCAL: [number, number, number] = [-0.4 * 0.78, -0.35 * 0.78, 0];

/** Approx Leo silhouette centroid (local). */
const LEO_CENTER_LOCAL: [number, number, number] = [0.5, 1.13, -0.35];

export const REVEAL_CAM_BIRTH_Z = 3.45;
export const REVEAL_CAM_IDLE_Z = 7.5;

/** Pull-back begins just after first stroke leaves Hero (traits @ C_END 0.57). */
export const REVEAL_CAM_PULL_START = 0.59;

/** Weight of stroke draw vs wall-clock for framing (stroke-led = voir le graphe). */
const STROKE_PULL_WEIGHT = 0.62;

export type RevealCameraPose = {
  /** 0 = naissance serrée · 1 = cadre Leo idle */
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

export function heroWorldPos(graphScale = 1): {
  x: number;
  y: number;
  z: number;
} {
  return {
    x: CONSTELLATION_GROUP_OFFSET[0] + HERO_LOCAL[0] * graphScale,
    y: CONSTELLATION_GROUP_OFFSET[1] + HERO_LOCAL[1] * graphScale,
    z: HERO_LOCAL[2] * graphScale,
  };
}

function leoIdleLook(graphScale = 1): { x: number; y: number; z: number } {
  return {
    x: CONSTELLATION_GROUP_OFFSET[0] + LEO_CENTER_LOCAL[0] * graphScale,
    y: CONSTELLATION_GROUP_OFFSET[1] + LEO_CENTER_LOCAL[1] * graphScale,
    z: LEO_CENTER_LOCAL[2] * graphScale,
  };
}

/**
 * Pull starts @ REVEAL_CAM_PULL_START · easeOut + blend drawU (suit le trait).
 */
export function resolveRevealCamera(
  revealT: number,
  graphScale = 1,
  drawU = 0,
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

  const hero = heroWorldPos(graphScale);
  const idle = leoIdleLook(graphScale);

  // Birth frame: look slightly under Hero so name+star share the glass
  const birthLookY = hero.y - 0.28 * graphScale;
  const lookX = hero.x + (idle.x - hero.x) * pull;
  const lookY = birthLookY + (idle.y - birthLookY) * pull;
  const lookZ = hero.z + (idle.z - hero.z) * pull;

  // Stay optically on Hero during birth; drift toward idle framing
  const camX = lookX + (idle.x * 0.08 - lookX * 0.02) * pull;
  const camY = lookY + 0.12 * (1 - pull) + (idle.y * 0.05) * pull;
  const camZ =
    REVEAL_CAM_BIRTH_Z + (REVEAL_CAM_IDLE_Z - REVEAL_CAM_BIRTH_Z) * pull;

  return { pull, lookX, lookY, lookZ, camX, camY, camZ };
}
