"use client";

import { useState } from "react";

import { SanctuaryUniverse } from "@/src/components/contribute/SanctuaryUniverse";
import { useConstellationCraftReveal } from "@/src/components/contribute/constellation/useConstellationCraftReveal";
import { LocaleSwitcher } from "@/src/components/i18n/LocaleSwitcher";
import { sanctuaryGhostButton } from "@/src/lib/contribute/sanctuaryChrome";
import { SANCTUARY_PREVIEW_TRIBUTE } from "@/src/lib/contribute/sanctuaryPreview";
import type { Locale } from "@/i18n.config";

/** Preview `test-ciel` — WebGL only (dev). Hors chemin invité mobile. */
export function SanctuarySkyPreview({ locale }: { locale: Locale }) {
  const [skyOpen, setSkyOpen] = useState(true);
  const { craftReveal, restart } = useConstellationCraftReveal({
    autoPlay: skyOpen,
    heroName: SANCTUARY_PREVIEW_TRIBUTE.firstName,
  });
  const seeSky = locale === "en" ? "See the sky" : "Voir le ciel";
  const whisper =
    locale === "en" ? "The sky is filling" : "Le ciel se remplit";

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100 antialiased">
      <SanctuaryUniverse
        mode={skyOpen ? "immersive" : "background"}
        className={skyOpen ? "fixed inset-0 z-40" : "absolute inset-0 z-0"}
        onClose={skyOpen ? () => setSkyOpen(false) : undefined}
        locale={locale}
        craftReveal={craftReveal}
      />
      <div className="absolute right-4 top-4 z-50 md:right-8 md:top-8">
        <LocaleSwitcher
          lang={locale}
          languageLabel={locale === "en" ? "Language" : "Langue"}
          langOptionFr="FR"
          langOptionEn="EN"
        />
      </div>
      {!skyOpen ? (
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-8 px-6">
          <p className="text-sm font-light uppercase tracking-[0.35em] text-teal-50/35">
            {whisper}
          </p>
          <button
            type="button"
            onClick={() => {
              setSkyOpen(true);
              restart();
            }}
            className={`${sanctuaryGhostButton} px-6 py-3 text-[11px] uppercase tracking-[0.28em]`}
          >
            {seeSky}
          </button>
        </div>
      ) : null}
    </main>
  );
}
