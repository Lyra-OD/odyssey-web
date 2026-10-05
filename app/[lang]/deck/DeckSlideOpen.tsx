import { editorialFont } from "@/src/lib/fonts";
import { GUEST_SKY_STILL_SRC } from "@/src/lib/contribute/guestSkyStill";

type DeckSlideOpenProps = {
  tagline: string;
  phase: string;
  bullets: string[];
};

/**
 * Slide 1 — Open.
 * Job : « Ce n’est pas un pitch SaaS. Reste. »
 * Question = héros. Mark déjà en chrome sticky. Bullets secondaires.
 */
export function DeckSlideOpen({ tagline, phase, bullets }: DeckSlideOpenProps) {
  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-2">
      {/* Breath ciel — très soft, derrière la question seulement */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(70vh,32rem)] w-[min(110%,40rem)] -translate-x-1/2 -translate-y-[42%] overflow-hidden opacity-[0.18]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={GUEST_SKY_STILL_SRC}
          alt=""
          className="h-full w-full scale-110 object-cover object-center"
          draggable={false}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#020202_78%)]" />
      </div>

      <p className="font-label relative z-10 text-center text-[0.65rem] uppercase tracking-[0.4em] text-white/30">
        {tagline}
      </p>

      <h2
        className={`${editorialFont.className} relative z-10 mt-10 max-w-[22ch] text-center text-[clamp(1.65rem,4.8vw,2.85rem)] font-medium leading-[1.25] tracking-[0.02em] text-zinc-50 md:mt-12`}
      >
        {phase}
      </h2>

      <ul className="relative z-10 mt-16 flex max-w-md flex-col gap-5 text-center md:mt-20">
        {bullets.map((bullet) => (
          <li
            key={bullet}
            className="font-label text-[0.8rem] font-light leading-relaxed tracking-[0.02em] text-white/40 md:text-sm"
          >
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}
