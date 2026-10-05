import type { Metadata } from "next";

import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";

import { DeckClient } from "./DeckClient";

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
 * Pitch deck capital (ILP 11) — scaffold T0+.
 * URL : `/fr/deck` · `/en/deck` · pas de Navbar marketing.
 */
export default async function DeckPage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);
  const t = dictionary.pitchDeck;

  return (
    <main className="min-h-dvh bg-[#020202] text-zinc-100 antialiased">
      <DeckClient
        locale={lang}
        wordmark={dictionary.header.logoFallback}
        hint={t.scaffoldHint}
        progress={t.scaffoldProgress}
        introSkip={t.introSkip}
      />
    </main>
  );
}
