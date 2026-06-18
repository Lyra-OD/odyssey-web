"use client";

import type { Locale } from "@/i18n.config";
import { usePartner } from "@/src/lib/partner/PartnerContext";

type PartnerSalonPageIntroProps = {
  lang: Locale;
};

/**
 * Bandeau de hiérarchie : contexte workspace (niveau 2) + jetons compacts (niveau 3).
 * L’action principale (invitation) reste dans InvitationComposer (niveau 1 contenu).
 */
export function PartnerSalonPageIntro({ lang }: PartnerSalonPageIntroProps) {
  const { capabilities, walletBalance, isWalletLoading } = usePartner();
  const copy =
    lang === "en"
      ? {
          workspace: "Partner space",
          subtitle: "Invite families and manage tribute packages.",
          tokens: "Available tokens",
          recharge: "Top up",
        }
      : {
          workspace: "Espace partenaires",
          subtitle: "Invitez des familles et gérez les forfaits hommage.",
          tokens: "Jetons disponibles",
          recharge: "Recharger",
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

      {capabilities?.canViewBalance && !isWalletLoading && walletBalance !== null && (
        <div className="shrink-0 md:text-right">
          <p className="font-label text-[9px] font-bold uppercase tracking-[0.45em] text-zinc-500">
            {copy.tokens}
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-2 md:justify-end">
            <p className="font-editorial text-3xl font-medium tabular-nums tracking-tight text-white/90 md:text-4xl">
              {walletBalance}
            </p>
            <button
              type="button"
              className="font-label text-[10px] font-bold uppercase tracking-[0.38em] text-violet-300/75 transition-colors hover:text-violet-200"
            >
              {copy.recharge}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
