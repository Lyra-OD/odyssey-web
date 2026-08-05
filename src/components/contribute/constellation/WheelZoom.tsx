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

type WheelZoomProps = {
  enabled: boolean;
};

/**
 * Zoom molette uniquement — met à jour cameraZoomRef.
 * FocusCamera applique la distance hors focus.
 */
export function WheelZoom({ enabled }: WheelZoomProps) {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    cameraZoomRef.current = Math.min(
      ZOOM_MAX,
      Math.max(ZOOM_MIN, cameraZoomRef.current),
    );

    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      if (!enabled) return;
      if (
        typeof document !== "undefined" &&
        document.body.dataset.skyFocus === "1"
      ) {
        return;
      }
      e.preventDefault();
      markSkyActivity();
      cameraZoomRef.current = Math.min(
        ZOOM_MAX,
        Math.max(ZOOM_MIN, cameraZoomRef.current + e.deltaY * 0.012),
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [enabled, gl]);

  return null;
}
