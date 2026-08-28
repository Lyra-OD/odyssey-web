import { Navbar } from "@/src/components/Navbar";
import { editorialSectionShell } from "@/src/lib/editorialSkin";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";

import { PartnersPageContent } from "./PartnersPageContent";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function PartnersPage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);
  const t = dictionary.partnersPage;

  return (
    <main className="min-h-screen bg-[#030303] text-zinc-100 antialiased">
      <Navbar lang={lang} dictionary={dictionary.header} />
      <section className={`mx-auto px-6 pb-28 pt-32 md:px-12 ${editorialSectionShell}`}>
        <PartnersPageContent
          lang={lang}
          copy={{
            title: t.title,
            kicker: t.kicker,
            introProblem: t.introProblem,
            introResolution: t.introResolution,
            promiseTitle: t.promiseTitle,
            promiseBody: t.promiseBody,
            growthEngineTitle: t.growthEngineTitle,
            growthEngineItems: t.growthEngineItems,
            demoTitle: t.demoTitle,
            demoIntro: t.demoIntro,
          }}
          formLabels={t.form}
        />
      </section>
    </main>
  );
}
