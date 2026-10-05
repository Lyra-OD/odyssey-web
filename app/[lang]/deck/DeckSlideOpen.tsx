import { editorialFont } from "@/src/lib/fonts";
import { GUEST_SKY_STILL_SRC } from "@/src/lib/contribute/guestSkyStill";

type DeckSlideOpenProps = {
  tagline: string;
  phase: string;
  bullets: string[];
};

/**
 * Slide 1 — Open (centré, pas de split).
 * Job : question élégante + lumière. Mark = chrome sticky.
 */
export function DeckSlideOpen({ tagline, phase, bullets }: DeckSlideOpenProps) {
  return (
    <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-2">
      {/* Ciel — plus présent, vignette douce (pas un tunnel noir) */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[42%] z-0 h-[min(78vh,38rem)] w-[min(140%,52rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={GUEST_SKY_STILL_SRC}
          alt=""
          className="h-full w-full scale-105 object-cover object-center opacity-55"
          draggable={false}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(2,2,2,0.15)_0%,rgba(2,2,2,0.55)_55%,#020202_88%)]" />
      </div>

      <p className="font-label relative z-10 text-center text-[0.65rem] uppercase tracking-[0.42em] text-white/45">
        {tagline}
      </p>

      <h2
        className={`${editorialFont.className} relative z-10 mt-12 max-w-[18em] text-center text-[clamp(1.85rem,5.2vw,3.15rem)] font-medium leading-[1.22] tracking-[0.01em] text-white md:mt-14`}
      >
        {phase}
      </h2>

      <ul className="relative z-10 mt-16 flex max-w-lg flex-col gap-4 text-center md:mt-18 md:gap-5">
        {bullets.map((bullet) => (
          <li
            key={bullet}
            className="font-label text-[0.85rem] font-light leading-relaxed tracking-[0.02em] text-zinc-400 md:text-[0.95rem]"
          >
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}
