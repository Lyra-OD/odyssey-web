"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  packageCents,
  resolveWizardDisplayCart,
} from "@/src/lib/wizard/wizardPricing";
import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";
import type { WizardExtensionsState } from "@/src/lib/wizard/wizardPricing";

export type UseWizardCheckoutParams = {
  uploadProjectId: string | null;
  locale: string;
  flush: () => Promise<void>;
  isEditor: boolean;
  isPartner: boolean;
  currentStep: number;
  grantedPackage: WizardBasePackage;
  intendedPackage: WizardBasePackage;
  extensions: WizardExtensionsState;
  isFreemiumGrant: boolean;
  grantedMediaMax: number;
  projectMediaCount: number;
  copy: {
    checkoutMissingProject: string;
    checkoutPayError: string;
  };
};

export function useWizardCheckout({
  uploadProjectId,
  locale,
  flush,
  isEditor,
  isPartner,
  currentStep,
  grantedPackage,
  intendedPackage,
  extensions,
  isFreemiumGrant,
  grantedMediaMax,
  projectMediaCount,
  copy,
}: UseWizardCheckoutParams) {
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [fundCreditCents, setFundCreditCents] = useState(0);
  const [ownerFloorCents, setOwnerFloorCents] = useState(0);
  const [viralLoopEnabled, setViralLoopEnabled] = useState(false);
  const [riderAccepted, setRiderAccepted] = useState(false);

  const displayCart = useMemo(
    () =>
      resolveWizardDisplayCart(extensions, intendedPackage, grantedPackage),
    [extensions, intendedPackage, grantedPackage],
  );
  const showCheckoutStayFree =
    packageCents(grantedPackage) === 0 && displayCart.totalCents > 0;

  const excessMediaCount =
    isFreemiumGrant && projectMediaCount > grantedMediaMax
      ? projectMediaCount - grantedMediaMax
      : 0;

  useEffect(() => {
    if (isEditor) return;
    if (currentStep !== 7 || !uploadProjectId || isPartner) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/projects/${uploadProjectId}/fund-balance`,
        );
        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          availableCents?: number;
          ownerFloorCents?: number;
          viralLoopEnabled?: boolean;
        };
        if (cancelled || !res.ok || !body.ok) return;
        setFundCreditCents(Math.max(0, body.availableCents ?? 0));
        setOwnerFloorCents(Math.max(0, body.ownerFloorCents ?? 0));
        setViralLoopEnabled(body.viralLoopEnabled === true);
      } catch {
        /* graceful : crédit 0 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentStep, uploadProjectId, isPartner, isEditor]);

  const handlePay = useCallback(async () => {
    if (!uploadProjectId) {
      setPayError(copy.checkoutMissingProject);
      return;
    }

    setIsPaying(true);
    setPayError(null);

    try {
      await flush();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: uploadProjectId, locale }),
      });
      const data = (await res.json()) as {
        url?: string;
        redirectUrl?: string;
        mode?: string;
        message?: string;
        error?: string;
        maxMedia?: number;
        currentMedia?: number;
        fundAppliedCents?: number;
        payableCents?: number;
      };

      if (!res.ok) {
        if (
          data.error === "amputation_required" &&
          typeof data.message === "string"
        ) {
          setPayError(data.message);
          return;
        }
        if (
          data.error === "music_license_requires_payment" &&
          typeof data.message === "string"
        ) {
          setPayError(data.message);
          return;
        }
        setPayError(
          typeof data.message === "string"
            ? data.message
            : copy.checkoutPayError,
        );
        return;
      }

      if (data.mode === "partner" && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      if (data.mode === "freemium_free" && data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.mode === "fund_free" && data.url) {
        window.location.href = data.url;
        return;
      }

      if (!data.url) {
        setPayError(copy.checkoutPayError);
        return;
      }

      window.location.href = data.url;
    } catch {
      setPayError(copy.checkoutPayError);
    } finally {
      setIsPaying(false);
    }
  }, [uploadProjectId, locale, flush, copy]);

  return {
    isPaying,
    payError,
    setPayError,
    fundCreditCents,
    ownerFloorCents,
    viralLoopEnabled,
    riderAccepted,
    setRiderAccepted,
    showCheckoutStayFree,
    excessMediaCount,
    handlePay,
  };
}
