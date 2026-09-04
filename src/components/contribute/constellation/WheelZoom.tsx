"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

import { markSkyActivity } from "./IdleCameraDrift";

/** Distance caméra (axe Z) — lue par FocusCamera. */
export const cameraZoomRef = { current: 7.5 };

export const ZOOM_DEFAULT = 7.5;
export const ZOOM_MIN = 4.4;
/** Moins extrême — couple fog/bande plus confortable */
export const ZOOM_MAX = 10.8;
/** Invité KEEP déjà à 5.15 — min craft trop haut pour s’approcher. */
export const GUEST_ZOOM_MIN = 3.2;

type WheelZoomProps = {
  enabled: boolean;
  min?: number;
  max?: number;
  /**
   * Hub : canvas `pointer-events: none` + plaques clic au-dessus.
   * Écouter `window` pour que la molette traverse les hits.
   */
  listenOnWindow?: boolean;
};

function skyWheelBlocked(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("input, textarea, select, [data-no-sky-wheel]"),
  );
}

/**
 * Zoom molette uniquement — met à jour cameraZoomRef.
 * FocusCamera / HubSkyCamera (settled) appliquent la distance.
 */
export function WheelZoom({
  enabled,
  min = ZOOM_MIN,
  max = ZOOM_MAX,
  listenOnWindow = false,
}: WheelZoomProps) {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    cameraZoomRef.current = Math.min(
      max,
      Math.max(min, cameraZoomRef.current),
    );

    const onWheel = (e: WheelEvent) => {
      if (!enabled) return;
      if (
        typeof document !== "undefined" &&
        document.body.dataset.skyFocus === "1"
      ) {
        return;
      }
      if (listenOnWindow && skyWheelBlocked(e.target)) return;
      e.preventDefault();
      markSkyActivity();
      cameraZoomRef.current = Math.min(
        max,
        Math.max(min, cameraZoomRef.current + e.deltaY * 0.012),
      );
    };

    if (listenOnWindow) {
      window.addEventListener("wheel", onWheel, { passive: false });
      return () => window.removeEventListener("wheel", onWheel);
    }

    const el = gl.domElement;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [enabled, gl, min, max, listenOnWindow]);

  return null;
}
