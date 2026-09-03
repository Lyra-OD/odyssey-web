"use client";

import type { ReactNode } from "react";

type SanctuaryMonolithProps = {
  children: ReactNode;
  header?: ReactNode;
  /** Pied collé (ex. checkout + *Non merci*) — reste visible sans scroller. */
  footer?: ReactNode;
};

/** Même monolithe que l’étape 1 orga — fond indigo, halo cyan, bord respirant. */
export function SanctuaryMonolith({
  children,
  header,
  footer,
}: SanctuaryMonolithProps) {
  return (
    <div className="parcours-monolith-shell pointer-events-none fixed inset-0 z-30 flex items-center justify-center px-4">
      <div className="parcours-monolith-frame pointer-events-auto relative w-full max-w-xl">
        <div className="parcours-monolith-atmosphere" aria-hidden>
          <div className="parcours-monolith-aura-cyan" />
        </div>
        <div className="parcours-monolith-scroll parcours-monolith-glass relative z-[1] w-full px-6 py-7 md:px-8 md:py-9">
          {header ? <div className="mb-4">{header}</div> : null}
          {children}
          {footer ? (
            <div className="sticky bottom-0 z-10 -mx-6 mt-4 border-t border-white/10 bg-[rgba(8,6,28,0.96)] px-6 pb-7 pt-3 md:-mx-8 md:px-8 md:pb-9">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
