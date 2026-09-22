"use client";

import { useEffect, useState } from "react";

import type { Locale } from "@/i18n.config";
import { DashboardSignOut } from "@/src/components/dashboard/DashboardSignOut";
import { LocaleSwitcher } from "@/src/components/i18n/LocaleSwitcher";
import {
  TributeWizard,
  type TributeWizardCopy,
} from "@/src/components/tribute/TributeWizard";
import type { WizardSessionHubCopy } from "@/src/components/tribute/WizardSessionProjection";
import type { WizardAccessRole } from "@/src/lib/wizard/collabCapabilities";
import type { WizardInitialDraft } from "@/src/lib/wizard/wizardState";

type StudioLocaleLabels = {
  languageLabel: string;
  langOptionFr: string;
  langOptionEn: string;
  signOut: string;
};

type StudioLocaleFrameProps = {
  locale: Locale;
  copyFr: TributeWizardCopy;
  copyEn: TributeWizardCopy;
  labelsFr: StudioLocaleLabels;
  labelsEn: StudioLocaleLabels;
  showSignOut: boolean;
  initialDraft?: WizardInitialDraft | null;
  isPartner?: boolean;
  planOverride?: string;
  accessRole?: WizardAccessRole;
  exitHubCopyFr: WizardSessionHubCopy;
  exitHubCopyEn: WizardSessionHubCopy;
  checkoutReturn?: "master_success" | "master_cancel" | null;
};

/**
 * Switch FR/EN sans remonter le ciel : les deux copies voyagent dans le
 * payload, comme le ciel invité. Évite le cache RSC de `/en/studio`.
 */
export function StudioLocaleFrame({
  locale,
  copyFr,
  copyEn,
  labelsFr,
  labelsEn,
  showSignOut,
  initialDraft = null,
  isPartner = false,
  planOverride,
  accessRole = "owner",
  exitHubCopyFr,
  exitHubCopyEn,
  checkoutReturn = null,
}: StudioLocaleFrameProps) {
  const [uiLocale, setUiLocale] = useState<Locale>(locale);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const copy = uiLocale === "en" ? copyEn : copyFr;
  const labels = uiLocale === "en" ? labelsEn : labelsFr;
  const exitHub = uiLocale === "en" ? exitHubCopyEn : exitHubCopyFr;
  const masterEntitled = checkoutReturn === "master_success";

  useEffect(() => {
    if (checkoutReturn === "master_success") {
      setCheckoutNotice(exitHub.masterSuccessNotice);
    } else if (checkoutReturn === "master_cancel") {
      setCheckoutNotice(exitHub.masterCancelNotice);
    }
  }, [
    checkoutReturn,
    exitHub.masterCancelNotice,
    exitHub.masterSuccessNotice,
  ]);

  return (
    <>
      <div className="pointer-events-none fixed right-8 top-6 z-[60] hidden md:block">
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <LocaleSwitcher
            lang={uiLocale}
            languageLabel={labels.languageLabel}
            langOptionFr={labels.langOptionFr}
            langOptionEn={labels.langOptionEn}
            onSwitch={setUiLocale}
          />
          {showSignOut ? (
            <DashboardSignOut
              lang={uiLocale}
              label={labels.signOut}
              className="rounded-lg border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] tracking-[0.22em] text-white/55 shadow-none hover:border-white/16 hover:bg-white/[0.08] hover:text-white/80"
            />
          ) : null}
        </div>
      </div>

      {checkoutNotice ? (
        <div
          className="mb-6 rounded-sm border border-white/10 bg-white/[0.03] px-4 py-3 text-center"
          role="status"
        >
          <p className="text-[13px] font-light tracking-wide text-zinc-200">
            {checkoutNotice}
          </p>
          <button
            type="button"
            onClick={() => setCheckoutNotice(null)}
            className="mt-2 text-[11px] font-light tracking-[0.14em] text-zinc-500 underline decoration-white/20 underline-offset-4 hover:text-zinc-300"
          >
            {exitHub.noticeDismiss}
          </button>
        </div>
      ) : null}

      <TributeWizard
        copy={copy}
        initialDraft={initialDraft}
        locale={uiLocale}
        isPartner={isPartner}
        planOverride={planOverride}
        accessRole={accessRole}
        exitHubCopy={exitHub}
        masterEntitled={masterEntitled}
        mobileUtilityTrailing={
          <>
            <LocaleSwitcher
              lang={uiLocale}
              languageLabel={labels.languageLabel}
              langOptionFr={labels.langOptionFr}
              langOptionEn={labels.langOptionEn}
              onSwitch={setUiLocale}
            />
            {showSignOut ? (
              <DashboardSignOut
                lang={uiLocale}
                label={labels.signOut}
                className="min-h-0 rounded-md border-white/8 bg-white/[0.03] px-2.5 py-1 text-[9px] font-medium tracking-[0.18em] text-white/45 shadow-none hover:border-white/14 hover:bg-white/[0.06] hover:text-white/70"
              />
            ) : null}
          </>
        }
      />
    </>
  );
}
