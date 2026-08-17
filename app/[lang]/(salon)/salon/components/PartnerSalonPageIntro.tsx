"use client";

import Link from "next/link";

import type { Locale } from "@/i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";
import { usePartner } from "@/src/lib/partner/PartnerContext";

type PartnerSalonPageIntroProps = {
  lang: Locale;
};

/**
 * Bandeau de hiérarchie : contexte workspace + lien commissions (admin).
 * L’action principale (invitation) reste dans InvitationComposer.
 */
export function PartnerSalonPageIntro({ lang }: PartnerSalonPageIntroProps) {
  const { capabilities } = usePartner();
  const copy =
    lang === "en"
      ? {
          workspace: "Partner space",
          subtitle: "Invite families and manage tribute packages.",
          commissions: "Commissions",
        }
      : {
          workspace: "Espace partenaires",
          subtitle: "Invitez des familles et gérez les forfaits hommage.",
          commissions: "Commissions",
        };

  return (
    <section
      aria-labelledby="partner-workspace-title"
      className="mb-12 flex flex-col gap-8 border-b border-white/[0.06] pb-10 md:flex-row md:items-end md:justify-between md:gap-12"
    >
      <div className="min-w-0 max-w-xl">
        <h1
          id="partner-workspace-title"
          className="font-brand text-[11px] font-medium uppercase tracking-[0.26em] text-white/55 md:text-xs md:tracking-[0.28em]"
        >
          {copy.workspace}
        </h1>
        <p className="mt-3 text-sm font-light leading-relaxed text-white/38">
          {copy.subtitle}
        </p>
      </div>

      {capabilities?.canViewLedger ? (
        <div className="shrink-0 md:text-right">
          <Link
            href={appRoutes.salonCommissions(lang)}
            className="font-label text-[10px] font-bold uppercase tracking-[0.38em] text-violet-300/75 transition-colors hover:text-violet-200"
          >
            {copy.commissions} →
          </Link>
        </div>
      ) : null}
    </section>
  );
}
