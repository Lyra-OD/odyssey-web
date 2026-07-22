"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { isPatronAmountValid } from "@/src/components/contribute/PatronAmountField";
import { isSanctuaryVisualPreview } from "@/src/lib/contribute/sanctuaryPreview";
import { sanctuarySubmitButton } from "@/src/lib/contribute/sanctuaryChrome";
import { formatWizardPrice } from "@/src/lib/wizard/wizardPricing";

export type ImprintCheckoutCtaProps = {
  token: string;
  locale: "fr" | "en";
  productKey: string | null;
  /** Requis si productKey === guest_patron */
  patronAmountCents: number;
  patronMinCents?: number | null;
  patronMaxCents?: number | null;
  contributorName?: string | null;
  contributorEmail?: string | null;
  /** Prix affiché sur le CTA (packs fixes). Ignoré pour Mécène. */
  fixedPriceCents?: number | null;
};

const copy = {
  fr: {
    cta: (price: string) => `Continuer · ${price}`,
    ctaPatron: (price: string) => `Devenir Mécène · ${price}`,
    selectFirst: "Choisissez une empreinte pour continuer.",
    paying: "Redirection sécurisée…",
    previewBlocked:
      "Aperçu local : le paiement Stripe nécessite un vrai lien Sanctuaire.",
    errorGeneric: "Impossible d'ouvrir le paiement pour le moment.",
    amountInvalid: "Ajustez le montant Mécène avant de continuer.",
  },
  en: {
    cta: (price: string) => `Continue · ${price}`,
    ctaPatron: (price: string) => `Become a Patron · ${price}`,
    selectFirst: "Choose an imprint to continue.",
    paying: "Secure redirect…",
    previewBlocked:
      "Local preview: Stripe checkout needs a real Sanctuary link.",
    errorGeneric: "We could not open checkout right now.",
    amountInvalid: "Adjust the Patron amount before continuing.",
  },
} as const;

/**
 * CTA checkout empreinte — POST /api/contribute/[token]/checkout → redirect Stripe.
 */
export function ImprintCheckoutCta({
  token,
  locale,
  productKey,
  patronAmountCents,
  patronMinCents,
  patronMaxCents,
  contributorName,
  contributorEmail,
  fixedPriceCents,
}: ImprintCheckoutCtaProps) {
  const t = copy[locale];
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPatron = productKey === "guest_patron";
  const patronOk = isPatronAmountValid(
    patronAmountCents,
    patronMinCents,
    patronMaxCents,
  );

  const canSubmit =
    Boolean(productKey) && (!isPatron || patronOk) && !submitting;

  const priceLabel = isPatron
    ? formatWizardPrice(patronAmountCents, locale)
    : formatWizardPrice(fixedPriceCents ?? 0, locale);

  const label =
    !productKey
      ? t.selectFirst
      : isPatron
        ? t.ctaPatron(priceLabel)
        : t.cta(priceLabel);

  const handleCheckout = async () => {
    setError(null);
    if (!productKey) {
      setError(t.selectFirst);
      return;
    }
    if (isPatron && !patronOk) {
      setError(t.amountInvalid);
      return;
    }
    if (isSanctuaryVisualPreview(token)) {
      setError(t.previewBlocked);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/contribute/${encodeURIComponent(token)}/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productKey,
            locale,
            ...(isPatron ? { amountCents: patronAmountCents } : {}),
            ...(contributorName?.trim()
              ? { contributorName: contributorName.trim() }
              : {}),
            ...(contributorEmail?.trim()
              ? { contributorEmail: contributorEmail.trim() }
              : {}),
          }),
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        error?: string;
      };
      if (!res.ok || !body.ok || !body.url) {
        setError(t.errorGeneric);
        return;
      }
      window.location.assign(body.url);
    } catch {
      setError(t.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <button
        type="button"
        disabled={!canSubmit}
        onClick={() => void handleCheckout()}
        className={`${sanctuarySubmitButton} inline-flex min-h-[52px] w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {submitting ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {t.paying}
          </>
        ) : (
          label
        )}
      </button>
      {error ? (
        <p className="text-center text-sm font-light text-amber-200/90" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
