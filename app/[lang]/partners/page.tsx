import { Navbar } from "@/src/components/Navbar";
import {
  editorialAccentRule,
  editorialColumn,
  editorialSectionShell,
} from "@/src/lib/editorialSkin";
import { OdysseyBrandLockup } from "@/src/components/OdysseyBrandLockup";
import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";

import { PartnersLeadForm } from "./PartnersLeadForm";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function PartnersPage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);
  const t = dictionary.partnersPage;
  const logoFallback = dictionary.header.logoFallback;

  return (
    <main className="min-h-screen bg-[#030303] text-zinc-100 antialiased">
      <Navbar lang={lang} dictionary={dictionary.header} />
      <section className={`mx-auto px-6 pb-28 pt-32 md:px-12 ${editorialSectionShell}`}>
        <div className={`${editorialColumn} md:max-w-[76rem] lg:max-w-[92rem] ${editorialAccentRule}`}>
          <OdysseyBrandLockup wordmark={logoFallback} size="page" className="mb-10 md:mb-12" />
          <h1 className="font-editorial text-4xl tracking-tight text-zinc-50 md:text-5xl lg:text-6xl">
            {t.title}
          </h1>
          <p className="font-label mt-8 text-sm leading-relaxed text-zinc-400 md:text-base">
            {t.subtitle}
          </p>

          <PartnersLeadForm lang={lang} labels={t.form} />
        </div>
      </section>
    </main>
  );
}
