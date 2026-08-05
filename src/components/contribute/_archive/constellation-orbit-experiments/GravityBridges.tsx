"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { Vector3, type Group } from "three";

type GravityBridgesProps = {
  heroRef: React.RefObject<Group | null>;
  targetRefs: React.MutableRefObject<Map<string, Group | null>>;
  soulIds: string[];
  heroId: string;
  /** Présence du filament (0–1) */
  opacity?: number;
  lineWidth?: number;
};

type LineHandle = {
  geometry: { setPositions: (pos: number[]) => void };
};

/**
 * Rayons Lueur → étoile, recalculés chaque frame (monde → local).
 * Collés même si les anneaux tournent en sens opposés.
 */
export function GravityBridges({
  heroRef,
  targetRefs,
  soulIds,
  heroId,
  opacity = 0.28,
  lineWidth = 1.1,
}: GravityBridgesProps) {
  const root = useRef<Group>(null);
  const ids = useMemo(
    () => soulIds.filter((id) => id !== heroId),
    [soulIds, heroId],
  );
  const lineRefs = useRef<Map<string, LineHandle | null>>(new Map());
  const glowRefs = useRef<Map<string, LineHandle | null>>(new Map());
  const buf = useRef(new Float32Array(6));
  const tmpA = useMemo(() => new Vector3(), []);
  const tmpB = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const parent = root.current;
    const hero = heroRef.current;
    if (!parent || !hero) return;

    hero.getWorldPosition(tmpA);
    parent.worldToLocal(tmpA);

    for (const id of ids) {
      const target = targetRefs.current.get(id);
      if (!target) continue;
      target.getWorldPosition(tmpB);
      parent.worldToLocal(tmpB);

      const b = buf.current;
      b[0] = tmpA.x;
      b[1] = tmpA.y;
      b[2] = tmpA.z;
      b[3] = tmpB.x;
      b[4] = tmpB.y;
      b[5] = tmpB.z;

      lineRefs.current.get(id)?.geometry.setPositions(b as unknown as number[]);
      glowRefs.current.get(id)?.geometry.setPositions(b as unknown as number[]);
    }
  });

  return (
    <group ref={root}>
      {ids.map((id) => (
        <group key={id}>
          {/* Halo doux */}
          <Line
            ref={(node) => {
              glowRefs.current.set(id, node as unknown as LineHandle | null);
            }}
            points={[
              [0, 0, 0],
              [0.01, 0, 0],
            ]}
            color="#5eead4"
            lineWidth={lineWidth * 1.8}
            transparent
            opacity={opacity * 0.18}
            depthWrite={false}
            toneMapped={false}
          />
          {/* Noyau */}
          <Line
            ref={(node) => {
              lineRefs.current.set(id, node as unknown as LineHandle | null);
            }}
            points={[
              [0, 0, 0],
              [0.01, 0, 0],
            ]}
            color="#99f6e4"
            lineWidth={lineWidth}
            transparent
            opacity={opacity}
            depthWrite={false}
            toneMapped={false}
          />
        </group>
      ))}
    </group>
  );
}
