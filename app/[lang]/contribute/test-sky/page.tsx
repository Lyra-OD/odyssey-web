import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SkyCraftLab } from "@/src/components/contribute/SkyCraftLab";
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
    title: lang === "en" ? "Sky craft · Odyssey" : "Craft ciel · Odyssey",
    robots: { index: false, follow: false },
  };
}

/**
 * Lab craft fond ciel — layers · opacités · parallaxe.
 * `/fr/contribute/test-sky` — dev only.
 */
export default async function TestSkyPage({ params }: PageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";

  return <SkyCraftLab locale={lang} />;
}
