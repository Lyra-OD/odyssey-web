"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Vector3 } from "three";

import {
  hubStarWorldReadyRef,
  hubStarWorldRef,
  resetHubStarWorldRef,
} from "@/src/components/tribute/hubStarAnchorRef";

export type ScreenAnchor = { x: number; y: number };

type StarScreenReporterProps = {
  active: boolean;
  onScreen: (anchor: ScreenAnchor | null) => void;
};

/**
 * Projette la position monde de l’étoile (groupe parent) → % viewport.
 * Suit la caméra pendant l’approche / le retour.
 */
export function StarScreenReporter({
  active,
  onScreen,
}: StarScreenReporterProps) {
  const { camera, size } = useThree();
  const tmp = useRef(new Vector3());
  const last = useRef<ScreenAnchor | null>(null);
  const onScreenRef = useRef(onScreen);
  const group = useRef<Group>(null);

  useEffect(() => {
    onScreenRef.current = onScreen;
  }, [onScreen]);

  useEffect(() => {
    if (!active) {
      last.current = null;
      resetHubStarWorldRef();
      onScreenRef.current(null);
    }
  }, [active]);

  useFrame(() => {
    if (!active || !group.current) return;
    const v = tmp.current;
    group.current.getWorldPosition(v);
    hubStarWorldRef.current.copy(v);
    hubStarWorldReadyRef.current = true;
    v.project(camera);
    const x = (v.x * 0.5 + 0.5) * 100;
    const y = (-v.y * 0.5 + 0.5) * 100;
    const nx = Math.min(92, Math.max(8, x));
    const ny = Math.min(90, Math.max(10, y));
    const prev = last.current;
    if (
      prev &&
      Math.abs(prev.x - nx) < 0.2 &&
      Math.abs(prev.y - ny) < 0.2
    ) {
      return;
    }
    void size.width;
    last.current = { x: nx, y: ny };
    onScreenRef.current(last.current);
  });

  return <group ref={group} />;
}
