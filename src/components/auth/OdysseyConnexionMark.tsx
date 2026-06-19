type OdysseyConnexionMarkProps = {
  wordmark: string;
  animate?: boolean;
  className?: string;
};

/** Wordmark connexion — Montserrat espacé, blanc pur lumineux, centré ~70–75 % du form. */
export function OdysseyConnexionMark({
  wordmark,
  animate = true,
  className = "",
}: OdysseyConnexionMarkProps) {
  return (
    <div
      className={`flex w-full justify-center ${className}`}
      aria-label={wordmark}
    >
      <span
        className={`odyssey-connexion-mark relative inline-block font-brand text-[clamp(1.25rem,4.2vw,2rem)] font-light uppercase leading-none tracking-[0.52em] text-white sm:tracking-[0.58em] md:tracking-[0.62em] lg:text-[2.0625rem] lg:tracking-[0.64em] ${animate ? "odyssey-connexion-mark-reveal" : ""}`}
      >
        <span aria-hidden className="odyssey-connexion-mark-glow select-none">
          {wordmark}
        </span>
        <span className="relative">{wordmark}</span>
      </span>
    </div>
  );
}
