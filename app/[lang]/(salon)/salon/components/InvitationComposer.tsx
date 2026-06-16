"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";

import type { Locale } from "@/i18n.config";
import { usePartner } from "@/src/lib/partner/PartnerContext";
import {
  CreatePartnerInvitationResponseSchema,
  InvitationAlreadyPendingErrorSchema,
} from "@/src/lib/partner/invitationSchemas";
import type { PackageLabelsI18n } from "@/src/lib/wizard/packageI18n";
import {
  formatPackagePriceForMode,
  legacyGrantedFromManifest,
  resolveTransactionMode,
  type PackageId,
} from "@/src/lib/wizard/wizardDeliverables";
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

type InvitationSuccessData = {
  invitationId: string;
  magicLinkUrl: string;
  expiresAt: string;
  status: string;
};

type InvitationComposerProps = {
  lang: Locale;
  /** Noms et styles forfaits (`dictionaries/*.json` → `packages`). */
  packageLabels: PackageLabelsI18n;
  /** Prévisualisation B2C dollars — défaut : compte partenaire (jetons). */
  isPartnerAccount?: boolean;
};

function formatExpiresAt(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-CA" : "fr-CA", {
    dateStyle: "long",
    timeStyle: undefined,
  }).format(date);
}

export function InvitationComposer({
  lang,
  packageLabels,
  isPartnerAccount = true,
}: InvitationComposerProps) {
  const prefersReducedMotion = useReducedMotion();
  const submitLockRef = useRef(false);
  const { activeTenantId, isLoading: isPartnerLoading } = usePartner();

  const [selectedPackageId, setSelectedPackageId] = useState<PackageId | null>(
    null,
  );
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<InvitationSuccessData | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

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
          sending: "Preparing the link…",
          errorGeneric:
            "An error occurred while creating the invitation. Please try again.",
          invitationAlreadyPending:
            "An invitation is already pending for this email address.",
          successTitle: "The invitation was created successfully.",
          linkLabel: "Invitation link",
          copyLink: "Copy link",
          copied: "Copied!",
          validUntil: "This link is valid until",
          newInvitation: "Create another invitation",
          tenantMissing:
            "Partner workspace not found. Check your account or contact support.",
        }
      : {
          kicker: "Invitation",
          title: "Invitez une famille à démarrer son hommage",
          emailLabel: "Courriel de la famille",
          emailPlaceholder: "nom@famille.com",
          cta: "Sélectionner",
          recommended: "Recommandé",
          send: "Envoyer l’invitation",
          sending: "Préparation du lien…",
          errorGeneric:
            "Une erreur est survenue lors de la création de l’invitation. Veuillez réessayer.",
          invitationAlreadyPending:
            "Une invitation est déjà en attente pour cette adresse.",
          successTitle: "L’invitation a été générée avec succès.",
          linkLabel: "Lien d’invitation",
          copyLink: "Copier le lien",
          copied: "Copié !",
          validUntil: "Ce lien est valide jusqu’au",
          newInvitation: "Créer une nouvelle invitation",
          tenantMissing:
            "Espace partenaire introuvable. Vérifiez votre compte ou contactez le support.",
        };

  const hasSelection = selectedPackageId !== null;
  const formLocked = isSubmitting || Boolean(successData);
  const canSubmit =
    Boolean(selectedPackageId) &&
    Boolean(email.trim()) &&
    Boolean(activeTenantId) &&
    !isPartnerLoading &&
    !formLocked;

  const selectPackage = useCallback((packageId: PackageId) => {
    if (formLocked) return;
    setSelectedPackageId(packageId);
  }, [formLocked]);

  const resetForm = useCallback(() => {
    setSuccessData(null);
    setError(null);
    setCopied(false);
    setEmail("");
    setSelectedPackageId(null);
    submitLockRef.current = false;
  }, []);

  const handleCopyLink = useCallback(async () => {
    if (!successData?.magicLinkUrl) return;
    try {
      await navigator.clipboard.writeText(successData.magicLinkUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [successData?.magicLinkUrl]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedPackageId || !activeTenantId) return;
    if (submitLockRef.current) return;
    submitLockRef.current = true;

    setIsSubmitting(true);
    setError(null);

    const grantedPackage = legacyGrantedFromManifest(selectedPackageId);

    try {
      const response = await fetch("/api/partner/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyEmail: email.trim(),
          grantedPackage,
          tenantId: activeTenantId,
          locale: lang,
        }),
      });

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (response.status === 409) {
        const conflict = InvitationAlreadyPendingErrorSchema.safeParse(payload);
        setError(
          conflict.success
            ? conflict.data.message
            : copy.invitationAlreadyPending,
        );
        return;
      }

      if (!response.ok) {
        setError(copy.errorGeneric);
        return;
      }

      const parsed = CreatePartnerInvitationResponseSchema.safeParse(payload);
      if (!parsed.success) {
        setError(copy.errorGeneric);
        return;
      }

      setSuccessData({
        invitationId: parsed.data.invitationId,
        magicLinkUrl: parsed.data.magicLinkUrl,
        expiresAt: parsed.data.expiresAt,
        status: parsed.data.status,
      });
    } catch {
      setError(copy.errorGeneric);
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  }, [
    canSubmit,
    copy.errorGeneric,
    copy.invitationAlreadyPending,
    email,
    lang,
    activeTenantId,
    selectedPackageId,
  ]);

  if (successData) {
    return (
      <section
        className="mt-16 md:mt-20"
        aria-labelledby="partner-invite-success-title"
      >
        <div
          className={`max-w-xl space-y-8 ${editorialColumn} md:max-w-[42rem] ${editorialAccentRule}`}
        >
          <div>
            <p className="font-label text-[10px] font-bold uppercase tracking-[0.5em] text-zinc-500">
              {copy.kicker}
            </p>
            <h2
              id="partner-invite-success-title"
              className="font-editorial mt-5 text-3xl tracking-tight text-white md:text-4xl"
            >
              {copy.successTitle}
            </h2>
          </div>

          <div className="space-y-3">
            <label
              htmlFor="partner-invite-magic-link"
              className="font-label text-[10px] font-bold uppercase tracking-[0.42em] text-zinc-500"
            >
              {copy.linkLabel}
            </label>
            <input
              id="partner-invite-magic-link"
              type="text"
              readOnly
              value={successData.magicLinkUrl}
              className="w-full border border-white/10 bg-white/[0.02] px-4 py-3 font-label text-xs text-zinc-300 outline-none"
            />
          </div>

          <p className="font-label text-sm font-light leading-relaxed text-zinc-400">
            {copy.validUntil}{" "}
            <span className="text-zinc-200">
              {formatExpiresAt(successData.expiresAt, locale)}
            </span>
            .
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="font-label border border-white/10 bg-black/30 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.42em] text-white transition-colors hover:border-purple-400/50 hover:bg-purple-500/15"
            >
              {copied ? copy.copied : copy.copyLink}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="font-label text-[10px] font-bold uppercase tracking-[0.42em] text-zinc-500 transition-colors hover:text-zinc-300"
            >
              {copy.newInvitation}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-16 md:mt-20" aria-labelledby="partner-invite-kicker">
      <div
        className={`mb-10 md:mb-14 ${editorialColumn} md:max-w-[76rem] ${editorialAccentRule}`}
      >
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

      <div
        className={formLocked ? "pointer-events-none opacity-60" : undefined}
        aria-busy={isSubmitting}
      >
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
            disabled={isSubmitting}
            className="mt-3 w-full border-0 border-b border-white/15 bg-transparent py-3 font-label text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-purple-400/55 disabled:opacity-50"
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
                  tabIndex={isSubmitting ? -1 : 0}
                  aria-pressed={isSelected}
                  aria-label={`${tier.title} — ${priceFormatted}`}
                  aria-disabled={isSubmitting}
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
                      <li
                        key={feature}
                        className={tierCardFeatureClass(isSelected)}
                      >
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="relative mt-10">
                    <span className={tierCardCtaClass(isSelected)}>
                      {copy.cta}
                    </span>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </div>

      {!activeTenantId && !isPartnerLoading && !isSubmitting ? (
        <p className="mb-4 max-w-xl font-label text-xs font-light text-amber-200/70">
          {copy.tenantMissing}
        </p>
      ) : null}

      {error ? (
        <p
          className="mb-4 max-w-xl font-label text-sm font-light text-red-300/90"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-10 flex justify-start">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => void handleSubmit()}
          className="font-label border border-white/10 bg-black/30 px-8 py-3 text-[10px] font-bold uppercase tracking-[0.5em] text-white transition-colors enabled:hover:border-purple-400/50 enabled:hover:bg-purple-500/15 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {isSubmitting ? copy.sending : copy.send}
        </button>
      </div>
    </section>
  );
}
