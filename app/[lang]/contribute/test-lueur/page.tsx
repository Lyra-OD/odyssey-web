import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LueurCraftLab } from "@/src/components/contribute/LueurCraftLab";
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
      lang === "en" ? "Lueur craft · Odyssey" : "Craft Lueur · Odyssey",
    robots: { index: false, follow: false },
  };
}

/**
 * Lab craft Lueur — 3 onglets : Hero · Constellation · Lueur produit.
 * `/fr/contribute/test-lueur` — dev only.
 */
export default async function TestLueurPage({ params }: PageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";

  return <LueurCraftLab locale={lang} />;
}
