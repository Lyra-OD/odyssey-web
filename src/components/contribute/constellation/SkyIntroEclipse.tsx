"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

import { markSkyActivity } from "./IdleCameraDrift";
import { useSkyTheme } from "./skyTheme";
import type { VisualTier } from "./useVisualTier";

const STORAGE_KEY = "odyssey_sky_intro_v1";

/**
 * État intro — lu par EclipseDisc + layers (skyMul).
 * Orchestré par `SkyIntroEclipse`.
 */
export const skyIntroRef = {
  active: false,
  /** 0 = ciel éteint, 1 = plein. */
  skyMul: 1,
  /** 0–1 présence du disc intro. */
  disc: 0,
  /** Scale mul du disc (s’ouvre). */
  discScale: 1,
};

export function skyIntroMul(base: number) {
  return base * skyIntroRef.skyMul;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function alreadySeenThisSession() {
  try {
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("skyIntro") === "1"
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* private mode */
  }
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function finishIntro() {
  skyIntroRef.active = false;
  skyIntroRef.skyMul = 1;
  skyIntroRef.disc = 0;
  skyIntroRef.discScale = 1;
  delete document.body.dataset.skyIntro;
  markSeen();
  markSkyActivity();
}

type Props = {
  /** Immersif + feature on. */
  enabled: boolean;
  tier: VisualTier;
};

/**
 * Intro Éclipse 1×/session — ciel éteint → disc + corona → révélation.
 * Skip : Esc, clic, reduced, reduced-motion, déjà vu, mobile (V1).
 */
export function SkyIntroEclipse({ enabled, tier }: Props) {
  const theme = useSkyTheme();
  const intro = theme.scene.intro;
  const gl = useThree((s) => s.gl);
  const ageRef = useRef(0);
  const runningRef = useRef(false);
  const decidedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !intro?.enabled || tier !== "desktop") {
      if (runningRef.current) finishIntro();
      runningRef.current = false;
      decidedRef.current = false;
      return;
    }
    if (decidedRef.current) return;
    decidedRef.current = true;

    if (prefersReducedMotion() || alreadySeenThisSession()) {
      finishIntro();
      return;
    }

    runningRef.current = true;
    ageRef.current = 0;
    skyIntroRef.active = true;
    skyIntroRef.skyMul = 0;
    skyIntroRef.disc = 0;
    skyIntroRef.discScale = 1;
    document.body.dataset.skyIntro = "1";
    markSkyActivity();
  }, [enabled, intro?.enabled, tier]);

  useEffect(() => {
    if (!enabled) return;

    const skip = () => {
      if (!runningRef.current && !skyIntroRef.active) return;
      runningRef.current = false;
      finishIntro();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Esc") skip();
    };
    const onPointer = () => {
      if (skyIntroRef.active) skip();
    };

    window.addEventListener("keydown", onKey);
    gl.domElement.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      gl.domElement.removeEventListener("pointerdown", onPointer);
    };
  }, [enabled, gl]);

  useFrame((_, delta) => {
    if (!runningRef.current || !skyIntroRef.active) return;

    const dur = intro?.durationSec ?? 3.2;
    ageRef.current += Math.min(delta, 0.05);
    const u = ageRef.current / dur;
    markSkyActivity(); // bloque idle / rares pendant l’intro

    if (u >= 1) {
      runningRef.current = false;
      finishIntro();
      return;
    }

    // 0–0.18 : fade-in disc, ciel noir
    // 0.18–0.38 : hold disc
    // 0.38–0.85 : ouverture (scale↑, skyMul↑, disc↓)
    // 0.85–1 : disc out, ciel plein
    let disc = 0;
    if (u < 0.18) disc = smoothstep(0.02, 0.16, u);
    else if (u < 0.38) disc = 1;
    else if (u < 0.85) disc = 1 - smoothstep(0.38, 0.82, u) * 0.85;
    else disc = (1 - smoothstep(0.82, 0.98, u)) * 0.15;
    skyIntroRef.disc = disc;

    skyIntroRef.skyMul = smoothstep(0.4, 0.88, u);
    skyIntroRef.discScale =
      1 + smoothstep(0.35, 0.9, u) * (intro?.openScale ?? 1.65);
  });

  return null;
}
