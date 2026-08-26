"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  WIZARD_IDLE_REVEAL_T,
  easeOutCubic,
  firstNameToBirthRevealT,
  WIZARD_REWARD_REVEAL_MS,
} from "@/src/lib/contribute/wizardBirthReveal";

export type WizardStep1RevealPhase = "typing" | "reward" | "done";

const LERP = 0.14;

export function useWizardStep1Reveal(firstName: string) {
  const revealTRef = useRef(WIZARD_IDLE_REVEAL_T);
  const [revealT, setRevealT] = useState(WIZARD_IDLE_REVEAL_T);
  const [phase, setPhase] = useState<WizardStep1RevealPhase>("typing");
  const rewardRafRef = useRef(0);
  const lerpRafRef = useRef(0);

  useEffect(() => {
    if (phase !== "typing") return;
    let running = true;

    const tick = () => {
      if (!running) return;
      const target = firstNameToBirthRevealT(firstName);
      const cur = revealTRef.current;
      const next = cur + (target - cur) * LERP;
      revealTRef.current = next;
      setRevealT((prev) =>
        Math.abs(prev - next) > 0.001 ? next : prev,
      );
      if (Math.abs(target - next) > 0.0008) {
        lerpRafRef.current = requestAnimationFrame(tick);
      }
    };

    lerpRafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(lerpRafRef.current);
    };
  }, [firstName, phase]);

  const playReward = useCallback((): Promise<void> => {
    cancelAnimationFrame(lerpRafRef.current);
    return new Promise((resolve) => {
      setPhase("reward");
      const from = revealTRef.current;
      const t0 = performance.now();

      const tick = (now: number) => {
        const u = Math.min(1, (now - t0) / WIZARD_REWARD_REVEAL_MS);
        const next = from + (1 - from) * easeOutCubic(u);
        revealTRef.current = next;
        setRevealT(next);
        if (u < 1) {
          rewardRafRef.current = requestAnimationFrame(tick);
        } else {
          setPhase("done");
          resolve();
        }
      };

      rewardRafRef.current = requestAnimationFrame(tick);
    });
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rewardRafRef.current);
      cancelAnimationFrame(lerpRafRef.current);
    };
  }, []);

  const hideHeroName = firstName.trim().length < 1;

  return {
    revealT,
    revealTRef,
    phase,
    playReward,
    hideHeroName,
    showGhostSlots: phase === "reward" || phase === "done" || revealT >= 0.55,
  };
}
