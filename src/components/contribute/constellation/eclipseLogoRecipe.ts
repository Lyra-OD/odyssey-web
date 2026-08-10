/**
 * Recette logo Eclipse Odyssey — figée depuis le craft lab (10 août 2026).
 * Vie = 1 → soie / breath / diamond vivants (c’est ça qui anime le mark).
 *
 * Bible + handoff : docs/ODYSSEY_ECLIPSE_LOGO.md
 * Lab craft (permanent) : /fr/contribute/test-eclipse
 * Preview marque : /fr/contribute/test-eclipse-mark
 */
export const ECLIPSE_LOGO_RECIPE = {
  alignment: 1,
  lifeAmp: 1,
  coronaAmp: 0.35,
  coronaSpread: 0.4,
  coronaIrregular: 1.95,
  coronaRays: 0,
  coronaSoft: 0.4,
  photonAmp: 0,
  diamondAmp: 2.6,
  moonScale: 0.99,
  sunScale: 0.97,
  bodyFade: 1,
  progress: 0,
  offsetX: 0,
  offsetY: 0,
} as const;

export type EclipseLogoRecipe = typeof ECLIPSE_LOGO_RECIPE;
