"use client";

export type SkyBackdropCloseRitual =
  | "idle"
  | "inspire"
  | "collapse"
  | "hold";

type SkyBackdropProps = {
  className?: string;
  /** Gel — capture data URL de la session · null = void (aucune image d'archive). */
  src?: string | null;
  /** 0–1 — fondu crossfade hub WebGL ↔ gel 2D (T1b). */
  opacity?: number;
  /** T-close-5a — opacité live via CSS var (rituel close, sans re-render). */
  liveOpacityVar?: string;
  /** Durée crossfade (A/D). */
  durationMs?: number;
  /** Courbe CSS — KEEP thaw = `HUB_THAW_APPEAR_EASE_CSS`. */
  easing?: string;
  /** T2–T3 — inspire stellaire puis relâche pendant collapse. */
  closeRitual?: SkyBackdropCloseRitual;
};

/**
 * Ciel fixe Traversée — image gelée pendant saisie panneau (zéro WebGL sous champs).
 * Cadrage centre (aligné HubSkyCamera) — pas de scale crop.
 */
export function SkyBackdrop({
  className = "",
  src,
  opacity = 1,
  liveOpacityVar,
  durationMs = 560,
  easing = "cubic-bezier(0.4, 0, 0.2, 1)",
  closeRitual = "idle",
}: SkyBackdropProps) {
  const ritualClass =
    closeRitual === "inspire"
      ? "parcours-backdrop-ritual-inspire"
      : closeRitual === "collapse" || closeRitual === "hold"
        ? "parcours-backdrop-ritual-collapse"
        : "";
  const resolvedOpacity = liveOpacityVar
    ? (`var(${liveOpacityVar}, ${opacity})` as const)
    : opacity;
  return (
    <div
      className={[
        "pointer-events-none fixed inset-0 z-[1] overflow-hidden bg-[#020202] transition-opacity",
        !liveOpacityVar && opacity < 0.02 ? "opacity-0" : "opacity-100",
        ritualClass,
        className,
      ].join(" ")}
      style={{
        transitionDuration: `${durationMs}ms`,
        transitionTimingFunction: easing,
        opacity: resolvedOpacity,
      }}
      aria-hidden
    >
      {/** Sans capture on reste sur le void : jamais le ciel d'une autre session. */}
      {src ? (
        <div className="parcours-backdrop-media absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            draggable={false}
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45"
            aria-hidden
          />
        </div>
      ) : null}
    </div>
  );
}
