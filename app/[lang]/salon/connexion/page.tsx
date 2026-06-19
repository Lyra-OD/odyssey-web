import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";
import { AuthConnexionPage } from "@/src/components/auth/AuthConnexionPage";
import { SalonConnexionBrand } from "@/src/components/auth/SalonConnexionBrand";
import { SalonConnexionSlugSync } from "@/src/components/auth/SalonConnexionSlugSync";
import { fetchPartnerBrandingBySlug } from "@/src/lib/partner/fetchPartnerBrandingBySlug";
import { fetchPartnerTenantsForUser } from "@/src/lib/partner/fetchPartnerTenantsForUser";
import { readPartnerConnexionSlugFromCookie } from "@/src/lib/partner/partnerConnexionSlug.server";
import { normalizePartnerSlugParam } from "@/src/lib/partner/partnerBrandingTypes";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    partenaire?: string | string[];
    partner?: string | string[];
    next?: string | string[];
  }>;
};

export default async function SalonConnexionPage({
  params,
  searchParams,
}: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);
  const sp = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const slugFromUrl =
    normalizePartnerSlugParam(sp.partenaire) ??
    normalizePartnerSlugParam(sp.partner);

  let slug = slugFromUrl ?? readPartnerConnexionSlugFromCookie();

  if (!slug && user) {
    const tenants = await fetchPartnerTenantsForUser(supabase, user.id);
    slug =
      normalizePartnerSlugParam(tenants.find((t) => t.slug?.trim())?.slug) ??
      null;
  }

  if (user && slug) {
    const tenants = await fetchPartnerTenantsForUser(supabase, user.id);
    if (tenants.length > 0) {
      const rawNext = Array.isArray(sp.next) ? sp.next[0] : sp.next;
      const nextPath =
        typeof rawNext === "string" && rawNext.startsWith("/") ? rawNext : null;
      if (nextPath?.includes("/salon") && !nextPath.includes("/connexion")) {
        redirect(nextPath);
      }
    }
  }

  const salonBranding = slug ? await fetchPartnerBrandingBySlug(slug) : null;

  return (
    <AuthConnexionPage
      lang={lang}
      copy={dictionary.auth}
      audience="salon"
      localeSwitcher={{
        languageLabel: dictionary.header.languageLabel,
        langOptionFr: dictionary.header.langOptionFr,
        langOptionEn: dictionary.header.langOptionEn,
      }}
      brandSlot={
        <>
          <Suspense fallback={null}>
            <SalonConnexionSlugSync slugFromUrl={slugFromUrl} />
          </Suspense>
          <SalonConnexionBrand
            branding={salonBranding}
            poweredByLabel={dictionary.auth.poweredByOdyssey}
            defaultWordmark={dictionary.header.logoFallback}
          />
        </>
      }
    />
  );
}
