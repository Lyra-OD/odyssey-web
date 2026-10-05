import { editorialFont } from "@/src/lib/fonts";

type DeckSlideOpenProps = {
  tagline: string;
  phase: string;
  bullets: string[];
};

/**
 * Slide 1 — Open (centré).
 * Lumière = ciel GL en fond (DeckClient) ; le rond vidéo reste au sas password.
 * Accent cyan soft (sans halo) : dernière ligne = invitation à scroller.
 * Le halo qui respire (ADN FR) est sur les dots (DeckClient), pas ici.
 */
export function DeckSlideOpen({ tagline, phase, bullets }: DeckSlideOpenProps) {
  return (
    <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-2">
      <p className="font-label relative z-10 text-center text-[0.65rem] uppercase tracking-[0.42em] text-white/50">
        {tagline}
      </p>

      <h2
        className={`${editorialFont.className} relative z-10 mt-12 max-w-[18em] text-center text-[clamp(1.85rem,5.2vw,3.15rem)] font-medium leading-[1.22] tracking-[0.01em] text-white md:mt-14`}
      >
        {phase}
      </h2>

      <ul className="relative z-10 mt-16 flex max-w-lg flex-col gap-4 text-center md:mt-20 md:gap-5">
        {bullets.map((bullet, i) => {
          const isScrollCue = i === bullets.length - 1;
          return (
            <li
              key={bullet}
              className={`font-label text-[0.85rem] font-light leading-relaxed tracking-[0.02em] md:text-[0.95rem] ${
                isScrollCue
                  ? "mt-2 text-[rgba(0,232,240,0.58)]"
                  : "text-zinc-400"
              }`}
            >
              {bullet}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
