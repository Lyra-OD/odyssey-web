"use client";

import { useEffect, useRef } from "react";

import {
  HUB_INVITE_HIT_HEIGHT_REM,
  HUB_INVITE_HIT_OFFSET_REM,
  HUB_STAR_HIT_REM,
  hubStarAnchorRef,
  noteHubInviteHover,
  resetHubInviteHover,
} from "@/src/components/tribute/hubStarAnchorRef";

type SanctuaryHubHeroProps = {
  openLabel: string;
  onOpen: () => void;
};

const hitClass =
  "pointer-events-auto absolute cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/35";

/**
 * Hub idle — deux hits (étoile · invite), même ouverture Essentiels.
 * Position suivie via `hubStarAnchorRef` (DOM direct, zéro setState).
 * Hover → `hubInviteHoverRef` (glow CTA). Le ciel reste sur le pointer fenêtre.
 */
export function SanctuaryHubHero({ openLabel, onOpen }: SanctuaryHubHeroProps) {
  const starRef = useRef<HTMLButtonElement>(null);
  const inviteRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const star = starRef.current;
    const invite = inviteRef.current;
    if (!star || !invite) return;
    let raf = 0;
    const tick = () => {
      const a = hubStarAnchorRef.current;
      const x = `${a?.x ?? 50}%`;
      const y = `${a?.y ?? 48}%`;
      star.style.left = x;
      star.style.top = y;
      invite.style.left = x;
      invite.style.top = y;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      resetHubInviteHover();
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-20"
      aria-hidden={false}
    >
      <button
        ref={starRef}
        type="button"
        onClick={onOpen}
        onPointerEnter={() => noteHubInviteHover(1)}
        onPointerLeave={() => noteHubInviteHover(-1)}
        aria-label={openLabel}
        className={`${hitClass} -translate-x-1/2 -translate-y-1/2 rounded-full`}
        style={{
          left: "50%",
          top: "48%",
          width: `${HUB_STAR_HIT_REM}rem`,
          height: `${HUB_STAR_HIT_REM}rem`,
        }}
      />
      <button
        ref={inviteRef}
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onOpen}
        onPointerEnter={() => noteHubInviteHover(1)}
        onPointerLeave={() => noteHubInviteHover(-1)}
        className={`${hitClass} rounded-[2rem]`}
        style={{
          left: "50%",
          top: "48%",
          width: "min(22rem, 90vw)",
          height: `${HUB_INVITE_HIT_HEIGHT_REM}rem`,
          transform: `translate(-50%, ${HUB_INVITE_HIT_OFFSET_REM}rem)`,
        }}
      />
    </div>
  );
}
