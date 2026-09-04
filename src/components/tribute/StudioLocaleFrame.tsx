"use client";

import { useState } from "react";

import type { Locale } from "@/i18n.config";
import { DashboardSignOut } from "@/src/components/dashboard/DashboardSignOut";
import { LocaleSwitcher } from "@/src/components/i18n/LocaleSwitcher";
import {
  TributeWizard,
  type TributeWizardCopy,
} from "@/src/components/tribute/TributeWizard";
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
}: StudioLocaleFrameProps) {
  const [uiLocale, setUiLocale] = useState<Locale>(locale);
  const copy = uiLocale === "en" ? copyEn : copyFr;
  const labels = uiLocale === "en" ? labelsEn : labelsFr;

  return (
    <>
      <div className="pointer-events-none fixed right-4 top-4 z-[60] md:right-8 md:top-6">
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
              className="border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] tracking-[0.22em] text-white/55 shadow-none hover:border-white/16 hover:bg-white/[0.08] hover:text-white/80"
            />
          ) : null}
        </div>
      </div>

      <TributeWizard
        copy={copy}
        initialDraft={initialDraft}
        locale={uiLocale}
        isPartner={isPartner}
        planOverride={planOverride}
        accessRole={accessRole}
      />
    </>
  );
}
