"use client";

import type { ReactNode } from "react";

import { SalonAtmosphere } from "@/src/components/partner/SalonAtmosphere";
import { PartnerConnexionSlugPersist } from "@/src/components/partner/PartnerConnexionSlugPersist";
import type { PartnerInitialBrand } from "@/src/lib/partner/fetchPartnerTenantsForUser";
import type { Locale } from "@/i18n.config";
import { PartnerProvider } from "@/src/lib/partner/PartnerContext";

import { PartnerHeader } from "./PartnerHeader";

type PartnerDashboardShellProps = {
  lang: Locale;
  poweredByLabel: string;
  signOutLabel: string;
  initialBrand: PartnerInitialBrand | null;
  children: ReactNode;
};

export function PartnerDashboardShell({
  lang,
  poweredByLabel,
  signOutLabel,
  initialBrand,
  children,
}: PartnerDashboardShellProps) {
  return (
    <PartnerProvider>
      <PartnerConnexionSlugPersist />
      <div className="relative min-h-screen overflow-x-hidden bg-[#020202] text-white">
        <SalonAtmosphere variant="dashboard" />
        <PartnerHeader
          lang={lang}
          poweredByLabel={poweredByLabel}
          signOutLabel={signOutLabel}
          initialBrand={initialBrand}
        />
        <main className="relative z-10 mx-auto w-full max-w-[1400px] px-5 pb-24 pt-10 md:px-12 md:pt-12">
          {children}
        </main>
      </div>
    </PartnerProvider>
  );
}
