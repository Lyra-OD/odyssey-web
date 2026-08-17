import type { Locale } from "@/i18n.config";

import { PartnerMyPerformanceView } from "../components/PartnerMyPerformanceView";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function SalonMyPerformancePage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";

  return <PartnerMyPerformanceView lang={lang} />;
}
