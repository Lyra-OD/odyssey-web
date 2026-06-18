import type { Locale } from "@/i18n.config";
import { getDictionary } from "@/lib/dictionaries";

import { InvitationComposer } from "./components/InvitationComposer";
import { PartnerSalonPageIntro } from "./components/PartnerSalonPageIntro";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function SalonPage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);

  return (
    <div className="flex flex-col">
      <PartnerSalonPageIntro lang={lang} />
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
