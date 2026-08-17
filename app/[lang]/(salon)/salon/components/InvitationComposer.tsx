"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useRef, useState } from "react";

import type { Locale } from "@/i18n.config";
import { usePartner } from "@/src/lib/partner/PartnerContext";
import {
  CreatePartnerInvitationResponseSchema,
  InvitationAlreadyPendingErrorSchema,
} from "@/src/lib/partner/invitationSchemas";
import {
  SALON_INVITE_STAGGER_CONTAINER,
  SALON_INVITE_STAGGER_ITEM,
  salonInviteEmailBoxClass,
  salonInviteEmailInputClass,
  salonInviteEmailLabelClass,
  salonInviteSubmitCtaClass,
} from "@/src/lib/salonTierCardSkin";
import { editorialAccentRule, editorialColumn } from "@/src/lib/editorialSkin";

type InvitationSuccessData = {
  invitationId: string;
  magicLinkUrl: string;
  expiresAt: string;
  status: string;
};

type InvitationComposerProps = {
  lang: Locale;
};

function formatExpiresAt(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "en" ? "en-CA" : "fr-CA", {
    dateStyle: "long",
  }).format(date);
}

export function InvitationComposer({ lang }: InvitationComposerProps) {
  const prefersReducedMotion = useReducedMotion();
  const submitLockRef = useRef(false);
  const { activeTenantId, isLoading: isPartnerLoading } = usePartner();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<InvitationSuccessData | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const locale = lang === "en" ? "en" : "fr";
  const reducedMotion = prefersReducedMotion === true;

  const copy =
    lang === "en"
      ? {
          kicker: "Invitation",
          title: "Offer Keepsake to a family",
          hint: "The salon gifts the digital sanctuary. The family may elevate the story later.",
          emailLabel: "Family email",
          emailPlaceholder: "name@family.com",
          send: "Offer Keepsake",
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
            "No partner workspace linked to this account. Sign in via the partner link.",
        }
      : {
          kicker: "Invitation",
          title: "Offrir le Souvenir à une famille",
          hint: "Le salon offre l’écrin numérique. La famille pourra élever l’histoire plus tard.",
          emailLabel: "Courriel de la famille",
          emailPlaceholder: "nom@famille.com",
          send: "Offrir le Souvenir",
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
            "Aucun espace partenaire rattaché à ce compte. Reconnectez-vous via le lien partenaire.",
        };

  const formLocked = isSubmitting || Boolean(successData);
  const canSubmit =
    Boolean(email.trim()) &&
    Boolean(activeTenantId) &&
    !isPartnerLoading &&
    !formLocked;

  const resetForm = useCallback(() => {
    setSuccessData(null);
    setError(null);
    setCopied(false);
    setEmail("");
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
    if (!canSubmit || !activeTenantId) return;
    if (submitLockRef.current) return;
    submitLockRef.current = true;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/partner/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyEmail: email.trim(),
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
          <p className="mt-4 text-sm font-light leading-relaxed text-zinc-500">
            {copy.hint}
          </p>
        </motion.div>

        <motion.div
          variants={SALON_INVITE_STAGGER_ITEM}
          className="mb-10 flex w-full max-w-xl flex-col items-center"
        >
          <label
            htmlFor="partner-invite-email"
            className={salonInviteEmailLabelClass()}
          >
            {copy.emailLabel}
          </label>
          <div className={`mt-3 w-full ${salonInviteEmailBoxClass()}`}>
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
          className="mt-4 flex w-full justify-center px-4"
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
