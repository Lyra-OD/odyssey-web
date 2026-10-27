/**
 * Commit 4 S7 — dimensions après orientation (contrat §7.3).
 * Pure : pas de DOM, pas de probe conteneur.
 */

/** Paysage V1 : au plus 1920×1080. */
export const VIDEO_MAX_LANDSCAPE = { width: 1920, height: 1080 } as const;

/** Portrait V1 : au plus 1080×1920. */
export const VIDEO_MAX_PORTRAIT = { width: 1080, height: 1920 } as const;

export type VideoFrameOrientation = "landscape" | "portrait" | "square";

export type OrientedDimensionsAssessment =
  | {
      ok: true;
      width: number;
      height: number;
      orientation: VideoFrameOrientation;
    }
  | {
      ok: false;
      error: "video_dimensions_invalid" | "video_dimensions_exceed_limit";
    };

export function classifyFrameOrientation(
  width: number,
  height: number,
): VideoFrameOrientation {
  if (width === height) return "square";
  return width > height ? "landscape" : "portrait";
}

/**
 * Applique une rotation de métadonnée (0/90/180/270) aux dimensions
 * brutes du flux pour obtenir la taille d'affichage.
 * Les navigateurs exposent souvent déjà `videoWidth`/`videoHeight` orientés ;
 * ce helper sert quand la rotation vient du conteneur ou des tests.
 */
export function applyRotationToDimensions(
  width: number,
  height: number,
  rotationDegrees: number,
): { width: number; height: number } {
  const normalized = ((rotationDegrees % 360) + 360) % 360;
  if (normalized === 90 || normalized === 270) {
    return { width: height, height: width };
  }
  return { width, height };
}

/**
 * Valide les dimensions **après** orientation.
 * Carré : chaque côté ≤ 1080 (intersection paysage/portrait V1).
 */
export function assessOrientedDimensions(
  width: number,
  height: number,
): OrientedDimensionsAssessment {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 1 ||
    height < 1
  ) {
    return { ok: false, error: "video_dimensions_invalid" };
  }

  const w = Math.round(width);
  const h = Math.round(height);
  if (w < 1 || h < 1) {
    return { ok: false, error: "video_dimensions_invalid" };
  }

  const orientation = classifyFrameOrientation(w, h);

  if (orientation === "landscape") {
    if (w > VIDEO_MAX_LANDSCAPE.width || h > VIDEO_MAX_LANDSCAPE.height) {
      return { ok: false, error: "video_dimensions_exceed_limit" };
    }
  } else if (orientation === "portrait") {
    if (w > VIDEO_MAX_PORTRAIT.width || h > VIDEO_MAX_PORTRAIT.height) {
      return { ok: false, error: "video_dimensions_exceed_limit" };
    }
  } else {
    const maxSquare = Math.min(
      VIDEO_MAX_LANDSCAPE.height,
      VIDEO_MAX_PORTRAIT.width,
    );
    if (w > maxSquare || h > maxSquare) {
      return { ok: false, error: "video_dimensions_exceed_limit" };
    }
  }

  return { ok: true, width: w, height: h, orientation };
}
