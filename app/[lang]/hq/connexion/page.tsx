import { redirect } from "next/navigation";

import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";
import { AuthConnexionPage } from "@/src/components/auth/AuthConnexionPage";
import { StudioConnexionBrand } from "@/src/components/auth/StudioConnexionBrand";
import { appRoutes } from "@/src/lib/appRoutes";
import { sanitizeHqNextPath } from "@/src/lib/auth/sanitizeNextPath";
import { isListedOnHqAllowlist } from "@/src/lib/hq/isOdysseyOperator";
import { resolveSalonLayoutAccess } from "@/src/lib/partner/resolveSalonLayoutAccess";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function HqConnexionPage({ params, searchParams }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    if (await isListedOnHqAllowlist(supabase, user.id)) {
      const rawNext = Array.isArray(sp.next) ? sp.next[0] : sp.next;
      const nextPath = sanitizeHqNextPath(
        typeof rawNext === "string" ? rawNext : null,
      );
      redirect(nextPath ?? appRoutes.hq(lang));
    }

    const salonAccess = await resolveSalonLayoutAccess(supabase, user.id);
    if (salonAccess.ok) {
      redirect(appRoutes.salon(lang));
    }
    redirect(`/${lang}`);
  }

  return (
    <AuthConnexionPage
      lang={lang}
      copy={dictionary.auth}
      audience="hq"
      localeSwitcher={{
        languageLabel: dictionary.header.languageLabel,
        langOptionFr: dictionary.header.langOptionFr,
        langOptionEn: dictionary.header.langOptionEn,
      }}
      brandSlot={
        <StudioConnexionBrand wordmark={dictionary.header.logoFallback} />
      }
    />
  );
}
