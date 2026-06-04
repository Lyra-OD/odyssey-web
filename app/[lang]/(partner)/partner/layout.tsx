import type { ReactNode } from "react";

import type { Locale } from "@/i18n.config";

import { PartnerHeader } from "./components/PartnerHeader";

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

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <PartnerHeader lang={lang} />
      <main className="relative z-10 mx-auto w-full max-w-[1400px] px-5 pb-24 pt-12 md:px-12 md:pt-16">
        {children}
      </main>
    </div>
  );
}
