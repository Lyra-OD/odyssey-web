import type { Locale } from "@/i18n.config";

import { PartnerCommissionsView } from "../components/PartnerCommissionsView";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function SalonCommissionsPage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";

  return <PartnerCommissionsView lang={lang} />;
}
