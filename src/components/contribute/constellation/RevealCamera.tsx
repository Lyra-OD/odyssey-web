"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Fog, Vector3 } from "three";

import { resolveBirth } from "@/src/components/contribute/constellation/graphs/birth";
import { resolveRevealCamera } from "@/src/components/contribute/constellation/graphs/revealCamera";
import { ACTIVE_TEMPLATE } from "@/src/components/contribute/constellation/graphs/resolveConstellation";
import type { ConstellationTemplate } from "@/src/components/contribute/constellation/graphs/types";

/** FocusCamera yields while this is true. */
export const revealCameraDriveRef = { active: false };

type RevealCameraProps = {
  enabled: boolean;
  revealT: number;
  revealTRef?: { current: number };
  graphScale?: number;
  /** Template actif (Leo / Libra / …) — cadre Hero + bbox. */
  template?: ConstellationTemplate;
};

/**
 * Single clock with birth/draw: tight on Hero+name → pull-back silhouette.
 * Snaps when play restarts (t≈0 or big scrub jump).
 */
export function RevealCamera({
  enabled,
  revealT,
  revealTRef,
  graphScale = 1,
  template = ACTIVE_TEMPLATE,
}: RevealCameraProps) {
  const look = useRef(new Vector3());
  const desired = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const lastT = useRef(revealT);
  const templateRef = useRef(template);
  templateRef.current = template;

  useFrame((state) => {
    if (!enabled) {
      revealCameraDriveRef.active = false;
      return;
    }

    const t = Math.min(1, Math.max(0, revealTRef?.current ?? revealT));
    revealCameraDriveRef.active = true;

    const pose = resolveRevealCamera(
      t,
      graphScale,
      resolveBirth(t).drawU,
      templateRef.current,
    );
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
      const follow = 0.032 + pose.pull * 0.048 + (pose.pull < 0.35 ? 0.022 : 0);
      cam.position.lerp(desired, follow);
      look.current.lerp(lookTarget, follow * 1.08);
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
