import type { ReactNode } from "react";

type OdysseyLuminousTextProps = {
  children: ReactNode;
  className?: string;
  /** `mark` = emblème connexion · `soft` = titres éditoriaux (glow atténué). */
  variant?: "mark" | "soft";
};

/** Blanc lumineux emblème — accroches courtes et libellés CTA marketing (§3.1bis). */
export function OdysseyLuminousText({
  children,
  className = "",
  variant = "mark",
}: OdysseyLuminousTextProps) {
  if (variant === "soft") {
    return (
      <span
        className={`relative inline-block text-white [text-shadow:0_0_10px_rgba(255,255,255,0.32),0_0_18px_rgba(255,255,255,0.08)] ${className}`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 select-none text-white opacity-25 blur-[3px]"
        >
          {children}
        </span>
        <span className="relative">{children}</span>
      </span>
    );
  }

  return (
    <span
      className={`odyssey-connexion-mark relative inline-block text-white ${className}`}
    >
      <span aria-hidden className="odyssey-connexion-mark-glow select-none">
        {children}
      </span>
      <span className="relative">{children}</span>
    </span>
  );
}
