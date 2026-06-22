import type { Locale } from "@/i18n.config";

import { PartnerFacturationView } from "../components/PartnerFacturationView";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function SalonFacturationPage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";

  return <PartnerFacturationView lang={lang} />;
}
