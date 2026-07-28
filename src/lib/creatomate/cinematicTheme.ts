/**
 * Direction artistique Quiet Luxury / A24 — source unique de vérité.
 * Aucune valeur esthétique dans payloadBuilder : tout passe par ce theme.
 */

export const cinematicTheme = {
  brand: {
    wordmark: "Odyssey",
    fill: "#71717a",
    fontFamily: "Aileron",
    fontWeight: "500",
    fontSizeVmin: "1.8 vmin",
    letterSpacing: "12%",
  },

  colors: {
    void: "#020202",
    name: "#f4f4f5",
    dates: "#a1a1aa",
    softLight: "rgba(244, 244, 245, 0.12)",
    grain: "rgba(255, 255, 255, 0.05)",
  },

  typography: {
    name: {
      fontFamily: "Playfair Display",
      fontWeight: "500",
      fontSizeVmin: "7.4 vmin",
      width: "88%",
    },
    dates: {
      fontFamily: "Aileron",
      fontWeight: "300",
      fontSizeVmin: "2.4 vmin",
      width: "80%",
    },
  },

  /** Intro Signature — 3 actes, 6–9 s. */
  intro: {
    durationSec: 7.5,
    /** Acte A — noir / souffle */
    breathSec: 1.2,
    softLightPeakOpacity: "12%",
    softLightFadeSec: 1.4,
    grainOpacity: "6%",
    /** Acte B — révélation typo */
    nameFadeSec: 1.6,
    nameStartDelaySec: 1.0,
    datesDelayAfterNameSec: 0.75,
    datesFadeSec: 1.2,
    /** Dézoom quasi imperceptible */
    startScale: "104%",
    endScale: "100%",
    scaleDurationSec: 7.0,
    nameY: "44%",
    datesY: "58%",
    /** Acte C — fondu vers premier souvenir */
    exitFadeSec: 1.2,
  },

  outro: {
    durationSec: 4.5,
    fadeInSec: 1.0,
    wordmarkY: "50%",
    startScale: "101%",
    endScale: "100%",
  },

  media: {
    photoDurationSec: 7,
    /** Fallback si videoTrims absent */
    videoFallbackDurationSec: 10,
    transitionFadeSec: 0.55,
    fit: "cover" as const,
  },

  music: {
    bedVolume: "55%",
    duckVolume: "22%",
    duckAttackSec: 0.55,
    duckReleaseSec: 0.7,
    chapterFadeInSec: 1.8,
    chapterFadeOutSec: 1.2,
  },

  frameRate: "25 fps",
  outputFormat: "mp4" as const,
} as const;

export type CinematicTheme = typeof cinematicTheme;

/** TTL URLs Storage pour Creatomate (4 h). */
export const CREATOMATE_MEDIA_SIGNED_URL_TTL_SEC = 4 * 60 * 60;
