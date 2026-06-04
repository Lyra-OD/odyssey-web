import type { ReactNode } from "react";

import type { Locale } from "@/i18n.config";

import { PartnerDashboardShell } from "./components/PartnerDashboardShell";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function PartnerDashboardLayout({
  children,
  params,
}: LayoutProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";

  return <PartnerDashboardShell lang={lang}>{children}</PartnerDashboardShell>;
}
