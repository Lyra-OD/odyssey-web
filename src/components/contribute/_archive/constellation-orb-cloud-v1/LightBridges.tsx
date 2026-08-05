"use client";

import { Line } from "@react-three/drei";

export type SoulPositionMap = Record<string, [number, number, number]>;

type LightBridgesProps = {
  heroId: string;
  positions: SoulPositionMap;
  soulIds: string[];
};

/** Filaments qui suivent les positions live (après drag). */
export function LightBridges({
  heroId,
  positions,
  soulIds,
}: LightBridgesProps) {
  const heroPos = positions[heroId];
  if (!heroPos) return null;

  return (
    <group>
      {soulIds
        .filter((id) => id !== heroId)
        .map((id) => {
          const pos = positions[id];
          if (!pos) return null;
          return (
            <Line
              key={id}
              points={[heroPos, pos]}
              color="#5eead4"
              lineWidth={1}
              transparent
              opacity={0.28}
              depthWrite={false}
              toneMapped={false}
            />
          );
        })}
    </group>
  );
}
