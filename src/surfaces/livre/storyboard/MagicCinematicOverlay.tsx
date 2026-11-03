"use client";

import { memo } from "react";

import {
  MAGIC_CAPSULE_BREATHE_MS,
  MAGIC_CAPSULE_ENTER_MS,
  MAGIC_DEPTH_SCRIM_ENTER_MS,
  MAGIC_OVERLAY_EXIT_MS,
} from "@/src/lib/wizard/storyboardMagicTimeline";
import type { MagicCinematicPhase } from "@/src/lib/wizard/magicTimelinePlayer";

export type MagicCinematicOverlayCopy = {
  message: string;
};

type Props = {
  phase: MagicCinematicPhase;
  message: string;
};

export const MagicCinematicOverlay = memo(function MagicCinematicOverlay({
  phase,
  message,
}: Props) {
  if (phase === "idle") return null;

  const isExiting = phase === "exiting";
  const exitDuration = `${MAGIC_OVERLAY_EXIT_MS}ms`;
  const breatheDuration = `${MAGIC_CAPSULE_BREATHE_MS}ms`;

  return (
    <>
      <div
        className={`magic-depth-scrim ${isExiting ? "is-exiting" : ""}`}
        style={{
          animationDuration: isExiting
            ? undefined
            : `${MAGIC_DEPTH_SCRIM_ENTER_MS}ms`,
          transitionDuration: exitDuration,
        }}
        aria-hidden
      >
        <div className="magic-depth-scrim__vignette" />
        <div className="magic-depth-scrim__blur" />
      </div>

      <div
        className="pointer-events-none fixed inset-0 z-[76]"
        aria-live="polite"
        aria-busy={!isExiting}
      >
        <div
          className="absolute left-1/2 top-[38vh] -translate-x-1/2"
          style={{ contain: "layout style paint" }}
        >
        <div
          className={`magic-capsule-enter relative ${isExiting ? "is-exiting" : ""}`}
          style={{
            transitionDuration: exitDuration,
            animationDuration: isExiting
              ? undefined
              : `${MAGIC_CAPSULE_ENTER_MS}ms`,
          }}
        >
          <div
            className="magic-capsule-spotlight absolute -inset-x-5 -inset-y-4 rounded-2xl bg-black/60"
            aria-hidden
          />

          <div
            className="magic-capsule-frame relative z-[1] inline-flex max-w-[min(92vw,24rem)] items-center justify-center rounded-lg border border-[var(--salon-cyan)] bg-white/[0.06] px-8 py-3.5"
            style={{ animationDuration: breatheDuration }}
          >
            <span
              className="magic-capsule-text text-center text-[11px] font-semibold uppercase leading-relaxed tracking-[0.28em] text-[var(--salon-cyan)]"
              style={{ animationDuration: breatheDuration }}
            >
              {message}
            </span>
          </div>
        </div>
        </div>
      </div>
    </>
  );
});
