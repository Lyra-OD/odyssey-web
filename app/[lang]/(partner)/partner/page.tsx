import type { Locale } from "@/i18n.config";
import { getDictionary } from "@/lib/dictionaries";

import { InvitationComposer } from "./components/InvitationComposer";
import { PartnerWalletSection } from "./components/PartnerWalletSection";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function PartnerDashboardPage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);

  return (
    <div className="flex flex-col">
      <PartnerWalletSection lang={lang} balance={42} />
      <InvitationComposer
        lang={lang}
        packageLabels={{
          names: dictionary.packages.names,
          styles: dictionary.packages.styles,
        }}
      />
    </div>
  );
}
