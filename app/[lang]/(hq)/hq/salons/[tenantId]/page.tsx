import { notFound } from "next/navigation";

import type { Locale } from "@/i18n.config";
import { getDictionary } from "@/lib/dictionaries";
import { loadHqFreemiumTenants } from "@/src/lib/hq/hqNetworkOverview";
import { HqTenantDetailResponseSchema } from "@/src/lib/hq/hqTenantsList";
import { loadPartnerCommissionDashboard } from "@/src/lib/partner/loadPartnerCommissionDashboard";
import { getSupabaseAdminClient } from "@/utils/supabase/admin";

import { HqSalonDetailView } from "../../components/HqSalonDetailView";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string; tenantId: string }>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function HqSalonDetailPage({ params }: PageProps) {
  const { lang: routeLang, tenantId } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";

  if (!UUID_RE.test(tenantId)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);

  let detail;
  try {
    const admin = getSupabaseAdminClient();
    const listed = await loadHqFreemiumTenants(admin);
    const tenant = listed.find((row) => row.id === tenantId);
    if (!tenant) {
      notFound();
    }

    const dashboard = await loadPartnerCommissionDashboard(
      admin,
      tenantId,
      lang,
    );
    detail = HqTenantDetailResponseSchema.parse({
      ...dashboard,
      isFreemium: true,
      name: tenant.name,
      slug: tenant.slug,
      vertical: tenant.vertical,
    });
  } catch (error) {
    console.error("[hq/salons/id]", error);
    notFound();
  }

  return (
    <HqSalonDetailView
      lang={lang}
      labels={dictionary.hq.salonDetail}
      initial={detail}
    />
  );
}
