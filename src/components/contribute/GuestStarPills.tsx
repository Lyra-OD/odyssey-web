"use client";

import { motion } from "framer-motion";

import { EASE_OUT_LUXE } from "@/src/lib/motion/easing";

export type GuestStarStub = {
  id: string;
  label: string;
};

type GuestStarPillsProps = {
  stars: readonly GuestStarStub[];
  ariaLabelFor: (name: string) => string;
  className?: string;
  /** Id de l’étoile qui se greffe depuis le Hero (stub 2D — Phase 2 = rails WebGL). */
  graftingId?: string | null;
};

const HERO = { x: 50, y: 36 };

function starTarget(index: number): { left: number; top: number } {
  const angle = (-32 + index * 28) * (Math.PI / 180);
  const radius = 15 + Math.min(index, 4) * 3.2;
  return {
    left: HERO.x + Math.cos(angle) * radius,
    top: HERO.y + Math.sin(angle) * radius * 0.58,
  };
}

/** Stub HTML démo 10 sept — pastille + prénom + filament CSS depuis le Hero. */
export function GuestStarPills({
  stars,
  ariaLabelFor,
  className = "",
  graftingId = null,
}: GuestStarPillsProps) {
  if (stars.length === 0) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 overflow-visible ${className}`}
    >
      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden
      >
        {stars.map((star, index) => {
          const target = starTarget(index);
          const grafting = star.id === graftingId;
          return (
            <line
              key={`fil-${star.id}`}
              className={
                grafting ? "guest-star-filament" : "guest-star-filament-settled"
              }
              x1={`${HERO.x}%`}
              y1={`${HERO.y}%`}
              x2={`${target.left}%`}
              y2={`${target.top}%`}
              stroke="rgba(0, 232, 240, 0.55)"
              strokeWidth="1.15"
              pathLength={1}
            />
          );
        })}
      </svg>
      <ul className="absolute inset-0">
        {stars.map((star, index) => {
          const target = starTarget(index);
          const grafting = star.id === graftingId;
          return (
            <motion.li
              key={star.id}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
              initial={
                grafting
                  ? { left: `${HERO.x}%`, top: `${HERO.y}%`, scale: 0.15, opacity: 0 }
                  : { left: `${target.left}%`, top: `${target.top}%`, scale: 1, opacity: 1 }
              }
              animate={{
                left: `${target.left}%`,
                top: `${target.top}%`,
                scale: 1,
                opacity: 1,
              }}
              transition={{
                duration: grafting ? 1.15 : 0,
                delay: grafting ? 0.08 : 0,
                ease: EASE_OUT_LUXE,
              }}
            >
              <span
                className="h-3 w-3 rounded-full bg-cyan-100 shadow-[0_0_18px_rgba(0,232,240,1),0_0_36px_rgba(45,212,191,0.55)]"
                aria-hidden
              />
              <span
                className="font-editorial text-[11px] font-medium tracking-wide text-white/90 [text-shadow:0_0_18px_rgba(0,232,240,0.45)] md:text-xs"
                aria-label={ariaLabelFor(star.label)}
              >
                {star.label}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
