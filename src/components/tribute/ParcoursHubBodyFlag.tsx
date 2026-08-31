"use client";

import { useEffect } from "react";

/** Masque le chrome shell studio (header / footer) via `html[data-parcours-hub-idle]`. */
export function ParcoursHubBodyFlag({ active }: { active: boolean }) {
  useEffect(() => {
    if (active) {
      document.documentElement.dataset.parcoursHubIdle = "1";
    } else {
      delete document.documentElement.dataset.parcoursHubIdle;
    }
    return () => {
      delete document.documentElement.dataset.parcoursHubIdle;
    };
  }, [active]);
  return null;
}
