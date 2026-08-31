"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { WizardStep1RevealPhase } from "@/src/hooks/useWizardStep1Reveal";
import {
  beginHubFreezeFx,
  beginPanelLivingSky,
  HUB_CLOSE_PANEL_OUT_MS,
  HUB_CURTAIN_LIFT_MS,
  HUB_FREEZE_FADE_MS,
  HUB_FREEZE_HOLD_MS,
  HUB_FREEZE_PANEL_AT_MS,
  HUB_FREEZE_TOTAL_MS,
  HUB_PANEL_LIVE_WEBGL_OPACITY,
  resetHubFreezeFx,
  softenHubFreezeFx,
} from "@/src/lib/parcours/hubFreezeTimeline";

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

type UseParcoursUxOptions = {
  enabled: boolean;
  revealPhase: WizardStep1RevealPhase;
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
  const [freezeHolding, setFreezeHolding] = useState(false);
  const [panelExiting, setPanelExiting] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      resetHubFreezeFx();
      setPhase("hub.idle");
      setTransition(null);
      setFreezeHolding(false);
      setPanelExiting(false);
      return;
    }
    if (revealPhase === "typing") {
      setPhase(virginHub ? "hub.idle" : "panel.essentials");
      if (!virginHub) beginPanelLivingSky();
    }
  }, [enabled, virginHub, revealPhase, clearTimers]);

  useEffect(() => {
    if (!enabled) return;
    if (revealPhase === "reward") {
      clearTimers();
      resetHubFreezeFx();
      setTransition(null);
      setFreezeHolding(false);
      setPanelExiting(false);
      setPhase("ritual.reveal");
    } else if (revealPhase === "done") {
      setPhase("hub.postReveal");
    }
  }, [enabled, revealPhase, clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const openPanel = useCallback(() => {
    if (!enabled) return;
    if (revealPhase === "reward") return;
    if (phase !== "hub.idle") return;
    if (transition) return;
    clearTimers();
    beginHubFreezeFx();
    setFreezeHolding(true);
    setPanelExiting(false);
    setTransition("hubFreezeTo2D");

    schedule(() => {
      softenHubFreezeFx();
      setFreezeHolding(false);
    }, HUB_FREEZE_HOLD_MS);

    schedule(() => {
      setPhase("panel.essentials");
    }, HUB_FREEZE_PANEL_AT_MS);

    schedule(() => {
      setTransition(null);
      beginPanelLivingSky();
    }, HUB_FREEZE_TOTAL_MS);
  }, [enabled, revealPhase, phase, transition, clearTimers, schedule]);

  const closePanel = useCallback(() => {
    if (!enabled) return;
    if (revealPhase !== "typing") return;
    if (phase !== "panel.essentials") return;
    if (transition) return;
    clearTimers();
    setPanelExiting(true);
    setFreezeHolding(false);

    schedule(() => {
      resetHubFreezeFx();
      setPhase("hub.idle");
      setPanelExiting(false);
    }, HUB_CLOSE_PANEL_OUT_MS);
  }, [enabled, revealPhase, phase, transition, clearTimers, schedule]);

  useEffect(() => {
    if (!enabled || phase !== "panel.essentials" || transition) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, phase, transition, closePanel]);

  const showRitualWebGL =
    enabled &&
    (phase === "ritual.reveal" || phase === "hub.postReveal");

  /** C2 — WebGL monté hub + panneau (PNG = rideau transition seulement). */
  const mountHubWebGL =
    enabled &&
    !showRitualWebGL &&
    (phase === "hub.idle" ||
      phase === "panel.essentials" ||
      transition === "hubFreezeTo2D");

  /** PNG visible seulement pendant le crossfade freeze (pas en saisie stable). */
  const mountBackdrop =
    enabled &&
    !showRitualWebGL &&
    (phase === "hub.idle" || transition === "hubFreezeTo2D");

  const hubWebGLOpacity =
    transition === "hubFreezeTo2D"
      ? freezeHolding
        ? 1
        : 0
      : phase === "panel.essentials"
        ? HUB_PANEL_LIVE_WEBGL_OPACITY
        : phase === "hub.idle"
          ? 1
          : 0;

  const backdropOpacity =
    transition === "hubFreezeTo2D" && !freezeHolding ? 1 : 0;

  const showHubHero =
    enabled && phase === "hub.idle" && transition === null;

  const showEssentialsPanel =
    enabled &&
    (panelExiting ||
      ((phase === "panel.essentials" ||
        phase === "ritual.reveal" ||
        phase === "hub.postReveal") &&
        !panelExiting));

  /** C2 — loop WebGL hub idle + saisie panneau · off pendant fade PNG. */
  const hubSkyLive =
    enabled &&
    ((phase === "hub.idle" && transition === null) ||
      (phase === "panel.essentials" && transition === null) ||
      (transition === "hubFreezeTo2D" && freezeHolding));

  const hubChromeHidden = enabled;

  const showFreezeVeil = transition === "hubFreezeTo2D";

  const skyFadeEase = "cubic-bezier(0.4, 0, 0.2, 1)";

  const skyFadeMs =
    transition === "hubFreezeTo2D" ? HUB_FREEZE_FADE_MS : HUB_CURTAIN_LIFT_MS;

  return {
    phase,
    transition,
    freezeHolding,
    panelExiting,
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
    showFreezeVeil,
    crossfadeMs: HUB_FREEZE_FADE_MS,
    closeFadeMs: HUB_CURTAIN_LIFT_MS,
    panelExitMs: HUB_CLOSE_PANEL_OUT_MS,
    skyFadeMs,
    skyFadeEase,
  };
}
