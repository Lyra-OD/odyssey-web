import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EclipseCraftLab } from "@/src/components/contribute/EclipseCraftLab";
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
        ? "Eclipse craft · Odyssey"
        : "Craft Éclipse · Odyssey",
    robots: { index: false, follow: false },
  };
}

/**
 * Lab craft éclipse — dev only.
 * `/fr/contribute/test-eclipse`
 */
export default async function TestEclipsePage({ params }: PageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";

  return <EclipseCraftLab locale={lang} />;
}
