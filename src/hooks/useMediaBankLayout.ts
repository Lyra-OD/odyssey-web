"use client";

import { useEffect, useState } from "react";

/** `drawer` = off-canvas droit (desktop) · `sheet` = bottom sheet (mobile). */
export type MediaBankLayout = "drawer" | "sheet";

const DESKTOP_QUERY = "(min-width: 768px)";

/**
 * Choisit le shell de la banque de médias selon la largeur d'écran.
 * Aligné sur le breakpoint Tailwind `md` (768px).
 */
export function useMediaBankLayout(): MediaBankLayout {
  const [layout, setLayout] = useState<MediaBankLayout>("drawer");

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const update = () => setLayout(mq.matches ? "drawer" : "sheet");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return layout;
}
