"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { useSkyTheme, type RareSkyTarget } from "./skyTheme";
import { skyIntroRef } from "./SkyIntroEclipse";

export type { RareSkyTarget };

/** Offsets idle — lus par FocusCamera / Parallax / gaz / filantes / bande. */
export const idleCameraRef = {
  zoomOffset: 0,
  x: 0,
  y: 0,
  lookX: 0,
  lookY: 0,
  /** 0 = actif, 1 = pleine dérive — boost parallaxe idle. */
  breath: 0,
  /** 0→1→0 pulse rare (cible = rareTarget). */
  rarePulse: 0,
  /** Quel layer « répond » ce moment-là. */
  rareTarget: "rose" as RareSkyTarget,
  /** Cue one-shot pour une filante « spéciale ». */
  requestSpecialStreak: false,
};

const lastSkyActivityRef = { current: 0 };

/** À appeler sur molette / pointeur / clic — coupe la dérive. */
export function markSkyActivity() {
  lastSkyActivityRef.current =
    typeof performance !== "undefined" ? performance.now() : Date.now();
}

function skyFocusActive() {
  return (
    typeof document !== "undefined" && document.body.dataset.skyFocus === "1"
  );
}

function skyIntroActive() {
  return skyIntroRef.active;
}

function smoothstep01(x: number) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/**
 * Dérive caméra idle + respiration ciel + moment rare.
 * Après `delaySec` sans interaction ; s’efface dès qu’on touche.
 */
export function IdleCameraDrift() {
  const theme = useSkyTheme();
  const idle = theme.scene.idle;
  const phaseRef = useRef(0);
  const driftingRef = useRef(false);
  const nextRareAtRef = useRef(0);
  const rareStartRef = useRef(-1);
  const lastRareTargetRef = useRef<RareSkyTarget | null>(null);

  useEffect(() => {
    markSkyActivity();
  }, []);

  useFrame(({ clock }, delta) => {
    const cfg = idle;
    if (!cfg?.enabled) {
      idleCameraRef.zoomOffset = 0;
      idleCameraRef.x = 0;
      idleCameraRef.y = 0;
      idleCameraRef.lookX = 0;
      idleCameraRef.lookY = 0;
      idleCameraRef.breath = 0;
      idleCameraRef.rarePulse = 0;
      return;
    }

    const ease = Math.min(1, delta * 1.8);
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const quiet = (now - lastSkyActivityRef.current) / 1000 >= cfg.delaySec;
    const allow = quiet && !skyFocusActive() && !skyIntroActive();

    if (!allow) {
      driftingRef.current = false;
      rareStartRef.current = -1;
      idleCameraRef.zoomOffset += (0 - idleCameraRef.zoomOffset) * ease;
      idleCameraRef.x += (0 - idleCameraRef.x) * ease;
      idleCameraRef.y += (0 - idleCameraRef.y) * ease;
      idleCameraRef.lookX += (0 - idleCameraRef.lookX) * ease;
      idleCameraRef.lookY += (0 - idleCameraRef.lookY) * ease;
      idleCameraRef.breath += (0 - idleCameraRef.breath) * ease;
      idleCameraRef.rarePulse += (0 - idleCameraRef.rarePulse) * ease;
      return;
    }

    if (!driftingRef.current) {
      driftingRef.current = true;
      phaseRef.current = clock.elapsedTime;
      const gapMin = cfg.rareGapMinSec;
      const gapMax = cfg.rareGapMaxSec;
      nextRareAtRef.current =
        clock.elapsedTime + gapMin + Math.random() * (gapMax - gapMin);
      rareStartRef.current = -1;
    }

    const t = clock.elapsedTime - phaseRef.current;
    const twopi = Math.PI * 2;
    const p = cfg.periodSec;
    const z =
      Math.sin((t / p) * twopi) * cfg.zoomAmp +
      Math.sin((t / (p * 1.37)) * twopi) * cfg.zoomAmp * 0.35;
    const x =
      Math.sin((t / (p * 1.15)) * twopi + 0.6) * cfg.moveAmp +
      Math.cos((t / (p * 0.82)) * twopi) * cfg.moveAmp * 0.4;
    const y =
      Math.cos((t / (p * 0.95)) * twopi + 1.1) * cfg.moveAmp * 0.85 +
      Math.sin((t / (p * 1.5)) * twopi) * cfg.moveAmp * 0.3;
    const lookX =
      Math.sin((t / (p * 1.2)) * twopi + 0.3) * cfg.lookAmp;
    const lookY =
      Math.cos((t / (p * 1.05)) * twopi + 0.9) * cfg.lookAmp * 0.75;

    const ramp = smoothstep01(t / 4);
    const k = ramp;

    idleCameraRef.zoomOffset += (z * k - idleCameraRef.zoomOffset) * 0.02;
    idleCameraRef.x += (x * k - idleCameraRef.x) * 0.02;
    idleCameraRef.y += (y * k - idleCameraRef.y) * 0.02;
    idleCameraRef.lookX += (lookX * k - idleCameraRef.lookX) * 0.02;
    idleCameraRef.lookY += (lookY * k - idleCameraRef.lookY) * 0.02;
    idleCameraRef.breath += (k - idleCameraRef.breath) * 0.04;

    // —— Moment rare : cible depuis thème + cue filante ——
    if (
      cfg.rareEnabled &&
      cfg.rareTargets.length > 0 &&
      rareStartRef.current < 0 &&
      clock.elapsedTime >= nextRareAtRef.current
    ) {
      rareStartRef.current = clock.elapsedTime;
      const pool = cfg.rareTargets.filter(
        (t) => t !== lastRareTargetRef.current,
      );
      const pick =
        (pool.length > 0 ? pool : cfg.rareTargets)[
          Math.floor(
            Math.random() *
              (pool.length > 0 ? pool.length : cfg.rareTargets.length),
          )
        ] ?? cfg.rareTargets[0]!;
      lastRareTargetRef.current = pick;
      idleCameraRef.rareTarget = pick;
      if (cfg.rareSpecialStreak) {
        idleCameraRef.requestSpecialStreak = true;
      }
      const gapMin = cfg.rareGapMinSec;
      const gapMax = cfg.rareGapMaxSec;
      nextRareAtRef.current =
        clock.elapsedTime + gapMin + Math.random() * (gapMax - gapMin);
    }

    if (!cfg.rareEnabled) {
      rareStartRef.current = -1;
      idleCameraRef.rarePulse += (0 - idleCameraRef.rarePulse) * ease;
    } else if (rareStartRef.current >= 0) {
      const age = clock.elapsedTime - rareStartRef.current;
      const dur = cfg.rareDurationSec;
      if (age >= dur) {
        rareStartRef.current = -1;
        idleCameraRef.rarePulse += (0 - idleCameraRef.rarePulse) * ease;
      } else {
        const u = age / dur;
        const pulse = Math.sin(u * Math.PI);
        idleCameraRef.rarePulse += (pulse - idleCameraRef.rarePulse) * 0.08;
      }
    } else {
      idleCameraRef.rarePulse += (0 - idleCameraRef.rarePulse) * ease;
    }
  });

  return null;
}
