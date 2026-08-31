"use client";

import { useEffect, useRef } from "react";

import { hubStarAnchorRef } from "@/src/components/tribute/hubStarAnchorRef";

type SanctuaryHubHeroProps = {
  openLabel: string;
  onOpen: () => void;
};

/**
 * Hub idle — hit target large (étoile + invite).
 * Position suivie via `hubStarAnchorRef` (DOM direct, zéro setState).
 */
export function SanctuaryHubHero({ openLabel, onOpen }: SanctuaryHubHeroProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    let raf = 0;
    const tick = () => {
      const a = hubStarAnchorRef.current;
      const x = a?.x ?? 50;
      const y = a?.y ?? 48;
      btn.style.left = `${x}%`;
      btn.style.top = `${y}%`;
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
      <button
        ref={buttonRef}
        type="button"
        onClick={onOpen}
        aria-label={openLabel}
        className="pointer-events-auto absolute -translate-x-1/2 -translate-y-[28%] cursor-pointer rounded-[2rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/35"
        style={{
          left: "50%",
          top: "48%",
          width: "min(22rem, 90vw)",
          height: "13.5rem",
        }}
      />
    </div>
  );
}
