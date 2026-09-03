"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { connexionSubmitButtonClass } from "@/src/components/salon/SalonCyanGlowText";
import { isPatronAmountValid } from "@/src/components/contribute/PatronAmountField";
import { isSanctuaryVisualPreview } from "@/src/lib/contribute/sanctuaryPreview";
import { SANCTUARY_LAST_IMPRINT_KEY } from "@/src/lib/contribute/sanctuaryChrome";
import { parseApiJson } from "@/src/lib/http/parseApiJson";
import { formatWizardPrice } from "@/src/lib/wizard/wizardPricing";
import type { AppDictionary } from "@/lib/dictionaries";

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
  /** Requis si productKey === guest_voice | guest_video */
  mediaId?: string | null;
  copy: AppDictionary["sanctuary"];
};

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
  mediaId,
  copy: t,
}: ImprintCheckoutCtaProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPatron = productKey === "guest_patron";
  const isVoice = productKey === "guest_voice";
  const isVideo = productKey === "guest_video";
  const patronOk = isPatronAmountValid(
    patronAmountCents,
    patronMinCents,
    patronMaxCents,
  );
  const captureOk = (!isVoice && !isVideo) || Boolean(mediaId);

  const canSubmit =
    Boolean(productKey) &&
    (!isPatron || patronOk) &&
    captureOk &&
    !submitting;

  const priceLabel = isPatron
    ? formatWizardPrice(patronAmountCents, locale)
    : formatWizardPrice(fixedPriceCents ?? 0, locale);

  const withPrice = (template: string) =>
    template.replace("{price}", priceLabel);

  const label =
    !productKey
      ? t.checkoutSelectFirst
      : isVoice && !mediaId
        ? t.checkoutVoiceRequired
        : isVideo && !mediaId
          ? t.checkoutVideoRequired
          : isPatron
            ? withPrice(t.checkoutCtaPatron)
            : withPrice(t.checkoutCta);

  const handleCheckout = async () => {
    setError(null);
    if (!productKey) {
      setError(t.checkoutSelectFirst);
      return;
    }
    if (isPatron && !patronOk) {
      setError(t.checkoutAmountInvalid);
      return;
    }
    if (isVoice && !mediaId) {
      setError(t.checkoutVoiceRequired);
      return;
    }
    if (isVideo && !mediaId) {
      setError(t.checkoutVideoRequired);
      return;
    }
    if (isSanctuaryVisualPreview(token)) {
      setError(t.checkoutPreviewBlocked);
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
            ...((isVoice || isVideo) && mediaId ? { mediaId } : {}),
            ...(contributorName?.trim()
              ? { contributorName: contributorName.trim() }
              : {}),
            ...(contributorEmail?.trim()
              ? { contributorEmail: contributorEmail.trim() }
              : {}),
          }),
        },
      );
      const body = await parseApiJson<{
        ok?: boolean;
        url?: string;
        error?: string;
      }>(res);
      if (!res.ok || !body.ok || !body.url) {
        setError(
          body.error === "voice_recording_required"
            ? t.checkoutVoiceRequired
            : body.error === "video_recording_required"
              ? t.checkoutVideoRequired
              : t.checkoutError,
        );
        return;
      }
      try {
        sessionStorage.setItem(SANCTUARY_LAST_IMPRINT_KEY, productKey);
      } catch {
        /* private mode / quota — rituel Lueur soft-fail */
      }
      window.location.assign(body.url);
    } catch {
      setError(t.checkoutError);
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
        className={`parcours-monolith-continue ${connexionSubmitButtonClass} min-h-[52px] touch-manipulation`}
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {t.checkoutPaying}
          </span>
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
