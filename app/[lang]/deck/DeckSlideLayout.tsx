import type { ReactNode } from "react";

type DeckSlideLayoutProps = {
  text: ReactNode;
  visual?: ReactNode;
  /** Slide 1 : Mark dans la colonne visuelle desktop. */
  showVisualColumn?: boolean;
};

/**
 * Composition T5 — desktop split (texte | visual), mobile stack.
 * Breakpoint aligné sas/player : `lg` (1024).
 */
export function DeckSlideLayout({
  text,
  visual,
  showVisualColumn = true,
}: DeckSlideLayoutProps) {
  return (
    <div className="mx-auto grid w-full max-w-[72rem] grid-cols-1 items-center gap-10 px-6 py-20 lg:grid-cols-12 lg:gap-14 lg:px-10 lg:py-16 xl:px-12">
      <div
        className={`flex flex-col items-center text-center lg:col-span-7 lg:items-start lg:text-left ${
          showVisualColumn ? "" : "lg:col-span-10 lg:col-start-2"
        }`}
      >
        {text}
      </div>

      {showVisualColumn ? (
        <div className="relative flex min-h-[12rem] items-center justify-center lg:col-span-5 lg:min-h-[22rem]">
          {visual ?? (
            <div
              aria-hidden
              className="hidden h-full w-full max-w-md rounded-sm border border-white/[0.06] bg-white/[0.02] lg:block"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
