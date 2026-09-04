"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  WIZARD_IDLE_REVEAL_T,
  firstNameToBirthRevealT,
  WIZARD_REWARD_DWELL_MS,
  WIZARD_REWARD_REVEAL_MS,
  mapWizardRewardWallToRevealT,
} from "@/src/lib/contribute/wizardBirthReveal";

export type WizardStep1RevealPhase = "typing" | "reward" | "done";

/**
 * Architecture « vrai final » :
 * - Panneau saisie (typing) → ciel gelé (`skyActive=false`) — confort frappe.
 * - Rituel Continuer (reward/done) → ciel réveillé pour le play A→F.
 * - Snap prénom (pas de lerp WebGL) — une paint via wakeKey Canvas suffit.
 */
export function useWizardStep1Reveal(
  firstName: string,
  options?: { muteFirstNameSnap?: boolean },
) {
  const revealTRef = useRef(WIZARD_IDLE_REVEAL_T);
  const [revealT, setRevealT] = useState(WIZARD_IDLE_REVEAL_T);
  const [phase, setPhase] = useState<WizardStep1RevealPhase>("typing");
  const rewardRafRef = useRef(0);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase !== "typing" || options?.muteFirstNameSnap) return;
    const target = firstNameToBirthRevealT(firstName);
    revealTRef.current = target;
    setRevealT(target);
  }, [firstName, phase, options?.muteFirstNameSnap]);

  /** Play + admiration : ciel vivant (parallax, filantes). Formulaire = gel JPEG. */
  const skyActive = phase === "reward" || phase === "done";

  const playReward = useCallback((): Promise<void> => {
    cancelAnimationFrame(rewardRafRef.current);
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    return new Promise((resolve) => {
      setPhase("reward");
      // Timeline complète 0→1 (pas depuis idle 0.56). Horloge wizard remappée.
      revealTRef.current = 0;
      setRevealT(0);
      const t0 = performance.now();

      const tick = (now: number) => {
        const wall = Math.min(1, (now - t0) / WIZARD_REWARD_REVEAL_MS);
        const reveal = mapWizardRewardWallToRevealT(wall);
        revealTRef.current = reveal;
        /**
         * Aucun setState pendant le play : le Canvas lit `revealTRef` à chaque
         * frame et resynchronise son propre state. Publier le reveal ici
         * re-rendait tout le monolithe wizard 10×/s et recréait l'objet
         * craftReveal, donc toute la scène 3D, pendant l'animation.
         */
        if (wall < 1) {
          rewardRafRef.current = requestAnimationFrame(tick);
        } else {
          revealTRef.current = 1;
          setRevealT(1);
          setPhase("done");
          dwellTimerRef.current = setTimeout(() => {
            dwellTimerRef.current = null;
            resolve();
          }, WIZARD_REWARD_DWELL_MS);
        }
      };

      rewardRafRef.current = requestAnimationFrame(tick);
    });
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rewardRafRef.current);
      if (dwellTimerRef.current) clearTimeout(dwellTimerRef.current);
    };
  }, []);

  const hideHeroName = firstName.trim().length < 1;

  /** P0 — revenir à la saisie Essentiels (après reveal / typo). */
  const resumeTyping = useCallback(() => {
    cancelAnimationFrame(rewardRafRef.current);
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    const target = firstNameToBirthRevealT(firstName);
    revealTRef.current = target;
    setRevealT(target);
    setPhase("typing");
  }, [firstName]);

  /** P0 — soft-close Essentiels → constellation settled (hub.postReveal). */
  const settlePostReveal = useCallback(() => {
    cancelAnimationFrame(rewardRafRef.current);
    if (dwellTimerRef.current) {
      clearTimeout(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    revealTRef.current = 1;
    setRevealT(1);
    setPhase("done");
  }, []);

  return {
    revealT,
    revealTRef,
    phase,
    playReward,
    resumeTyping,
    settlePostReveal,
    hideHeroName,
    skyActive,
    showGhostSlots: phase === "reward" || phase === "done" || revealT >= 0.55,
  };
}
