import type { Metadata } from "next";

import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";

import { DeckClient, type PitchDeckSlide } from "./DeckClient";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);
  const t = dictionary.pitchDeck;

  return {
    title: t.metaTitle,
    robots: { index: false, follow: false },
  };
}

/**
 * Pitch deck capital (ILP 11) — T0 shell + T1 copy.
 * URL : `/fr/deck` · `/en/deck` · pas de Navbar marketing.
 */
export default async function DeckPage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);
  const t = dictionary.pitchDeck;
  const slides = t.slides as PitchDeckSlide[];

  return (
    <main className="min-h-dvh bg-[#020202] text-zinc-100 antialiased">
      <DeckClient
        locale={lang}
        wordmark={dictionary.header.logoFallback}
        introSkip={t.introSkip}
        progressOf={t.progressOf}
        slides={slides}
      />
    </main>
  );
}
