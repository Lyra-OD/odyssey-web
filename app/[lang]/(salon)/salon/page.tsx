import type { Locale } from "@/i18n.config";

import { InvitationComposer } from "./components/InvitationComposer";
import { PartnerSalonPageIntro } from "./components/PartnerSalonPageIntro";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function SalonPage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";

  return (
    <div className="flex flex-col">
      <PartnerSalonPageIntro lang={lang} />
      <InvitationComposer lang={lang} />
    </div>
  );
}
