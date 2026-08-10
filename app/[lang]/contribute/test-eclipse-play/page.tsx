import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EclipseCraftPlay } from "@/src/components/contribute/EclipseCraftPlay";
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
        ? "Eclipse play · Odyssey"
        : "Lecture Éclipse · Odyssey",
    robots: { index: false, follow: false },
  };
}

/**
 * Lecture cinéma éclipse — séparée du lab Look.
 * `/fr/contribute/test-eclipse-play`
 */
export default async function TestEclipsePlayPage({ params }: PageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";

  return <EclipseCraftPlay locale={lang} />;
}
