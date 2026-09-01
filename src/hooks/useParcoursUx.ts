"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import type { WizardStep1RevealPhase } from "@/src/hooks/useWizardStep1Reveal";
import {
  captureHubCanvas,
  revokeHubFreezeCapture,
} from "@/src/lib/parcours/hubFreezeCapture";
import { prefetchSanctuaryUniverse } from "@/src/lib/parcours/prefetchSanctuaryUniverse";
import {
  beginHubCloseInspire,
  beginHubFreezeFx,
  beginHubThawAppear,
  HUB_CAPTURE_AT_MS,
  HUB_CLOSE_COLLAPSE_MS,
  HUB_CLOSE_IMPACT_RITUAL_U,
  HUB_CLOSE_RITUAL_MS,
  HUB_CLOSE_STREAK_LAYER_FADE_MS,
  HUB_CLOSE_THAW_RITUAL_U,
  hubCloseBackdropOpacityU,
  hubClosePhaseFromU,
  hubCloseRitualU,
  hubCloseWebGLOpacityU,
  HUB_FREEZE_FADE_MS,
  HUB_FREEZE_PANEL_AT_MS,
  HUB_FREEZE_TOTAL_MS,
  HUB_THAW_APPEAR_EASE_CSS,
  HUB_THAW_APPEAR_MS,
  pulseHubCloseStarKiss,
  resetHubFreezeFx,
  softenHubCloseInspire,
  softenHubFreezeFx,
  type HubCloseRitualPhase,
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

export type ParcoursCloseRitualPhase = HubCloseRitualPhase;

/** T-close-5a — opacités rituel close sans setState (rAF → CSS vars). */
export const PARCOURS_CLOSE_WEBGL_OPACITY_VAR =
  "--parcours-close-webgl-opacity";
export const PARCOURS_CLOSE_BACKDROP_OPACITY_VAR =
  "--parcours-close-backdrop-opacity";

function syncCloseRitualSkyOpacities(u: number) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const phase = hubClosePhaseFromU(u);
  let webgl = hubCloseWebGLOpacityU(u);
  if (phase === "collapse" || phase === "hold") {
    webgl = Math.max(webgl, 0.72);
  }
  root.style.setProperty(
    PARCOURS_CLOSE_BACKDROP_OPACITY_VAR,
    String(hubCloseBackdropOpacityU(u)),
  );
  root.style.setProperty(PARCOURS_CLOSE_WEBGL_OPACITY_VAR, String(webgl));
}

function clearCloseRitualSkyOpacities() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.removeProperty(PARCOURS_CLOSE_WEBGL_OPACITY_VAR);
  root.style.removeProperty(PARCOURS_CLOSE_BACKDROP_OPACITY_VAR);
}

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
  /** T-close-5a — timeline 0→1 en ref (opacités via CSS vars, pas de re-render). */
  const closeRitualURef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const closeThawCommittedRef = useRef(false);
  const closeThawArmedRef = useRef(false);
  const closeRitualActiveRef = useRef(false);
  const closeRitualStartedAtRef = useRef<number | null>(null);
  const closeRitualRafRef = useRef(0);
  const closeRitualPhaseRef = useRef<ParcoursCloseRitualPhase>("idle");
  const closeImpactFiredRef = useRef(false);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  const stopCloseRitualRaf = useCallback(() => {
    if (closeRitualRafRef.current) {
      cancelAnimationFrame(closeRitualRafRef.current);
      closeRitualRafRef.current = 0;
    }
    closeRitualStartedAtRef.current = null;
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    prefetchSanctuaryUniverse();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      stopCloseRitualRaf();
      resetHubFreezeFx();
      revokeHubFreezeCapture();
      setFreezeCaptureUrl(null);
      setPhase("hub.idle");
      setTransition(null);
      setFreezeHolding(false);
      setPanelExiting(false);
      setThawReveal(false);
      setCloseRitualPhase("idle");
      closeRitualURef.current = 0;
      clearCloseRitualSkyOpacities();
      closeRitualPhaseRef.current = "idle";
      closeImpactFiredRef.current = false;
      closeThawArmedRef.current = false;
      closeRitualActiveRef.current = false;
      return;
    }
    if (revealPhase === "typing" && !closeRitualActiveRef.current) {
      setPhase(virginHub ? "hub.idle" : "panel.essentials");
    }
  }, [enabled, virginHub, revealPhase, clearTimers, stopCloseRitualRaf]);

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

  useEffect(() => () => {
    clearTimers();
    stopCloseRitualRaf();
  }, [clearTimers, stopCloseRitualRaf]);

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
    clearCloseRitualSkyOpacities();
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
      closeThawArmedRef.current = false;
      setCloseRitualPhase("idle");
      closeRitualURef.current = 0;
      clearCloseRitualSkyOpacities();
      closeRitualPhaseRef.current = "idle";
      closeImpactFiredRef.current = false;
      closeRitualActiveRef.current = false;
    }, HUB_THAW_APPEAR_MS);
  }, [schedule]);

  const driveCloseRitual = useCallback(() => {
    const start = closeRitualStartedAtRef.current;
    if (start == null) return;

    const elapsed = performance.now() - start;
    const u = hubCloseRitualU(elapsed);
    closeRitualURef.current = u;
    syncCloseRitualSkyOpacities(u);

    const nextPhase = hubClosePhaseFromU(u);
    if (nextPhase !== closeRitualPhaseRef.current) {
      if (nextPhase === "collapse") softenHubCloseInspire();
      closeRitualPhaseRef.current = nextPhase;
      setCloseRitualPhase(nextPhase);
    }

    if (u >= HUB_CLOSE_IMPACT_RITUAL_U && !closeImpactFiredRef.current) {
      closeImpactFiredRef.current = true;
      pulseHubCloseStarKiss();
    }
    if (u >= HUB_CLOSE_THAW_RITUAL_U) {
      closeThawArmedRef.current = true;
    }

    if (elapsed >= HUB_CLOSE_RITUAL_MS) {
      setCloseRitualPhase("hold");
      closeRitualPhaseRef.current = "hold";
      setPhase("hub.idle");
      setPanelExiting(false);
      stopCloseRitualRaf();
      return;
    }

    closeRitualRafRef.current = requestAnimationFrame(driveCloseRitual);
  }, [stopCloseRitualRaf]);

  const closePanel = useCallback(() => {
    if (!enabled) return;
    if (revealPhase !== "typing") return;
    if (phase !== "panel.essentials") return;
    if (transition) return;
    clearTimers();
    stopCloseRitualRaf();
    closeThawCommittedRef.current = false;
    closeThawArmedRef.current = false;
    closeImpactFiredRef.current = false;
    closeRitualActiveRef.current = true;
    closeRitualPhaseRef.current = "inspire";
    beginHubCloseInspire();
    setPanelExiting(true);
    setFreezeHolding(false);
    setThawReveal(false);
    setCloseRitualPhase("inspire");
    closeRitualURef.current = 0;
    syncCloseRitualSkyOpacities(0);
    setTransition("panelCloseToHub");

    closeRitualStartedAtRef.current = performance.now();
    closeRitualRafRef.current = requestAnimationFrame(driveCloseRitual);
  }, [
    enabled,
    revealPhase,
    phase,
    transition,
    clearTimers,
    stopCloseRitualRaf,
    driveCloseRitual,
  ]);

  /** T-close-4 — thaw @ u≥88 % (fallback si WebGL pas prêt @ fin rituel). */
  useEffect(() => {
    if (transition !== "panelCloseToHub") return;
    if (thawReveal || closeThawCommittedRef.current) return;
    if (!hubWebGLReady) return;
    if (!closeThawArmedRef.current && closeRitualPhase !== "hold") return;
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

  /** Hub WebGL : idle + crossfades — canvas chaud en saisie (loop off, opacité 0). */
  const mountHubWebGL =
    enabled &&
    !showRitualWebGL &&
    (phase === "hub.idle" ||
      phase === "panel.essentials" ||
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
          : hubCloseWebGLOpacityU(closeRitualURef.current)
        : phase === "hub.idle"
          ? 1
          : 0;

  const backdropOpacity =
    transition === "panelCloseToHub"
      ? thawReveal
        ? 0
        : hubCloseBackdropOpacityU(closeRitualURef.current)
      : phase === "panel.essentials" ||
          (transition === "hubFreezeTo2D" && !freezeHolding)
        ? 1
        : 0;

  const showHubHero =
    enabled && phase === "hub.idle" && transition === null;

  const showEssentialsPanel =
    enabled &&
    (transition === "panelCloseToHub"
      ? closeRitualPhase === "inspire" || closeRitualPhase === "collapse"
      : panelExiting ||
        phase === "panel.essentials" ||
        phase === "ritual.reveal" ||
        phase === "hub.postReveal");

  /** Loop off en saisie · canvas monté @ opacité 0 (pre-warm) · reprise @ close (D1). */
  const hubSkyLive =
    enabled &&
    ((phase === "hub.idle" && transition === null) ||
      (transition === "hubFreezeTo2D" && freezeHolding) ||
      transition === "panelCloseToHub");

  const hubChromeHidden = enabled;

  const showFreezeVeil = transition === "hubFreezeTo2D";

  const showCloseInspireVeil =
    transition === "panelCloseToHub" && closeRitualPhase === "inspire";

  const showCloseStarImpact =
    transition === "panelCloseToHub" &&
    (closeRitualPhase === "collapse" || closeRitualPhase === "hold");

  const showCloseCanvasStreak =
    transition === "panelCloseToHub" &&
    (closeRitualPhase === "collapse" || closeRitualPhase === "hold");

  /** Courbe CSS KEEP — thaw only · aller garde ease-in-out standard. */
  const skyFadeEase =
    transition === "panelCloseToHub"
      ? HUB_THAW_APPEAR_EASE_CSS
      : "cubic-bezier(0.4, 0, 0.2, 1)";

  const skyFadeMs =
    transition === "panelCloseToHub"
      ? thawReveal
        ? HUB_THAW_APPEAR_MS
        : HUB_CLOSE_STREAK_LAYER_FADE_MS
      : HUB_FREEZE_FADE_MS;

  /** Rituel close — opacités pilotées en rAF (CSS vars), pas via props React. */
  const closeSkyOpacityLive =
    transition === "panelCloseToHub" && !thawReveal;

  return {
    phase,
    transition,
    freezeHolding,
    panelExiting,
    thawReveal,
    freezeCaptureUrl,
    closeRitualPhase,
    closeSkyOpacityLive,
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
    showCloseCanvasStreak,
    showCloseStarImpact,
    crossfadeMs: HUB_FREEZE_FADE_MS,
    closeFadeMs: HUB_THAW_APPEAR_MS,
    panelExitMs: HUB_CLOSE_COLLAPSE_MS,
    closeRitualMs: HUB_CLOSE_RITUAL_MS,
    skyFadeMs,
    skyFadeEase,
  };
}
