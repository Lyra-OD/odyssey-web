"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { useSkyTheme } from "./skyTheme";

/** Offsets idle — lus par FocusCamera (hors focus). */
export const idleCameraRef = {
  zoomOffset: 0,
  x: 0,
  y: 0,
  lookX: 0,
  lookY: 0,
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

/**
 * Dérive caméra idle — zoom + micro-déplacement très lents.
 * Après `delaySec` sans interaction ; s’efface dès qu’on touche.
 */
export function IdleCameraDrift() {
  const theme = useSkyTheme();
  const idle = theme.scene.idle;
  const phaseRef = useRef(0);
  const driftingRef = useRef(false);

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
      return;
    }

    const ease = Math.min(1, delta * 1.8);
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const quiet = (now - lastSkyActivityRef.current) / 1000 >= cfg.delaySec;
    const allow = quiet && !skyFocusActive();

    if (!allow) {
      driftingRef.current = false;
      idleCameraRef.zoomOffset += (0 - idleCameraRef.zoomOffset) * ease;
      idleCameraRef.x += (0 - idleCameraRef.x) * ease;
      idleCameraRef.y += (0 - idleCameraRef.y) * ease;
      idleCameraRef.lookX += (0 - idleCameraRef.lookX) * ease;
      idleCameraRef.lookY += (0 - idleCameraRef.lookY) * ease;
      return;
    }

    if (!driftingRef.current) {
      driftingRef.current = true;
      phaseRef.current = clock.elapsedTime;
    }

    const t = clock.elapsedTime - phaseRef.current;
    const twopi = Math.PI * 2;
    const p = cfg.periodSec;
    // Plusieurs sinus lents, hors phase → pas un loop évident
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

    // Ease-in doux au démarrage de l’idle
    const ramp = Math.min(1, t / 4);
    const k = ramp * ramp * (3 - 2 * ramp);

    idleCameraRef.zoomOffset += (z * k - idleCameraRef.zoomOffset) * 0.02;
    idleCameraRef.x += (x * k - idleCameraRef.x) * 0.02;
    idleCameraRef.y += (y * k - idleCameraRef.y) * 0.02;
    idleCameraRef.lookX += (lookX * k - idleCameraRef.lookX) * 0.02;
    idleCameraRef.lookY += (lookY * k - idleCameraRef.lookY) * 0.02;
  });

  return null;
}
