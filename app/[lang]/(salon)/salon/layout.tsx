import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import type { Locale } from "@/i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";
import { createClient } from "@/utils/supabase/server";

import { PartnerDashboardShell } from "./components/PartnerDashboardShell";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function SalonLayout({ children, params }: LayoutProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";

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

  return <PartnerDashboardShell lang={lang}>{children}</PartnerDashboardShell>;
}
