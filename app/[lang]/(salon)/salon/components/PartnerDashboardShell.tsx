"use client";

import type { ReactNode } from "react";

import type { Locale } from "@/i18n.config";
import { PartnerProvider } from "@/src/lib/partner/PartnerContext";

import { PartnerHeader } from "./PartnerHeader";

type PartnerDashboardShellProps = {
  lang: Locale;
  children: ReactNode;
};

export function PartnerDashboardShell({
  lang,
  children,
}: PartnerDashboardShellProps) {
  return (
    <PartnerProvider>
      <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
        <PartnerHeader lang={lang} />
        <main className="relative z-10 mx-auto w-full max-w-[1400px] px-5 pb-24 pt-12 md:px-12 md:pt-16">
          {children}
        </main>
      </div>
    </PartnerProvider>
  );
}
