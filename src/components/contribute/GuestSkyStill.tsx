import { GUEST_SKY_STILL_SRC } from "@/src/lib/contribute/guestSkyStill";

/** Ciel invité mobile — image locale plein écran, zéro canvas, clics HTML libres. */
export function GuestSkyStill() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#020202]"
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={GUEST_SKY_STILL_SRC}
        alt=""
        className="absolute left-1/2 top-1/2 h-[118%] w-[118%] max-w-none -translate-x-1/2 -translate-y-[48%] object-cover object-center"
        draggable={false}
      />
      {/* Vignettes légères — lisibilité copy / CTA, sans couper la bande. */}
      <div className="absolute inset-x-0 top-0 h-[14%] bg-gradient-to-b from-black/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-t from-[#020202]/80 to-transparent" />
    </div>
  );
}
