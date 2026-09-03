"use client";

import type { ReactNode } from "react";

type SanctuaryMonolithProps = {
  children: ReactNode;
  header?: ReactNode;
  /** Pied hors scroll (ex. checkout + *Non merci*) — visible, le form ne passe pas dessous. */
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
        <div className="parcours-monolith-glass parcours-monolith-card relative z-[1] w-full">
          <div className="parcours-monolith-scroll min-h-0 flex-1 px-4 py-5 sm:px-6 sm:py-7 md:px-8 md:py-9">
            {header ? <div className="mb-4">{header}</div> : null}
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t border-white/10 px-4 pb-5 pt-3 sm:px-6 sm:pb-7 md:px-8 md:pb-9">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
