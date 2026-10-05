import type { Metadata } from "next";

import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";
import {
  getDeckAccessPassword,
  isDeckSessionUnlocked,
} from "@/src/lib/deck/deckAccess";

import { DeckClient, type PitchDeckSlide } from "./DeckClient";
import { DeckGate } from "./DeckGate";

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
 * Pitch deck capital (ILP 11) — gate password → intro craft → scroller.
 * URL : `/fr/deck` · `/en/deck` · pas de Navbar marketing.
 * Slides absentes du HTML tant que le cookie n’est pas posé.
 */
export default async function DeckPage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);
  const t = dictionary.pitchDeck;
  const wordmark = dictionary.header.logoFallback;
  const configured = Boolean(getDeckAccessPassword());
  const unlocked = configured ? await isDeckSessionUnlocked() : false;

  const localeSwitcher = {
    languageLabel: dictionary.header.languageLabel,
    langOptionFr: dictionary.header.langOptionFr,
    langOptionEn: dictionary.header.langOptionEn,
  };

  if (!unlocked) {
    return (
      <main className="min-h-dvh bg-[#020202] text-zinc-100 antialiased">
        <DeckGate
          lang={lang}
          wordmark={wordmark}
          configured={configured}
          localeSwitcher={localeSwitcher}
          copy={{
            title: t.gateTitle,
            hint: t.gateHint,
            submit: t.gateSubmit,
            error: t.gateError,
            unavailable: t.gateUnavailable,
            passwordLabel: t.gatePasswordLabel,
          }}
        />
      </main>
    );
  }

  const slides = t.slides as PitchDeckSlide[];

  return (
    <main className="min-h-dvh bg-[#020202] text-zinc-100 antialiased">
      <DeckClient
        locale={lang}
        wordmark={wordmark}
        introSkip={t.introSkip}
        progressOf={t.progressOf}
        slides={slides}
        localeSwitcher={localeSwitcher}
      />
    </main>
  );
}
