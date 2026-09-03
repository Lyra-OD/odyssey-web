"use client";

import type { ReactNode } from "react";

type SanctuaryMonolithProps = {
  children: ReactNode;
  header?: ReactNode;
};

/** Même monolithe que l’étape 1 orga — fond indigo, halo cyan, bord respirant. */
export function SanctuaryMonolith({ children, header }: SanctuaryMonolithProps) {
  return (
    <div className="parcours-monolith-shell pointer-events-none fixed inset-0 z-30 flex items-center justify-center px-4">
      <div className="parcours-monolith-frame pointer-events-auto relative w-full max-w-xl">
        <div className="parcours-monolith-atmosphere" aria-hidden>
          <div className="parcours-monolith-aura-cyan" />
        </div>
        <div className="parcours-monolith-scroll parcours-monolith-glass relative z-[1] w-full px-6 py-7 md:px-8 md:py-9">
          {header ? <div className="mb-6 flex justify-end">{header}</div> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
