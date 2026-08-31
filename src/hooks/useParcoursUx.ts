"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { WizardStep1RevealPhase } from "@/src/hooks/useWizardStep1Reveal";
import {
  beginHubFreezeFx,
  beginHubThawAppear,
  HUB_CLOSE_PANEL_OUT_MS,
  HUB_CLOSE_SILENCE_MS,
  HUB_CLOSE_TOTAL_MS,
  HUB_FREEZE_FADE_MS,
  HUB_FREEZE_HOLD_MS,
  HUB_FREEZE_PANEL_AT_MS,
  HUB_FREEZE_TOTAL_MS,
  HUB_THAW_APPEAR_EASE_CSS,
  HUB_THAW_APPEAR_MS,
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
  /**
   * D — après silence : remount WebGL @0 puis true → ramp KEEP vers 1.
   * false pendant panelOut + silence (PNG seul / WebGL invisible).
   */
  const [thawReveal, setThawReveal] = useState(false);
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
      setThawReveal(false);
      return;
    }
    if (revealPhase === "typing") {
      setPhase(virginHub ? "hub.idle" : "panel.essentials");
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
      setThawReveal(false);
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
    setThawReveal(false);
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
      resetHubFreezeFx();
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
    setThawReveal(false);
    setTransition("panelCloseToHub");

    const silenceAt = HUB_CLOSE_PANEL_OUT_MS;
    const appearAt = HUB_CLOSE_PANEL_OUT_MS + HUB_CLOSE_SILENCE_MS;

    // Panneau parti → hub idle, WebGL remount @ opacity 0, PNG reste.
    schedule(() => {
      setPhase("hub.idle");
      setPanelExiting(false);
      setThawReveal(false);
    }, silenceAt);

    // Ramp KEEP : WebGL 0→1 · PNG 1→0 · breath/invite suivent la courbe.
    schedule(() => {
      beginHubThawAppear();
      // Double rAF : pose opacity 0 une frame avant la cible 1 (sinon pas de transition).
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setThawReveal(true);
        });
      });
    }, appearAt);

    schedule(() => {
      setTransition(null);
      setThawReveal(false);
      resetHubFreezeFx();
    }, HUB_CLOSE_TOTAL_MS);
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
      transition !== null ||
      panelExiting);

  const hubWebGLOpacity =
    transition === "hubFreezeTo2D"
      ? freezeHolding
        ? 1
        : 0
      : transition === "panelCloseToHub"
        ? thawReveal
          ? 1
          : 0
        : phase === "hub.idle"
          ? 1
          : 0;

  const backdropOpacity =
    transition === "panelCloseToHub"
      ? thawReveal
        ? 0
        : 1
      : phase === "panel.essentials" ||
          (transition === "hubFreezeTo2D" && !freezeHolding)
        ? 1
        : 0;

  const showHubHero =
    enabled && phase === "hub.idle" && transition === null;

  const showEssentialsPanel =
    enabled &&
    (panelExiting ||
      ((phase === "panel.essentials" ||
        phase === "ritual.reveal" ||
        phase === "hub.postReveal") &&
        transition !== "panelCloseToHub"));

  const hubSkyLive =
    enabled &&
    ((phase === "hub.idle" && transition === null) ||
      (transition === "hubFreezeTo2D" && freezeHolding) ||
      (transition === "panelCloseToHub" && phase === "hub.idle"));

  const hubChromeHidden = enabled;

  const showFreezeVeil =
    transition === "hubFreezeTo2D" ||
    (transition === "panelCloseToHub" && panelExiting);

  /** Courbe CSS KEEP — thaw only · aller garde ease-in-out standard. */
  const skyFadeEase =
    transition === "panelCloseToHub"
      ? HUB_THAW_APPEAR_EASE_CSS
      : "cubic-bezier(0.4, 0, 0.2, 1)";

  const skyFadeMs =
    transition === "panelCloseToHub"
      ? HUB_THAW_APPEAR_MS
      : HUB_FREEZE_FADE_MS;

  return {
    phase,
    transition,
    freezeHolding,
    panelExiting,
    thawReveal,
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
    closeFadeMs: HUB_THAW_APPEAR_MS,
    panelExitMs: HUB_CLOSE_PANEL_OUT_MS,
    skyFadeMs,
    skyFadeEase,
  };
}
