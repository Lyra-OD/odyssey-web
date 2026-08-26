"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Vector3 } from "three";

import { ndcFieldStrength } from "@/src/components/contribute/constellation/graphs/drawPhase";
import { useParallaxPointerRef } from "@/src/components/contribute/constellation/ParallaxLayer";
import { CONSTELLATION_GROUP_OFFSET } from "@/src/components/contribute/constellation/graphs/revealCamera";

export type HeroNameSeparation = {
  /** Local Y — Hero monte (sans bouger le slot graphe). */
  heroLift: number;
  /** px Html — nom descend. */
  nameDrop: number;
  /** Pulse scale Hero (1 = repos). */
  heroScale: number;
  /** Pulse scale nom (1 = repos). */
  nameScale: number;
};

const REST: HeroNameSeparation = {
  heroLift: 0,
  nameDrop: 0,
  heroScale: 1,
  nameScale: 1,
};

/** Amplitude séparation @ intensity 1 — nom descend, Hero quasi fixe. */
const HERO_LIFT = 0.03;
const NAME_DROP_PX = 13;
const HERO_SCALE_PEAK = 0.012;
const NAME_SCALE_PEAK = 0.016;

/**
 * Souris près du couple Hero+nom → ils s’écartent / s’étirent (spring bounce).
 * Le **siège** graphe ne bouge pas — seulement l’écart relatif vertical.
 */
export function useHeroNameSeparation(
  enabled: boolean,
  intensity: number,
  heroLocal: [number, number, number] | undefined,
  graphScale: number,
): HeroNameSeparation {
  const pointerRef = useParallaxPointerRef();
  const proxTmp = useRef(new Vector3());
  const sepRef = useRef(0);
  const velRef = useRef(0);
  const [out, setOut] = useState<HeroNameSeparation>(REST);

  useFrame(({ camera }) => {
    if (!enabled || intensity < 0.02 || !pointerRef || !heroLocal) {
      velRef.current *= 0.78;
      sepRef.current += (0 - sepRef.current) * 0.12 + velRef.current;
      sepRef.current = Math.max(0, sepRef.current);
      setOut((prev) =>
        prev.heroLift === 0 && prev.nameDrop === 0 ? prev : REST,
      );
      return;
    }

    const gx = CONSTELLATION_GROUP_OFFSET[0];
    const gy = CONSTELLATION_GROUP_OFFSET[1];
    const ptr = pointerRef.current;

    const projectLocal = (pos: [number, number, number]) => {
      proxTmp.current.set(
        gx + pos[0] * graphScale,
        gy + pos[1] * graphScale,
        pos[2] * graphScale,
      );
      proxTmp.current.project(camera);
      return proxTmp.current;
    };

    const heroNdc = projectLocal(heroLocal);
    const nameLocal: [number, number, number] = [
      heroLocal[0],
      heroLocal[1] - 0.38 * graphScale,
      heroLocal[2],
    ];
    const nameNdc = projectLocal(nameLocal);

    const prox = Math.min(
      1,
      Math.max(
        ndcFieldStrength(ptr.x - heroNdc.x, ptr.y - heroNdc.y, 0.36),
        ndcFieldStrength(ptr.x - nameNdc.x, ptr.y - nameNdc.y, 0.32) * 0.92,
      ),
    );

    const target = prox * Math.min(1.2, intensity);
    const spring = 0.12;
    const damp = 0.82;
    velRef.current =
      (velRef.current + (target - sepRef.current) * spring) * damp;
    sepRef.current = Math.max(0, sepRef.current + velRef.current);

    const s = sepRef.current;
    const next: HeroNameSeparation = {
      heroLift: s * HERO_LIFT,
      nameDrop: s * NAME_DROP_PX,
      heroScale: 1 + s * HERO_SCALE_PEAK,
      nameScale: 1 + s * NAME_SCALE_PEAK,
    };

    setOut((prev) =>
      Math.abs(prev.heroLift - next.heroLift) > 0.002 ||
      Math.abs(prev.nameDrop - next.nameDrop) > 0.12
        ? next
        : prev,
    );
  });

  return out;
}
