"use client";

import Link from "next/link";

import { OdysseyEclipseMark } from "@/src/components/contribute/OdysseyEclipseMark";
import { ECLIPSE_LOGO_RECIPE } from "@/src/components/contribute/constellation/eclipseLogoRecipe";

type Locale = "fr" | "en";

/**
 * Preview marque Eclipse — recette figée, animée via Vie.
 * `/fr/contribute/test-eclipse-mark`
 */
export function EclipseMarkPreview({ locale = "fr" }: { locale?: Locale }) {
  const copy =
    locale === "en"
      ? {
          title: "Odyssey eclipse mark",
          sub: "Frozen craft recipe — alive because Vie = 1 (silk, breath, diamond).",
          lab: "← Craft lab",
          recipe: "Recipe",
        }
      : {
          title: "Marque Eclipse Odyssey",
          sub: "Recette craft figée — vivante parce que Vie = 1 (soie, breath, diamond).",
          lab: "← Lab craft",
          recipe: "Recette",
        };

  const labHref = `/${locale}/contribute/test-eclipse`;
  const r = ECLIPSE_LOGO_RECIPE;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-black px-4 pb-24 pt-28 text-zinc-100 antialiased md:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-1 px-5 pt-6 md:px-10 md:pt-10">
        <p className="text-xs font-light uppercase tracking-[0.28em] text-white/45 md:text-sm">
          {copy.title}
        </p>
        <p className="max-w-lg text-sm font-light text-white/50 md:text-base">
          {copy.sub}
        </p>
      </div>

      {/* Hero ~80 vmin pour juger la matière */}
      <div className="aspect-square w-[min(80vmin,820px)] shrink-0">
        <OdysseyEclipseMark fill animate />
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-wrap items-center justify-center gap-6">
          <OdysseyEclipseMark size={72} animate />
          <OdysseyEclipseMark size={48} animate />
          <OdysseyEclipseMark size={32} animate />
        </div>
        <p className="max-w-2xl text-center font-mono text-[10px] tracking-wide text-white/35">
          {copy.recipe}: pos {r.alignment.toFixed(3)} · vie {r.lifeAmp.toFixed(2)} ·
          inten {r.coronaAmp.toFixed(2)} · diffus {r.coronaSpread.toFixed(2)} ·
          irreg {r.coronaIrregular.toFixed(2)} · flash {r.diamondAmp.toFixed(2)} ·
          trou {r.moonScale.toFixed(2)} · soleil {r.sunScale.toFixed(2)}
        </p>
      </div>

      <Link
        href={labHref}
        className="rounded-sm border border-white/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/70 hover:border-white/40"
      >
        {copy.lab}
      </Link>
    </main>
  );
}
