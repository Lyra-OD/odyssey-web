import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EclipseMarkPreview } from "@/src/components/contribute/EclipseMarkPreview";
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
        ? "Eclipse mark · Odyssey"
        : "Marque Éclipse · Odyssey",
    robots: { index: false, follow: false },
  };
}

/**
 * Preview marque Eclipse animée — recette craft figée.
 * `/fr/contribute/test-eclipse-mark`
 */
export default async function TestEclipseMarkPage({ params }: PageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";

  return <EclipseMarkPreview locale={lang} />;
}
