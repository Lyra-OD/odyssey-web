import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import type { Locale } from "@/i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";
import { getDictionary } from "@/lib/dictionaries";
import {
  resolvePartnerInitialBrand,
} from "@/src/lib/partner/fetchPartnerTenantsForUser";
import { fetchPartnerBrandingBySlug } from "@/src/lib/partner/fetchPartnerBrandingBySlug";
import { resolveSalonLayoutAccess } from "@/src/lib/partner/resolveSalonLayoutAccess";
import { createClient } from "@/utils/supabase/server";

import { PartnerDashboardShell } from "./components/PartnerDashboardShell";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function SalonLayout({ children, params }: LayoutProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const returnPath = appRoutes.salon(lang);
    redirect(
      `${appRoutes.salonConnexion(lang)}?next=${encodeURIComponent(returnPath)}`,
    );
  }

  const salonAccess = await resolveSalonLayoutAccess(supabase, user.id);
  if (!salonAccess.ok) {
    redirect(appRoutes.studio(lang));
  }

  const partnerTenants = salonAccess.partnerTenants;
  const initialBrand = await resolvePartnerInitialBrand(
    partnerTenants,
    fetchPartnerBrandingBySlug,
  );

  return (
    <PartnerDashboardShell
      lang={lang}
      poweredByLabel={dictionary.auth.poweredByOdyssey}
      initialBrand={initialBrand}
    >
      {children}
    </PartnerDashboardShell>
  );
}
