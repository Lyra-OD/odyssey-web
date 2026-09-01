"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import type { WizardStep1RevealPhase } from "@/src/hooks/useWizardStep1Reveal";
import {
  captureHubCanvas,
  revokeHubFreezeCapture,
} from "@/src/lib/parcours/hubFreezeCapture";
import {
  beginHubCloseInspire,
  beginHubFreezeFx,
  beginHubThawAppear,
  HUB_CAPTURE_AT_MS,
  HUB_CLOSE_COLLAPSE_MS,
  HUB_CLOSE_INSPIRE_MS,
  HUB_CLOSE_RITUAL_MS,
  HUB_FREEZE_FADE_MS,
  HUB_FREEZE_PANEL_AT_MS,
  HUB_FREEZE_TOTAL_MS,
  HUB_THAW_APPEAR_EASE_CSS,
  HUB_THAW_APPEAR_MS,
  resetHubFreezeFx,
  softenHubCloseInspire,
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

export type ParcoursCloseRitualPhase =
  | "idle"
  | "inspire"
  | "collapse"
  | "hold";

type UseParcoursUxOptions = {
  enabled: boolean;
  revealPhase: WizardStep1RevealPhase;
  virginHub: boolean;
  /** Canvas hub-lite — capture Plan B @ clic Hero. */
  hubCanvasRef?: RefObject<HTMLCanvasElement | null>;
  /** D1 — thaw close seulement quand le moteur a peint un frame chaud. */
  hubWebGLReady?: boolean;
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
  hubCanvasRef,
  hubWebGLReady = false,
}: UseParcoursUxOptions) {
  const [phase, setPhase] = useState<ParcoursPhase>(() =>
    resolveInitialPhase(enabled, virginHub),
  );
  const [transition, setTransition] = useState<ParcoursSkyTransition>(null);
  const [freezeHolding, setFreezeHolding] = useState(false);
  const [panelExiting, setPanelExiting] = useState(false);
  /**
   * D — ramp KEEP : WebGL 0→1 · PNG 1→0 · breath/invite suivent la courbe.
   * false jusqu’au début du crossfade (thaw démarre tôt, en parallèle du panneau out).
   */
  const [thawReveal, setThawReveal] = useState(false);
  /** Plan B — data URL capture session · null = fallback JPEG. */
  const [freezeCaptureUrl, setFreezeCaptureUrl] = useState<string | null>(null);
  const [closeRitualPhase, setCloseRitualPhase] =
    useState<ParcoursCloseRitualPhase>("idle");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const closeThawCommittedRef = useRef(false);
  const closeRitualActiveRef = useRef(false);

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
      revokeHubFreezeCapture();
      setFreezeCaptureUrl(null);
      setPhase("hub.idle");
      setTransition(null);
      setFreezeHolding(false);
      setPanelExiting(false);
      setThawReveal(false);
      setCloseRitualPhase("idle");
      closeRitualActiveRef.current = false;
      return;
    }
    if (revealPhase === "typing" && !closeRitualActiveRef.current) {
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
    revokeHubFreezeCapture();
    setFreezeCaptureUrl(null);
    setCloseRitualPhase("idle");
    closeRitualActiveRef.current = false;
    beginHubFreezeFx();
    setFreezeHolding(true);
    setPanelExiting(false);
    setThawReveal(false);
    setTransition("hubFreezeTo2D");

    schedule(() => {
      softenHubFreezeFx();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const captured = captureHubCanvas(hubCanvasRef?.current ?? null);
          setFreezeCaptureUrl(captured);
          setFreezeHolding(false);
        });
      });
    }, HUB_CAPTURE_AT_MS);

    schedule(() => {
      setPhase("panel.essentials");
    }, HUB_FREEZE_PANEL_AT_MS);

    schedule(() => {
      setTransition(null);
      resetHubFreezeFx();
    }, HUB_FREEZE_TOTAL_MS);
  }, [enabled, revealPhase, phase, transition, clearTimers, schedule, hubCanvasRef]);

  const commitCloseThaw = useCallback(() => {
    if (closeThawCommittedRef.current) return;
    closeThawCommittedRef.current = true;
    beginHubThawAppear();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setThawReveal(true);
      });
    });
    schedule(() => {
      setTransition(null);
      setThawReveal(false);
      resetHubFreezeFx();
      revokeHubFreezeCapture();
      setFreezeCaptureUrl(null);
      closeThawCommittedRef.current = false;
      setCloseRitualPhase("idle");
      closeRitualActiveRef.current = false;
    }, HUB_THAW_APPEAR_MS);
  }, [schedule]);

  const closePanel = useCallback(() => {
    if (!enabled) return;
    if (revealPhase !== "typing") return;
    if (phase !== "panel.essentials") return;
    if (transition) return;
    clearTimers();
    closeThawCommittedRef.current = false;
    closeRitualActiveRef.current = true;
    beginHubCloseInspire();
    setPanelExiting(true);
    setFreezeHolding(false);
    setThawReveal(false);
    setCloseRitualPhase("inspire");
    setTransition("panelCloseToHub");

    schedule(() => {
      softenHubCloseInspire();
      setCloseRitualPhase("collapse");
    }, HUB_CLOSE_INSPIRE_MS);

    schedule(() => {
      setCloseRitualPhase("hold");
      setPhase("hub.idle");
      setPanelExiting(false);
    }, HUB_CLOSE_RITUAL_MS);
  }, [enabled, revealPhase, phase, transition, clearTimers, schedule]);

  /** D1 + T-close-2b — thaw @ hold seulement (pas pendant collapse vivant). */
  useEffect(() => {
    if (transition !== "panelCloseToHub") return;
    if (thawReveal || closeThawCommittedRef.current) return;
    if (!hubWebGLReady) return;
    if (closeRitualPhase !== "hold") return;
    commitCloseThaw();
  }, [
    transition,
    thawReveal,
    hubWebGLReady,
    closeRitualPhase,
    commitCloseThaw,
  ]);

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

  /** Hub WebGL : idle + crossfades — unmount total en saisie panneau. */
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
      closeRitualPhase !== "idle" ||
      ((phase === "panel.essentials" ||
        phase === "ritual.reveal" ||
        phase === "hub.postReveal") &&
        transition !== "panelCloseToHub"));

  /** Loop off en saisie · pre-warm + reprise @ thaw close (D1). */
  const hubSkyLive =
    enabled &&
    ((phase === "hub.idle" && transition === null) ||
      (transition === "hubFreezeTo2D" && freezeHolding) ||
      transition === "panelCloseToHub");

  const hubChromeHidden = enabled;

  const showFreezeVeil = transition === "hubFreezeTo2D";

  const showCloseInspireVeil =
    transition === "panelCloseToHub" &&
    (closeRitualPhase === "inspire" || closeRitualPhase === "collapse");

  const showCloseHaloTracteur =
    transition === "panelCloseToHub" &&
    (closeRitualPhase === "collapse" || closeRitualPhase === "hold");

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
    freezeCaptureUrl,
    closeRitualPhase,
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
    showCloseInspireVeil,
    showCloseHaloTracteur,
    crossfadeMs: HUB_FREEZE_FADE_MS,
    closeFadeMs: HUB_THAW_APPEAR_MS,
    panelExitMs: HUB_CLOSE_COLLAPSE_MS,
    closeRitualMs: HUB_CLOSE_RITUAL_MS,
    skyFadeMs,
    skyFadeEase,
  };
}
