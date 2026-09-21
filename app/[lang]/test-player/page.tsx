import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TestQuietLuxuryPlayerLab } from "@/src/components/tribute/TestQuietLuxuryPlayerLab";
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
        ? "Test player C4 · Odyssey"
        : "Test lecteur C4 · Odyssey",
    robots: { index: false, follow: false },
  };
}

/**
 * Lab isolé QuietLuxuryPlayer (C4).
 * URL : `/fr/test-player` · dev only (404 en production).
 *
 * Note routing : le param locale du projet est `[lang]`, pas `[locale]`.
 */
export default async function TestPlayerPage({ params }: PageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";

  return <TestQuietLuxuryPlayerLab locale={lang} />;
}
