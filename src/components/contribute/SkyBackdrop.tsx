"use client";

/** Frame 2D Chemin 1 — même asset que craft sky (export lab). */
export const SKY_BACKDROP_IMAGE_SRC = "/craft/sky/milky-way-v1.jpg";

type SkyBackdropProps = {
  className?: string;
};

/**
 * Ciel fixe Traversée — zéro WebGL pendant hub / saisie (T1).
 */
export function SkyBackdrop({ className = "" }: SkyBackdropProps) {
  return (
    <div
      className={[
        "pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#020202]",
        className,
      ].join(" ")}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SKY_BACKDROP_IMAGE_SRC}
        alt=""
        className="absolute inset-0 h-full w-full scale-105 object-cover object-[center_42%]"
        draggable={false}
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/55"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 38%, rgba(94,234,212,0.35) 0%, transparent 42%)",
        }}
        aria-hidden
      />
    </div>
  );
}
