"use client";

import { useEffect } from "react";

import { acquireOdysseyCinemaMode } from "@/src/lib/odysseyCinemaMode";

/** Pose `data-odyssey-cinema` tant que le composant est monté (ref-count). */
export function useOdysseyCinemaMode(active = true) {
  useEffect(() => {
    if (!active) return;
    return acquireOdysseyCinemaMode();
  }, [active]);
}
