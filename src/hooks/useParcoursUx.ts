"use client";

import { useCallback, useEffect, useState } from "react";

import type { WizardStep1RevealPhase } from "@/src/hooks/useWizardStep1Reveal";

/** États UX Chemin 1 — couche au-dessus du wizard step 1. */
export type ParcoursPhase =
  | "hub.idle"
  | "panel.essentials"
  | "ritual.reveal"
  | "hub.postReveal";

type UseParcoursUxOptions = {
  /** Wizard étape 1 Sanctuaire (organisateur). */
  enabled: boolean;
  revealPhase: WizardStep1RevealPhase;
  /**
   * true = première visite vierge (aucune identité) → hub Hero + clic.
   * false = draft / compte avec données → panneau L'essentiel direct.
   */
  virginHub: boolean;
};

function resolveInitialPhase(
  enabled: boolean,
  virginHub: boolean,
): ParcoursPhase {
  if (!enabled) return "hub.idle";
  return virginHub ? "hub.idle" : "panel.essentials";
}

export function useParcoursUx({
  enabled,
  revealPhase,
  virginHub,
}: UseParcoursUxOptions) {
  const [phase, setPhase] = useState<ParcoursPhase>(() =>
    resolveInitialPhase(enabled, virginHub),
  );

  useEffect(() => {
    if (!enabled) {
      setPhase("hub.idle");
      return;
    }
    if (revealPhase === "typing") {
      setPhase(virginHub ? "hub.idle" : "panel.essentials");
    }
  }, [enabled, virginHub, revealPhase]);

  useEffect(() => {
    if (!enabled) return;
    if (revealPhase === "reward") {
      setPhase("ritual.reveal");
    } else if (revealPhase === "done") {
      setPhase("hub.postReveal");
    }
  }, [enabled, revealPhase]);

  const openPanel = useCallback(() => {
    if (!enabled) return;
    if (revealPhase === "reward") return;
    setPhase("panel.essentials");
  }, [enabled, revealPhase]);

  const closePanel = useCallback(() => {
    if (!enabled) return;
    if (revealPhase !== "typing") return;
    setPhase("hub.idle");
  }, [enabled, revealPhase]);

  useEffect(() => {
    if (!enabled || phase !== "panel.essentials") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, phase, closePanel]);

  const showWebGL =
    enabled &&
    (phase === "ritual.reveal" || phase === "hub.postReveal");
  const showBackdrop = enabled && !showWebGL;
  const showHubHero = enabled && phase === "hub.idle";
  const showEssentialsPanel =
    enabled &&
    (phase === "panel.essentials" ||
      phase === "ritual.reveal" ||
      phase === "hub.postReveal");

  return {
    phase,
    openPanel,
    closePanel,
    showWebGL,
    showBackdrop,
    showHubHero,
    showEssentialsPanel,
  };
}
