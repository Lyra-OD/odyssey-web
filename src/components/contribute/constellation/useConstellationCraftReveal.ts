"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ConstellationRevealCraft } from "@/src/components/contribute/SanctuaryUniverse";
import {
  DEFAULT_BRIDGES,
  DEFAULT_SLOT_STARS,
} from "@/src/components/contribute/constellation/craftDefaults";
import {
  DEFAULT_HERO_GLOBAL_SCALE,
  DEFAULT_HERO_PARALLAX,
  DEFAULT_HERO_SPIKES,
  DEFAULT_HERO_TEAL,
  DEFAULT_HERO_WHITE,
} from "@/src/components/contribute/constellation/HeroStar";
import type { CurrentTipStyle } from "@/src/components/contribute/constellation/LightBridges";
import {
  DEFAULT_CONSTELLATION_REVEAL_MS,
  DEFAULT_HERO_SHARE,
  DEFAULT_STROKE_OVERLAP,
} from "@/src/components/contribute/constellation/graphs/reveal";
import {
  allGhostSlotLit,
  defaultCraftSlotLit,
} from "@/src/components/contribute/constellation/graphs/resolveConstellation";

export type UseConstellationCraftRevealOptions = {
  /** Lance le reveal au mount (onglet Constellation lab). */
  autoPlay?: boolean;
  /** Rejoue après la fin (~1,2 s). */
  loop?: boolean;
  heroName?: string;
  revealDurationMs?: number;
};

/** Defaults alignés sur `/test-lueur` onglet Constellation. */
export function useConstellationCraftReveal(
  options: UseConstellationCraftRevealOptions = {},
) {
  const {
    autoPlay = true,
    loop = false,
    heroName,
    revealDurationMs = DEFAULT_CONSTELLATION_REVEAL_MS,
  } = options;

  const [revealT, setRevealT] = useState(0);
  const revealTRef = useRef(0);
  const [revealPlaying, setRevealPlaying] = useState(false);
  const [slotLit, setSlotLit] = useState(defaultCraftSlotLit);
  const revealPlayFromRef = useRef(0);

  const restart = () => {
    setSlotLit(defaultCraftSlotLit());
    revealPlayFromRef.current = 0;
    revealTRef.current = 0;
    setRevealT(0);
    setRevealPlaying(true);
  };

  useEffect(() => {
    if (!autoPlay) return;
    restart();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / autoPlay only
  }, [autoPlay]);

  useEffect(() => {
    if (!revealPlaying) return;
    let raf = 0;
    const t0 = performance.now();
    const r0 = revealPlayFromRef.current;
    const spanMs = Math.max(80, (1 - r0) * revealDurationMs);
    let lastUi = 0;
    const tick = (now: number) => {
      const u = Math.min(1, (now - t0) / spanMs);
      const next = r0 + (1 - r0) * u;
      revealTRef.current = next;
      if (now - lastUi >= 100 || u >= 1) {
        lastUi = now;
        setRevealT(next);
      }
      if (u < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setRevealPlaying(false);
        setSlotLit(allGhostSlotLit());
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [revealPlaying, revealDurationMs]);

  useEffect(() => {
    if (!loop || revealPlaying) return;
    if (revealT < 0.999) return;
    const t = window.setTimeout(() => restart(), 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart stable
  }, [loop, revealPlaying, revealT]);

  useEffect(() => {
    if (revealPlaying) return;
    if (revealT >= 0.999) {
      setSlotLit(allGhostSlotLit());
    }
  }, [revealPlaying, revealT]);

  const craftReveal: ConstellationRevealCraft = useMemo(
    () => ({
      controlled: true,
      revealT,
      revealTRef,
      heroShare: DEFAULT_HERO_SHARE,
      strokeOverlap: DEFAULT_STROKE_OVERLAP,
      graphScale: 1,
      tipStrength: 1.2,
      tipStyle: "orb" satisfies CurrentTipStyle,
      tipColor: "#5eead4",
      tipSize: 1,
      tipTrailLen: 0.14,
      ghostDim: DEFAULT_SLOT_STARS.ghostDim,
      slotStars: DEFAULT_SLOT_STARS,
      bridges: DEFAULT_BRIDGES,
      slotLit,
      heroAtom: {
        white: DEFAULT_HERO_WHITE,
        teal: DEFAULT_HERO_TEAL,
        spikes: DEFAULT_HERO_SPIKES,
        embedScale: 0.42,
        globalScale: DEFAULT_HERO_GLOBAL_SCALE,
      },
      heroParallax: DEFAULT_HERO_PARALLAX,
      heroName,
    }),
    [revealT, slotLit, heroName],
  );

  return { craftReveal, revealT, revealPlaying, restart };
}
