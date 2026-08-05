"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Fog, Vector3 } from "three";

import { idleCameraRef } from "./IdleCameraDrift";
import { useSkyTheme } from "./skyTheme";
import { cameraZoomRef, ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN } from "./WheelZoom";

const FOCUS_FOG = { near: 5.5, far: 15 } as const;

/** Fog qui suit le zoom — la bande reste lisible en zoom out. */
function fogForZoom(camZ: number) {
  return {
    near: camZ + 3.5,
    far: camZ + 18,
  };
}

type FocusCameraProps = {
  /** Position locale de l’étoile (constellation). */
  target: [number, number, number] | null;
  active: boolean;
};

/**
 * E1 — Approche ciné ; hors focus, zoom molette + dérive idle + fog vivant.
 */
export function FocusCamera({ target, active }: FocusCameraProps) {
  const look = useRef(new Vector3(0, 0, 0));
  const desired = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const home = useMemo(() => new Vector3(0, 0, ZOOM_DEFAULT), []);
  const fogBreathAmp = useSkyTheme().scene.idle?.fogBreathAmp ?? 0;

  useFrame((state) => {
    const cam = state.camera;
    const fog = state.scene.fog instanceof Fog ? state.scene.fog : null;

    if (active && target) {
      desired.set(target[0] * 0.68, target[1] * 0.68, 4.05);
      lookTarget.set(target[0] * 0.22, target[1] * 0.22, target[2] * 0.4);
      cam.position.lerp(desired, 0.042);
      look.current.lerp(lookTarget, 0.048);
      cam.lookAt(look.current);
      if (fog) {
        fog.near += (FOCUS_FOG.near - fog.near) * 0.045;
        fog.far += (FOCUS_FOG.far - fog.far) * 0.045;
      }
    } else {
      const idle = idleCameraRef;
      const z = Math.min(
        ZOOM_MAX,
        Math.max(ZOOM_MIN, cameraZoomRef.current + idle.zoomOffset),
      );
      home.set(idle.x, idle.y, z);
      cam.position.lerp(home, 0.045);
      look.current.lerp(
        lookTarget.set(idle.lookX, idle.lookY, 0),
        0.04,
      );
      cam.lookAt(look.current);
      if (fog) {
        const f = fogForZoom(z);
        // Respiration du vide : fog suit zoom idle + breath
        const breath = idle.breath * fogBreathAmp;
        const nearOff = -breath * 0.75 + idle.zoomOffset * 0.22;
        const farOff = breath * 2.2 + idle.zoomOffset * 0.85;
        fog.near += (f.near + nearOff - fog.near) * 0.07;
        fog.far += (f.far + farOff - fog.far) * 0.07;
      }
    }
  });

  return null;
}
