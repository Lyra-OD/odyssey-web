"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { WizardStep1RevealPhase } from "@/src/hooks/useWizardStep1Reveal";

/** États UX Chemin 1 — couche au-dessus du wizard step 1. */
export type ParcoursPhase =
  | "hub.idle"
  | "panel.essentials"
  | "ritual.reveal"
  | "hub.postReveal";

export type ParcoursSkyTransition =
  | null
  | "hubFreezeTo2D"
  | "panelCloseToHub";

const SKY_CROSSFADE_MS = 420;

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
  const [transition, setTransition] = useState<ParcoursSkyTransition>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTransitionTimer = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }, []);

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
      clearTransitionTimer();
      setTransition(null);
      setPhase("ritual.reveal");
    } else if (revealPhase === "done") {
      setPhase("hub.postReveal");
    }
  }, [enabled, revealPhase, clearTransitionTimer]);

  useEffect(() => () => clearTransitionTimer(), [clearTransitionTimer]);

  const openPanel = useCallback(() => {
    if (!enabled) return;
    if (revealPhase === "reward") return;
    if (phase !== "hub.idle") return;
    clearTransitionTimer();
    setTransition("hubFreezeTo2D");
    transitionTimerRef.current = setTimeout(() => {
      setPhase("panel.essentials");
      setTransition(null);
      transitionTimerRef.current = null;
    }, SKY_CROSSFADE_MS);
  }, [enabled, revealPhase, phase, clearTransitionTimer]);

  const closePanel = useCallback(() => {
    if (!enabled) return;
    if (revealPhase !== "typing") return;
    if (phase !== "panel.essentials") return;
    clearTransitionTimer();
    setTransition("panelCloseToHub");
    transitionTimerRef.current = setTimeout(() => {
      setPhase("hub.idle");
      setTransition(null);
      transitionTimerRef.current = null;
    }, SKY_CROSSFADE_MS);
  }, [enabled, revealPhase, phase, clearTransitionTimer]);

  useEffect(() => {
    if (!enabled || phase !== "panel.essentials") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, phase, closePanel]);

  const showRitualWebGL =
    enabled &&
    (phase === "ritual.reveal" || phase === "hub.postReveal");

  /** Hub WebGL : uniquement idle + crossfades (pas sous le formulaire). */
  const mountHubWebGL =
    enabled &&
    !showRitualWebGL &&
    (phase === "hub.idle" ||
      transition === "hubFreezeTo2D" ||
      transition === "panelCloseToHub");

  const mountBackdrop =
    enabled &&
    !showRitualWebGL &&
    (phase === "hub.idle" ||
      phase === "panel.essentials" ||
      transition !== null);

  const hubWebGLOpacity =
    transition === "hubFreezeTo2D"
      ? 0
      : phase === "hub.idle" || transition === "panelCloseToHub"
        ? 1
        : 0;

  const backdropOpacity =
    transition === "panelCloseToHub"
      ? 0
      : phase === "panel.essentials" || transition === "hubFreezeTo2D"
        ? 1
        : 0;

  const showHubHero = enabled && phase === "hub.idle" && !transition;
  const showEssentialsPanel =
    enabled &&
    (phase === "panel.essentials" ||
      phase === "ritual.reveal" ||
      phase === "hub.postReveal");

  /** Loop WebGL active seulement hub vivant (pas pendant freeze / panneau). */
  const hubSkyLive =
    enabled &&
    ((phase === "hub.idle" && transition === null) ||
      transition === "panelCloseToHub");

  const hubChromeHidden = enabled && showHubHero;

  return {
    phase,
    transition,
    openPanel,
    closePanel,
    showHubWebGL: mountHubWebGL,
    showRitualWebGL,
    showBackdrop: mountBackdrop,
    hubWebGLOpacity,
    backdropOpacity,
    showHubHero,
    showEssentialsPanel,
    hubSkyLive,
    hubChromeHidden,
    crossfadeMs: SKY_CROSSFADE_MS,
  };
}
