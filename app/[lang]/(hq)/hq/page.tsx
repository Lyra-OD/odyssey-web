import type { Locale } from "@/i18n.config";
import { getDictionary } from "@/lib/dictionaries";

import { HqOverviewDashboard } from "./components/HqOverviewDashboard";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function HqHomePage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);
  const overview = dictionary.hq.overview;

  return (
    <div>
      <p className="font-label text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">
        {dictionary.hq.kicker}
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-label)] text-3xl font-semibold tracking-tight text-white md:text-4xl">
        {dictionary.hq.title}
      </h1>
      <p className="mt-4 max-w-xl text-sm font-light leading-relaxed text-zinc-400">
        {overview.subtitle}
      </p>
      <HqOverviewDashboard lang={lang} labels={overview} />
    </div>
  );
}
