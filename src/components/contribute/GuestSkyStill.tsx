import { GUEST_SKY_STILL_SRC } from "@/src/lib/contribute/guestSkyStill";

/** Ciel invité mobile — image locale, zéro canvas, clics HTML libres. */
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
        className="absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
      />
      <div className="absolute left-1/2 top-[46%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-300/15 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-[28%] bg-gradient-to-b from-black/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[44%] bg-gradient-to-t from-[#020202] via-[#020202]/90 to-transparent" />
    </div>
  );
}
