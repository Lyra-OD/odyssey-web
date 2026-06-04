"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";

import type { Locale } from "@/i18n.config";
import {
  formatPackagePriceForMode,
  legacyGrantedFromManifest,
  resolveTransactionMode,
  type PackageId,
} from "@/src/lib/wizard/wizardDeliverables";
import type { PackageLabelsI18n } from "@/src/lib/wizard/packageI18n";
import {
  listPartnerInvitationTiers,
  packagePricePartsForMode,
} from "@/src/lib/wizard/wizardDeliverables.utils";
import {
  getTierCardMotionState,
  TIER_CARD_SELECT_TRANSITION,
  tierCardCtaClass,
  tierCardFeatureClass,
  tierCardPriceClass,
  tierCardStyleClass,
  tierCardSurfaceClass,
  tierCardTitleClass,
  UV_RADIAL,
} from "@/src/lib/pricingTierCardSkin";
import { editorialAccentRule, editorialColumn } from "@/src/lib/editorialSkin";

type InvitationComposerProps = {
  lang: Locale;
  /** Noms et styles forfaits (`dictionaries/*.json` → `packages`). */
  packageLabels: PackageLabelsI18n;
  /** Prévisualisation B2C dollars — défaut : compte partenaire (jetons). */
  isPartnerAccount?: boolean;
};

export function InvitationComposer({
  lang,
  packageLabels,
  isPartnerAccount = true,
}: InvitationComposerProps) {
  const prefersReducedMotion = useReducedMotion();
  const [selectedPackageId, setSelectedPackageId] = useState<PackageId | null>(
    null,
  );
  const [email, setEmail] = useState("");

  const locale = lang === "en" ? "en" : "fr";

  const transactionMode = resolveTransactionMode({
    isPartnerAccount,
  });

  const tiers = useMemo(
    () => listPartnerInvitationTiers(locale, packageLabels),
    [locale, packageLabels],
  );

  const copy =
    lang === "en"
      ? {
          kicker: "Invitation",
          title: "Invite a family to start their tribute",
          emailLabel: "Family email",
          emailPlaceholder: "name@family.com",
          cta: "Select",
          recommended: "Recommended",
          send: "Send invitation",
        }
      : {
          kicker: "Invitation",
          title: "Invitez une famille à démarrer son hommage",
          emailLabel: "Courriel de la famille",
          emailPlaceholder: "nom@famille.com",
          cta: "Sélectionner",
          recommended: "Recommandé",
          send: "Envoyer l’invitation",
        };

  const hasSelection = selectedPackageId !== null;

  const selectPackage = useCallback((packageId: PackageId) => {
    setSelectedPackageId(packageId);
  }, []);

  return (
    <section className="mt-16 md:mt-20" aria-labelledby="partner-invite-kicker">
      <div className={`mb-10 md:mb-14 ${editorialColumn} md:max-w-[76rem] ${editorialAccentRule}`}>
        <p
          id="partner-invite-kicker"
          className="font-label text-[10px] font-bold uppercase tracking-[0.5em] text-zinc-500"
        >
          {copy.kicker}
        </p>
        <h2 className="font-editorial mt-5 text-3xl tracking-tight text-white md:text-4xl">
          {copy.title}
        </h2>
      </div>

      <div className="mb-12 max-w-xl">
        <label
          htmlFor="partner-invite-email"
          className="font-label text-[10px] font-bold uppercase tracking-[0.42em] text-zinc-500"
        >
          {copy.emailLabel}
        </label>
        <input
          id="partner-invite-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={copy.emailPlaceholder}
          className="mt-3 w-full border-0 border-b border-white/15 bg-transparent py-3 font-label text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-purple-400/55"
        />
      </div>

      <div className="relative py-3 md:py-6">
        <div className="grid grid-cols-1 gap-6 overflow-visible md:grid-cols-3 md:gap-8">
          {tiers.map((tier) => {
            const packageId = tier.packageId;
            const isPopular = tier.recommended;
            const isSelected = selectedPackageId === packageId;
            const isDefaultPopularGlow = isPopular && !hasSelection;
            const { isUltraviolet, showRadialBlur, animate } =
              getTierCardMotionState(
                isSelected,
                isDefaultPopularGlow,
                prefersReducedMotion,
              );

            const priceFormatted = formatPackagePriceForMode(
              packageId,
              transactionMode,
              locale,
            );
            const priceParts = packagePricePartsForMode(
              packageId,
              transactionMode,
              priceFormatted,
            );

            return (
              <motion.article
                key={packageId}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${tier.title} — ${priceFormatted}`}
                transition={{
                  scale: TIER_CARD_SELECT_TRANSITION,
                  borderColor: TIER_CARD_SELECT_TRANSITION,
                  backgroundColor: TIER_CARD_SELECT_TRANSITION,
                  boxShadow: TIER_CARD_SELECT_TRANSITION,
                }}
                animate={animate}
                style={{ transformOrigin: "center center" }}
                className={tierCardSurfaceClass(isUltraviolet, isSelected)}
                onClick={() => selectPackage(packageId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectPackage(packageId);
                  }
                }}
              >
                {showRadialBlur && (
                  <div
                    aria-hidden
                    className={[
                      "pointer-events-none absolute -inset-24 blur-3xl",
                      isSelected ? "opacity-95" : "opacity-80",
                    ].join(" ")}
                    style={{ background: UV_RADIAL }}
                  />
                )}

                {isPopular && (
                  <div className="absolute right-5 top-5 border border-purple-500/40 bg-black/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.32em] text-white">
                    {copy.recommended}
                  </div>
                )}

                <header className="relative">
                  <p className={tierCardTitleClass(isSelected)}>
                    {tier.title}
                  </p>
                  <div className="mt-5 flex items-baseline gap-3">
                    <div className={tierCardPriceClass(isSelected)}>
                      {transactionMode === "tokens"
                        ? priceParts.amount
                        : priceFormatted}
                    </div>
                    {transactionMode === "tokens" && priceParts.suffix ? (
                      <div className={tierCardStyleClass(isSelected)}>
                        {priceParts.suffix}
                      </div>
                    ) : null}
                  </div>
                  <p
                    className={
                      isSelected
                        ? "font-label mt-3 text-[10px] font-bold uppercase tracking-[0.32em] text-violet-200/80"
                        : "font-label mt-3 text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500"
                    }
                  >
                    {tier.style}
                  </p>
                </header>

                <ul className="relative mt-8 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className={tierCardFeatureClass(isSelected)}>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="relative mt-10">
                  <span className={tierCardCtaClass(isSelected)}>{copy.cta}</span>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      <div className="mt-10 flex justify-start">
        <button
          type="button"
          disabled={!selectedPackageId || !email.trim()}
          className="font-label border border-white/10 bg-black/30 px-8 py-3 text-[10px] font-bold uppercase tracking-[0.5em] text-white transition-colors enabled:hover:border-purple-400/50 enabled:hover:bg-purple-500/15 disabled:cursor-not-allowed disabled:opacity-35"
          data-granted-package={
            selectedPackageId
              ? legacyGrantedFromManifest(selectedPackageId)
              : undefined
          }
        >
          {copy.send}
        </button>
      </div>
    </section>
  );
}
