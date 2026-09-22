import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  TestQuietLuxuryPlayerLab,
  type LabExitHubDictionary,
} from "@/src/components/tribute/TestQuietLuxuryPlayerLab";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  return {
    title:
      lang === "en"
        ? "Test player C4/C8 · Odyssey"
        : "Test lecteur C4/C8 · Odyssey",
    robots: { index: false, follow: false },
  };
}

/**
 * Lab Quiet Luxury — projection cinéma + hub sortie C8.
 * URL : `/fr/test-player` · dev only (404 en production).
 */
export default async function TestPlayerPage({ params }: PageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);

  return (
    <TestQuietLuxuryPlayerLab
      locale={lang}
      exitHubCopy={dictionary.quietLuxuryExitHub as LabExitHubDictionary}
    />
  );
}
