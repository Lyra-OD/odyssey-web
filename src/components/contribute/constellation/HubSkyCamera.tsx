"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Fog, Vector3 } from "three";

import { heroWorldPos } from "@/src/components/contribute/constellation/graphs/revealCamera";
import { idleCameraRef } from "./IdleCameraDrift";
import { skyWanderRef } from "./SkyWander";
import {
  cameraZoomRef,
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
} from "./WheelZoom";
import { useSkyTheme } from "./skyTheme";

/** FocusCamera cède pendant le drive hub. */
export const hubSkyCameraDriveRef = { active: false };

/** 0→1 — progression dolly hub (lu par Constellation birth). */
export const hubSkyApproachRef = { current: 0 };

/** Arrivée test-ciel (constellation off) → dolly léger vers Hero. */
const HUB_APPROACH_MS = 2800;
const HUB_CAM_Z_END = 5.15;
/** Remonte le regard pour centrer l’étoile à l’écran (pas le slot prénom). */
const HUB_LOOK_Y_LIFT = 0.22;

function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

function fogForZoom(camZ: number) {
  return { near: camZ + 3.5, far: camZ + 18 };
}

type HubSkyCameraProps = {
  enabled: boolean;
  graphScale?: number;
};

/**
 * Chemin 1 hub — plan « ciel seul » (test-ciel constellation masquée) puis zoom
 * vers l’étoile Hero. Remplace RevealCamera @ KEEP prénom.
 */
export function HubSkyCamera({ enabled, graphScale = 1 }: HubSkyCameraProps) {
  const startAtRef = useRef<number | null>(null);
  const look = useRef(new Vector3(0, 0, 0));
  const desired = useRef(new Vector3(0, 0, ZOOM_DEFAULT));
  const lookTarget = useRef(new Vector3(0, 0, 0));
  const fogBreathAmp = useSkyTheme().scene.idle?.fogBreathAmp ?? 0;

  useEffect(() => {
    if (!enabled) {
      startAtRef.current = null;
      hubSkyCameraDriveRef.active = false;
      hubSkyApproachRef.current = 0;
      return;
    }
    startAtRef.current = null;
    cameraZoomRef.current = ZOOM_DEFAULT;
    hubSkyApproachRef.current = 0;
  }, [enabled]);

  useFrame((state) => {
    if (!enabled) {
      hubSkyCameraDriveRef.active = false;
      hubSkyApproachRef.current = 0;
      return;
    }
    hubSkyCameraDriveRef.active = true;

    const now = performance.now();
    if (startAtRef.current == null) startAtRef.current = now;
    const u = easeOutCubic(
      Math.min(1, (now - startAtRef.current) / HUB_APPROACH_MS),
    );
    hubSkyApproachRef.current = u;

    const hero = heroWorldPos(graphScale);
    const endLookX = hero.x;
    const endLookY = hero.y + HUB_LOOK_Y_LIFT * graphScale;
    const endLookZ = hero.z;

    const wx = skyWanderRef.x;
    const wy = skyWanderRef.y;
    const idle = idleCameraRef;

    const skyLookX = wx + idle.lookX;
    const skyLookY = wy + idle.lookY;
    const skyZ = Math.min(
      ZOOM_MAX,
      Math.max(ZOOM_MIN, ZOOM_DEFAULT + idle.zoomOffset),
    );

    const lookX = skyLookX + (endLookX - skyLookX) * u;
    const lookY = skyLookY + (endLookY - skyLookY) * u;
    const lookZ = endLookZ * u;
    const camZ = skyZ + (HUB_CAM_Z_END - skyZ) * u;

    desired.current.set(wx + idle.x, wy + idle.y, camZ);
    lookTarget.current.set(lookX, lookY, lookZ);

    const cam = state.camera;
    const follow = u < 0.015 ? 1 : 0.045;
    cam.position.lerp(desired.current, follow);
    look.current.lerp(lookTarget.current, follow * 1.05);
    cam.lookAt(look.current);

    cameraZoomRef.current = camZ;

    const fog = state.scene.fog instanceof Fog ? state.scene.fog : null;
    if (fog) {
      const f = fogForZoom(camZ);
      const breath = idle.breath * fogBreathAmp;
      const nearOff = -breath * 0.75 + idle.zoomOffset * 0.22;
      const farOff = breath * 2.2 + idle.zoomOffset * 0.85;
      fog.near += (f.near + nearOff - fog.near) * 0.07;
      fog.far += (f.far + farOff - fog.far) * 0.07;
    }
  });

  return null;
}
