"use client";

import { useMemo } from "react";

export type VisualTier = "desktop" | "mobile" | "reduced";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/** Tier visuel pour plafonner particules / bloom / DPR. */
export function useVisualTier(): VisualTier {
  return useMemo(() => {
    if (typeof window === "undefined") return "desktop";
    if (prefersReducedMotion()) return "reduced";
    if (isCoarsePointer() || window.innerWidth < 768) return "mobile";
    return "desktop";
  }, []);
}

export function tierDustCount(tier: VisualTier): number {
  if (tier === "reduced") return 800;
  if (tier === "mobile") return 2800;
  return 6500;
}

export function tierDpr(tier: VisualTier): [number, number] {
  if (tier === "reduced" || tier === "mobile") return [1, 1];
  return [1, 1.5];
}

export function tierBloomEnabled(tier: VisualTier): boolean {
  return tier === "desktop";
}
