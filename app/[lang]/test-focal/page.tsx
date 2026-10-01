import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TestFocalLab } from "@/src/components/media/TestFocalLab";
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
    title: lang === "en" ? "Test focal C5 · Odyssey" : "Test focale C5 · Odyssey",
    robots: { index: false, follow: false },
  };
}

/**
 * Lab C5 — détection focale FaceDetector.
 * URL : `/fr/test-focal` · dev only (404 en production).
 */
export default async function TestFocalPage({ params }: PageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  await params;
  return <TestFocalLab />;
}
