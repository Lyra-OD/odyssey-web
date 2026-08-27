import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SkyCraftLabLegacy } from "@/src/components/contribute/SkyCraftLabLegacy";
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
        ? "Sky craft LEGACY · Odyssey"
        : "Craft ciel LEGACY · Odyssey",
    robots: { index: false, follow: false },
  };
}

/**
 * Backup du lab craft ciel (état SkyTheme pré-SkyCraftState).
 * `/fr/contribute/test-sky-legacy` — dev only.
 */
export default async function TestSkyLegacyPage({ params }: PageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";

  return <SkyCraftLabLegacy locale={lang} />;
}
