"use client";

/** Frame 2D Chemin 1 — gel hub (≠ panorama lab `milky-way-v1`). */
export const SKY_BACKDROP_IMAGE_SRC = "/craft/sky/hub-freeze-v1.jpg";

type SkyBackdropProps = {
  className?: string;
  /** 0–1 — fondu crossfade hub WebGL ↔ gel 2D (T1b). */
  opacity?: number;
  /** Durée crossfade (A/D). */
  durationMs?: number;
  /** Courbe CSS — KEEP thaw = `HUB_THAW_APPEAR_EASE_CSS`. */
  easing?: string;
};

/**
 * Ciel fixe Traversée — image gelée pendant saisie panneau (zéro WebGL sous champs).
 * Cadrage centre (aligné HubSkyCamera) — pas de scale crop.
 */
export function SkyBackdrop({
  className = "",
  opacity = 1,
  durationMs = 560,
  easing = "cubic-bezier(0.4, 0, 0.2, 1)",
}: SkyBackdropProps) {
  return (
    <div
      className={[
        "pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#020202] transition-opacity",
        opacity < 0.02 ? "opacity-0" : "opacity-100",
        className,
      ].join(" ")}
      style={{
        transitionDuration: `${durationMs}ms`,
        transitionTimingFunction: easing,
        opacity,
      }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SKY_BACKDROP_IMAGE_SRC}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45"
        aria-hidden
      />
    </div>
  );
}
