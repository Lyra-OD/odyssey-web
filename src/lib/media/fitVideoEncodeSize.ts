/**
 * Cible d'encodage V1 sans déformation : scale uniforme dans
 * paysage ≤ 1920×1080 ou portrait ≤ 1080×1920 (carré ≤ 1080).
 */

import {
  VIDEO_MAX_LANDSCAPE,
  VIDEO_MAX_PORTRAIT,
  classifyFrameOrientation,
} from "@/src/lib/media/orientedVideoDimensions";

export type EncodePixelSize = {
  width: number;
  height: number;
};

/** H.264 préfère des dimensions paires. */
export function evenDimension(value: number): number {
  const n = Math.max(2, Math.round(value));
  return n % 2 === 0 ? n : n - 1;
}

/**
 * Calcule width/height d'encode en conservant le ratio (pas d'étirement).
 */
export function fitVideoEncodeSize(
  orientedWidth: number,
  orientedHeight: number,
): EncodePixelSize {
  if (
    !Number.isFinite(orientedWidth) ||
    !Number.isFinite(orientedHeight) ||
    orientedWidth < 1 ||
    orientedHeight < 1
  ) {
    return { width: 2, height: 2 };
  }

  const orientation = classifyFrameOrientation(
    Math.round(orientedWidth),
    Math.round(orientedHeight),
  );

  let maxW: number;
  let maxH: number;
  if (orientation === "portrait") {
    maxW = VIDEO_MAX_PORTRAIT.width;
    maxH = VIDEO_MAX_PORTRAIT.height;
  } else if (orientation === "landscape") {
    maxW = VIDEO_MAX_LANDSCAPE.width;
    maxH = VIDEO_MAX_LANDSCAPE.height;
  } else {
    maxW = VIDEO_MAX_PORTRAIT.width;
    maxH = VIDEO_MAX_PORTRAIT.width;
  }

  const scale = Math.min(1, maxW / orientedWidth, maxH / orientedHeight);
  return {
    width: evenDimension(orientedWidth * scale),
    height: evenDimension(orientedHeight * scale),
  };
}
