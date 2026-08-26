"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Fog, Vector3 } from "three";

import { resolveRevealCamera } from "@/src/components/contribute/constellation/graphs/revealCamera";

/** FocusCamera yields while this is true. */
export const revealCameraDriveRef = { active: false };

type RevealCameraProps = {
  enabled: boolean;
  revealT: number;
  revealTRef?: { current: number };
  graphScale?: number;
};

/**
 * Single clock with birth/draw: tight on Hero+name → pull-back to Leo.
 * Snaps when play restarts (t≈0 or big scrub jump).
 */
export function RevealCamera({
  enabled,
  revealT,
  revealTRef,
  graphScale = 1,
}: RevealCameraProps) {
  const look = useRef(new Vector3());
  const desired = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const lastT = useRef(revealT);

  useFrame((state) => {
    if (!enabled) {
      revealCameraDriveRef.active = false;
      return;
    }

    const t = Math.min(1, Math.max(0, revealTRef?.current ?? revealT));
    revealCameraDriveRef.active = true;

    const pose = resolveRevealCamera(t, graphScale);
    const prev = lastT.current;
    const jumped = Math.abs(t - prev) > 0.18;
    const restart = t < 0.025 && prev > 0.08;
    lastT.current = t;

    desired.set(pose.camX, pose.camY, pose.camZ);
    lookTarget.set(pose.lookX, pose.lookY, pose.lookZ);

    const cam = state.camera;
    if (jumped || restart || t < 0.02) {
      cam.position.copy(desired);
      look.current.copy(lookTarget);
    } else {
      // Tight birth = stable; pull-back = smooth follow
      const follow = 0.028 + pose.pull * 0.035;
      cam.position.lerp(desired, follow);
      look.current.lerp(lookTarget, follow * 1.05);
    }
    cam.lookAt(look.current);

    const fog = state.scene.fog instanceof Fog ? state.scene.fog : null;
    if (fog) {
      const near = pose.camZ * 0.55;
      const far = pose.camZ + 10 + pose.pull * 6;
      fog.near += (near - fog.near) * 0.06;
      fog.far += (far - fog.far) * 0.06;
    }
  });

  return null;
}
