"use client";

import { useEffect, useRef } from "react";

import { hubSkyApproachRef } from "@/src/components/contribute/constellation/HubSkyCamera";
import { HubInviteLabels } from "@/src/components/tribute/HubInviteArcs";
import { hubStarAnchorRef } from "@/src/components/tribute/hubStarAnchorRef";
import { hubFreezeFxRef } from "@/src/lib/parcours/hubFreezeTimeline";

type SanctuaryHubHeroProps = {
  openLabel: string;
  onOpen: () => void;
  prompt?: string;
  tapHint?: string;
};

/**
 * Hub idle — hit target + invite DOM (Option C) suivis via refs (zéro setState).
 */
export function SanctuaryHubHero({
  openLabel,
  onOpen,
  prompt,
  tapHint,
}: SanctuaryHubHeroProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLParagraphElement>(null);
  const tapRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    let raf = 0;
    const tick = () => {
      const a = hubStarAnchorRef.current;
      const x = a?.x ?? 50;
      const y = a?.y ?? 48;
      shell.style.left = `${x}%`;
      shell.style.top = `${y}%`;

      const approach = hubSkyApproachRef.current;
      const inviteMul = hubFreezeFxRef.inviteMul;
      const tapU = Math.min(1, Math.max(0, (approach - 0.5) / 0.42));
      const promptEl = promptRef.current;
      const tapEl = tapRef.current;
      if (promptEl) {
        promptEl.style.opacity = String(0.4 * inviteMul);
      }
      if (tapEl) {
        const breath =
          1 + 0.04 * tapU * Math.sin(performance.now() * 0.00185);
        tapEl.style.opacity = String(0.8 * tapU * inviteMul);
        tapEl.style.transform = `scale(${breath.toFixed(4)})`;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-20"
      aria-hidden={false}
    >
      <div
        ref={shellRef}
        className="absolute flex -translate-x-1/2 -translate-y-[28%] flex-col items-center justify-between"
        style={{
          left: "50%",
          top: "48%",
          width: "min(22rem, 90vw)",
          height: "13.5rem",
        }}
      >
        {prompt ? (
          <HubInviteLabels
            prompt={prompt}
            tapHint={tapHint}
            promptRef={promptRef}
            tapRef={tapRef}
          />
        ) : null}
        <button
          type="button"
          onClick={onOpen}
          aria-label={openLabel}
          className="pointer-events-auto absolute inset-0 cursor-pointer rounded-[2rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/35"
        />
      </div>
    </div>
  );
}
