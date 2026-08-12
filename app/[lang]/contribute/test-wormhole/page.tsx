import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WormholeCraftLab } from "@/src/components/contribute/WormholeCraftLab";
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
        ? "Wormhole craft · Odyssey"
        : "Craft Wormhole · Odyssey",
    robots: { index: false, follow: false },
  };
}

/**
 * Lab craft wormhole — Quiet Luxury (dev only).
 * `/fr/contribute/test-wormhole`
 */
export default async function TestWormholePage({ params }: PageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";

  return <WormholeCraftLab locale={lang} />;
}
