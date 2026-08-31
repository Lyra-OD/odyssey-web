"use client";

type SanctuaryHubHeroProps = {
  prompt: string;
  tapHint: string;
  openLabel: string;
  onOpen: () => void;
};

/**
 * Hero 2D hub idle — pulse CSS, clic ouvre le panneau L'essentiel (Chemin 1).
 */
export function SanctuaryHubHero({
  prompt,
  tapHint,
  openLabel,
  onOpen,
}: SanctuaryHubHeroProps) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[5] flex flex-col items-center justify-center px-6 pb-[18vh] pt-24"
      aria-hidden={false}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={openLabel}
        className="pointer-events-auto group relative flex flex-col items-center gap-5 focus-visible:outline-none"
      >
        <span className="relative flex h-16 w-16 items-center justify-center">
          <span
            className="absolute inset-0 rounded-full bg-teal-400/20 animate-pulse"
            aria-hidden
          />
          <span
            className="absolute inset-2 rounded-full bg-teal-300/15 blur-md transition-opacity duration-500 group-hover:opacity-100"
            aria-hidden
          />
          <span
            className="relative h-3.5 w-3.5 rounded-full bg-teal-200 shadow-[0_0_28px_rgba(94,234,212,0.85),0_0_56px_rgba(45,212,191,0.35)] transition-transform duration-300 group-hover:scale-110"
            aria-hidden
          />
        </span>
        <span className="font-editorial max-w-md text-balance text-center text-xl font-light tracking-wide text-zinc-100/92 md:text-2xl">
          {prompt}
        </span>
        <span className="text-center text-sm font-light tracking-wide text-zinc-400/90">
          {tapHint}
        </span>
      </button>
    </div>
  );
}
