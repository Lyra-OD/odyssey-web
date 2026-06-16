import { getDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";
import { AuthConnexionPage } from "@/src/components/auth/AuthConnexionPage";
import { fetchPartnerBrandingBySlug } from "@/src/lib/partner/fetchPartnerBrandingBySlug";
import { normalizePartnerSlugParam } from "@/src/lib/partner/partnerBrandingTypes";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    partenaire?: string | string[];
    partner?: string | string[];
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

  const slug =
    normalizePartnerSlugParam(sp.partenaire) ??
    normalizePartnerSlugParam(sp.partner);
  const salonBranding = slug ? await fetchPartnerBrandingBySlug(slug) : null;

  return (
    <AuthConnexionPage
      lang={lang}
      copy={dictionary.auth}
      audience="salon"
      salonBranding={salonBranding}
      defaultWordmark={dictionary.header.logoFallback}
    />
  );
}
