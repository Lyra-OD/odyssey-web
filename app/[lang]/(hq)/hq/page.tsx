import type { Locale } from "@/i18n.config";
import { getDictionary } from "@/lib/dictionaries";
import {
  EMPTY_HQ_NETWORK_OVERVIEW,
  loadHqNetworkOverview,
} from "@/src/lib/hq/hqNetworkOverview";
import { loadHqTenantsList } from "@/src/lib/hq/hqTenantsList";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

import { HqOverviewDashboard } from "./components/HqOverviewDashboard";
import { HqSalonTable } from "./components/HqSalonTable";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export default async function HqHomePage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);
  const overviewCopy = dictionary.hq.overview;
  const salonsCopy = dictionary.hq.salons;

  let overview = EMPTY_HQ_NETWORK_OVERVIEW;
  let salonRows: Awaited<ReturnType<typeof loadHqTenantsList>> = [];
  let loadError = false;

  try {
    const admin = getSupabaseAdminClient();
    const [loadedOverview, loadedSalons] = await Promise.all([
      loadHqNetworkOverview(admin),
      loadHqTenantsList(admin),
    ]);
    overview = loadedOverview;
    salonRows = loadedSalons;
  } catch (error) {
    console.error("[hq/page]", error);
    loadError = true;
  }

  return (
    <div>
      <p className="font-label text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">
        {dictionary.hq.kicker}
      </p>
      <h1 className="mt-4 font-[family-name:var(--font-label)] text-3xl font-semibold tracking-tight text-white md:text-4xl">
        {dictionary.hq.title}
      </h1>
      <p className="mt-4 max-w-xl text-sm font-light leading-relaxed text-zinc-400">
        {overviewCopy.subtitle}
      </p>
      {/*
       * Résilience d'affichage (6 sept 2026) : `overview`/`salonRows` sont
       * déjà initialisés à des zéros sûrs (EMPTY_HQ_NETWORK_OVERVIEW / [])
       * avant le try/catch ci-dessus — donc même en cas d'erreur backend,
       * on affiche toujours les cartes (à 0) plutôt que de les remplacer
       * entièrement par un texte, ce qui donnait l'impression d'un écran
       * cassé plutôt que d'un réseau vide.
       */}
      {loadError ? (
        <p className="mt-8 text-sm font-light text-red-400/90" role="alert">
          {overviewCopy.error}
        </p>
      ) : null}
      <HqOverviewDashboard
        lang={lang}
        labels={overviewCopy}
        overview={overview}
      />
      <HqSalonTable lang={lang} labels={salonsCopy} initialRows={salonRows} />
    </div>
  );
}
