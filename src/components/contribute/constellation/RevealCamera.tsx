"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Fog, PerspectiveCamera, Vector3 } from "three";

import { resolveBirth } from "@/src/components/contribute/constellation/graphs/birth";
import { resolveRevealCamera } from "@/src/components/contribute/constellation/graphs/revealCamera";
import type { LeoStrokeStep } from "@/src/components/contribute/constellation/graphs/leo";
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
  /** Ordre des traits — cadre la portion déjà tracée. */
  strokeSequence?: readonly LeoStrokeStep[];
  strokeOverlap?: number;
  /**
   * Caméra sur l’axe du look (X/Y = look). Sans ça, cam à x=0 qui vise le Hero
   * décale l’atome (z plus près) à droite du prénom Html (z=0).
   */
  lockLookAxis?: boolean;
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
  strokeSequence,
  strokeOverlap,
  lockLookAxis = false,
}: RevealCameraProps) {
  const look = useRef(new Vector3());
  const desired = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3(), []);
  const lastT = useRef(revealT);
  const booted = useRef(false);
  const templateRef = useRef(template);
  templateRef.current = template;
  const sequenceRef = useRef(strokeSequence);
  sequenceRef.current = strokeSequence;

  useFrame((state) => {
    if (!enabled) {
      revealCameraDriveRef.active = false;
      booted.current = false;
      return;
    }

    const t = Math.min(1, Math.max(0, revealTRef?.current ?? revealT));
    revealCameraDriveRef.active = true;

    const cam = state.camera;
    const perspective =
      cam instanceof PerspectiveCamera
        ? { fov: cam.fov, aspect: cam.aspect }
        : undefined;
    const pose = resolveRevealCamera(
      t,
      graphScale,
      resolveBirth(t).drawU,
      templateRef.current,
      perspective,
      sequenceRef.current,
      strokeOverlap,
    );
    const prev = lastT.current;
    const jumped = Math.abs(t - prev) > 0.18;
    const restart = t < 0.025 && prev > 0.08;
    lastT.current = t;

    desired.set(
      lockLookAxis ? pose.lookX : pose.camX,
      lockLookAxis ? pose.lookY : pose.camY,
      pose.camZ,
    );
    lookTarget.set(pose.lookX, pose.lookY, pose.lookZ);

    /** Premier frame : snap. Sinon KEEP invité (t=0.72) lerp depuis l’origine → Hero à gauche. */
    if (!booted.current || jumped || restart || t < 0.02) {
      booted.current = true;
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
