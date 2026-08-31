import type { ScreenAnchor } from "@/src/components/contribute/constellation/StarScreenReporter";

/**
 * Projection étoile hub — écrit depuis le Canvas (useFrame), lu en DOM (rAF).
 * Pas de setState React : évite le jank main-thread sur le wizard.
 */
export const hubStarAnchorRef: { current: ScreenAnchor | null } = {
  current: null,
};
