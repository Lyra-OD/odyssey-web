import type { AutoScrollOptions } from "@dnd-kit/core";

/** Auto-scroll fenêtre pendant le drag montage (bords écran sensibles). */
export function useMontageAutoScroll(): AutoScrollOptions {
  return {
    enabled: true,
    threshold: { x: 0.12, y: 0.12 },
    acceleration: 16,
    interval: 8,
    layoutShiftCompensation: { x: true, y: true },
  };
}
