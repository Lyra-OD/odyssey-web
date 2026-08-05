"use client";

import { Line } from "@react-three/drei";

type OrbitalRingsProps = {
  radii?: number[];
  segments?: number;
};

/**
 * Sillons fixes dans le plan du système (même axe).
 * Les étoiles tournent le long de ces rainures — pas les rainures elles-mêmes.
 */
export function OrbitalRings({
  radii = [1.95, 3.05],
  segments = 128,
}: OrbitalRingsProps) {
  return (
    <group>
      {radii.map((r, idx) => {
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= segments; i++) {
          const a = (i / segments) * Math.PI * 2;
          // Même plan z=0 → un seul axe visuel
          pts.push([Math.cos(a) * r, Math.sin(a) * r, 0]);
        }
        return (
          <Line
            key={r}
            points={pts}
            color="#5eead4"
            lineWidth={1}
            transparent
        opacity={idx === 0 ? 0.14 : 0.1}
            depthWrite={false}
            toneMapped={false}
          />
        );
      })}
    </group>
  );
}
