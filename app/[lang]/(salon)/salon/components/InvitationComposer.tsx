"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";

import type { Locale } from "@/i18n.config";
import { SalonTierFeatureRow } from "@/src/components/partner/SalonTierFeatureRow";
import { usePartner } from "@/src/lib/partner/PartnerContext";
import {
  CreatePartnerInvitationResponseSchema,
  InvitationAlreadyPendingErrorSchema,
} from "@/src/lib/partner/invitationSchemas";
import {
  getSalonTierCardMotionState,
  SALON_INVITE_CARD_VARIANTS,
  SALON_INVITE_STAGGER_CONTAINER,
  SALON_INVITE_STAGGER_ITEM,
  SALON_UV_RADIAL,
  salonInviteEmailBoxClass,
  salonInviteEmailInputClass,
  salonInviteEmailLabelClass,
  salonInviteSubmitCtaClass,
  salonRecommendedBadgeClass,
  salonTierCardCtaClass,
  salonTierFeatureDividerClass,
  salonTierCardPriceAmountClass,
  salonTierCardPriceSuffixClass,
  salonTierCardStyleClass,
  salonTierCardSurfaceClass,
  salonTierCardTitleClass,
  salonTierTokenDebitClass,
} from "@/src/lib/salonTierCardSkin";
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
  RECOMMENDED_PACKAGE_ID,
} from "@/src/lib/wizard/wizardDeliverables.utils";
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
  const reducedMotion = prefersReducedMotion === true;

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
            "No partner workspace linked to this account. Sign in via the partner link or run the QA seed (P5.4 + odyssey_p4_partner_token_qa_seed.sql).",
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
            "Aucun espace partenaire rattaché à ce compte. Reconnectez-vous via le lien partenaire ou exécutez le seed QA (P5.4 + odyssey_p4_partner_token_qa_seed.sql).",
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
    <section
      className="mt-2 flex w-full flex-col items-center text-center md:mt-4"
      aria-labelledby="partner-invite-kicker"
    >
      <motion.div
        className="flex w-full flex-col items-center"
        variants={SALON_INVITE_STAGGER_CONTAINER}
        initial={reducedMotion ? "visible" : "hidden"}
        animate="visible"
      >
        <motion.div
          variants={SALON_INVITE_STAGGER_ITEM}
          className="mb-10 w-full max-w-2xl md:mb-14"
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
        </motion.div>

        <div
          className={
            formLocked
              ? "pointer-events-none w-full opacity-60"
              : "w-full"
          }
          aria-busy={isSubmitting}
        >
          <motion.div
            variants={SALON_INVITE_STAGGER_ITEM}
            className="mb-12 flex w-full flex-col items-center"
          >
            <label
              htmlFor="partner-invite-email"
              className={salonInviteEmailLabelClass()}
            >
              {copy.emailLabel}
            </label>
            <div className={`mt-3 ${salonInviteEmailBoxClass()}`}>
              <input
                id="partner-invite-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={copy.emailPlaceholder}
                disabled={isSubmitting}
                className={salonInviteEmailInputClass()}
              />
            </div>
          </motion.div>

          <motion.div
            variants={SALON_INVITE_STAGGER_ITEM}
            className="relative w-full py-3 md:py-6"
          >
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 overflow-visible md:grid-cols-3 md:gap-8">
              {tiers.map((tier, index) => {
                const packageId = tier.packageId;
                const isPopular = tier.recommended;
                const isSelected = selectedPackageId === packageId;
                const isDefaultPopularGlow = isPopular && !hasSelection;
                const showRecommendedBadge =
                  isPopular &&
                  (!hasSelection || selectedPackageId === RECOMMENDED_PACKAGE_ID);
                const {
                  isAccent,
                  showRadialBlur,
                  cardAnimate,
                  cardTransition,
                  neonAnimate,
                  neonTransition,
                  radialAnimate,
                  radialTransition,
                  secondaryTextAnimate,
                  secondaryTextTransition,
                  hoverScale,
                  hoverTransition,
                } = getSalonTierCardMotionState(
                  isSelected,
                  isDefaultPopularGlow,
                  prefersReducedMotion,
                  hasSelection,
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
                  <motion.div
                    key={packageId}
                    custom={index}
                    variants={SALON_INVITE_CARD_VARIANTS}
                    initial={reducedMotion ? "visible" : "hidden"}
                    animate="visible"
                    className="flex w-full"
                  >
                    <motion.article
                      role="button"
                      tabIndex={isSubmitting ? -1 : 0}
                      aria-pressed={isSelected}
                      aria-label={`${tier.title} — ${priceFormatted}`}
                      aria-disabled={isSubmitting}
                      initial={false}
                      animate={cardAnimate}
                      transition={cardTransition}
                      whileHover={
                        !reducedMotion && !isAccent
                          ? { scale: hoverScale, transition: hoverTransition }
                          : undefined
                      }
                      style={{ transformOrigin: "center center" }}
                      className={`flex w-full flex-col ${salonTierCardSurfaceClass(isSelected)}`}
                      onClick={() => selectPackage(packageId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectPackage(packageId);
                        }
                      }}
                    >
                      {showRadialBlur ? (
                        <motion.div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 overflow-hidden blur-2xl"
                          initial={false}
                          animate={radialAnimate}
                          transition={radialTransition}
                          style={{ background: SALON_UV_RADIAL }}
                        />
                      ) : null}

                      <motion.div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[var(--salon-cyan)]"
                        initial={false}
                        animate={neonAnimate}
                        transition={neonTransition}
                      />

                      <AnimatePresence>
                        {showRecommendedBadge ? (
                          <motion.div
                            key="recommended-badge"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{
                              type: "tween",
                              duration: 0.5,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            className={salonRecommendedBadgeClass()}
                          >
                            {copy.recommended}
                          </motion.div>
                        ) : null}
                      </AnimatePresence>

                      <header className="relative text-left">
                        <p className={salonTierCardTitleClass(isSelected)}>
                          {tier.title}
                        </p>
                        <motion.p
                          initial={false}
                          animate={secondaryTextAnimate}
                          transition={secondaryTextTransition}
                          className={`mt-3 ${salonTierCardStyleClass()}`}
                        >
                          {tier.style}
                        </motion.p>
                        <div className="mt-5 flex items-baseline gap-3">
                          <div
                            className={salonTierCardPriceAmountClass(isAccent)}
                          >
                            {transactionMode === "tokens"
                              ? priceParts.amount
                              : priceFormatted}
                          </div>
                          {transactionMode === "tokens" && priceParts.suffix ? (
                            <motion.div
                              initial={false}
                              animate={secondaryTextAnimate}
                              transition={secondaryTextTransition}
                              className={salonTierCardPriceSuffixClass()}
                            >
                              {priceParts.suffix}
                            </motion.div>
                          ) : null}
                        </div>
                      </header>

                      {transactionMode === "tokens" ? (
                        <div className="relative mt-8 text-left">
                          <p className={salonTierTokenDebitClass()}>
                            {tier.tokenDebitLabel}
                          </p>
                          <div
                            aria-hidden
                            className={salonTierFeatureDividerClass()}
                          />
                        </div>
                      ) : null}

                      <ul
                        className={`relative space-y-2.5 ${transactionMode === "tokens" ? "" : "mt-8"}`}
                      >
                        {tier.features.map((feature) => (
                          <SalonTierFeatureRow
                            key={feature.id}
                            feature={feature}
                            isAccent={isAccent}
                            isSelected={isSelected}
                            reducedMotion={reducedMotion}
                          />
                        ))}
                      </ul>

                      <div className="relative mt-10">
                        <span className={salonTierCardCtaClass(isSelected)}>
                          {copy.cta}
                        </span>
                      </div>
                    </motion.article>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {!activeTenantId && !isPartnerLoading && !isSubmitting ? (
          <motion.p
            variants={SALON_INVITE_STAGGER_ITEM}
            className="mb-4 max-w-md font-label text-xs font-light text-amber-200/70"
          >
            {copy.tenantMissing}
          </motion.p>
        ) : null}

        {error ? (
          <motion.p
            variants={SALON_INVITE_STAGGER_ITEM}
            className="mb-4 max-w-md font-label text-sm font-light text-red-300/90"
            role="alert"
          >
            {error}
          </motion.p>
        ) : null}

        <motion.div
          variants={SALON_INVITE_STAGGER_ITEM}
          className="mt-10 flex w-full justify-center px-4"
        >
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            className={salonInviteSubmitCtaClass(canSubmit)}
          >
            {isSubmitting ? copy.sending : copy.send}
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
