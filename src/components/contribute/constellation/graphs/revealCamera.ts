/**
 * Reveal camera pose from the same revealT as birth/draw.
 * Birth = tight on Hero+name · draw = pull-back to Leo idle frame.
 */

import { BIRTH_SEGMENTS } from "@/src/components/contribute/constellation/graphs/birth";
import { easeInOutCubic } from "@/src/components/contribute/constellation/graphs/reveal";

/** Matches Constellation group in SanctuaryUniverse. */
export const CONSTELLATION_GROUP_OFFSET = [-0.45, -0.7, 0] as const;

/** Leo hero local (S = 0.78). */
const HERO_LOCAL: [number, number, number] = [-0.4 * 0.78, -0.35 * 0.78, 0];

/** Approx Leo silhouette centroid (local). */
const LEO_CENTER_LOCAL: [number, number, number] = [0.5, 1.13, -0.35];

export const REVEAL_CAM_BIRTH_Z = 3.45;
export const REVEAL_CAM_IDLE_Z = 7.5;

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
 * Pull starts as draw begins (after C), eases to idle by revealT = 1.
 */
export function resolveRevealCamera(
  revealT: number,
  graphScale = 1,
): RevealCameraPose {
  const t = clamp01(revealT);
  const cEnd = BIRTH_SEGMENTS.C_END;
  const pull =
    t <= cEnd ? 0 : easeInOutCubic((t - cEnd) / Math.max(1e-6, 1 - cEnd));

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
