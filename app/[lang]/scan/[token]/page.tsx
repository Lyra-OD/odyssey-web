import type { Metadata } from "next";

import { ScannerCaptureClient } from "@/src/components/scanner/ScannerCaptureClient";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string; token: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  return {
    title:
      lang === "en"
        ? "Companion Scanner · Odyssey"
        : "Scanner Compagnon · Odyssey",
    robots: { index: false, follow: false },
  };
}

/**
 * Page mobile Scanner Compagnon — token opaque, sans auth.
 * Phase A : caméra / galerie → coffre wizard. Pas de recadrage IA.
 */
export default async function ScannerCapturePage({ params }: PageProps) {
  const { lang: routeLang, token: rawToken } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  const dictionary = await getDictionary(lang);

  return (
    <ScannerCaptureClient
      token={token}
      locale={lang}
      copy={dictionary.scannerCapture}
    />
  );
}
