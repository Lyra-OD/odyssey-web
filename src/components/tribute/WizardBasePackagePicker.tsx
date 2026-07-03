"use client";

import {
  WIZARD_B2C_DIRECT_PACKAGES,
  bundleSavingsDollarsLabel,
  calculateBundleSavings,
  formatWizardPrice,
  packageCents,
  WIZARD_PARTNER_GRANTED_PACKAGES,
  WIZARD_PRICING,
  type WizardBasePackage,
} from "@/src/lib/wizard/wizardPricing";

export type WizardBasePackagePickerCopy = {
  title: string;
  hint: string;
  essentialLabel: string;
  essentialDescription: string;
  signatureLabel: string;
  signatureDescription: string;
  heritageLabel: string;
  heritageDescription: string;
  legendaryLabel?: string;
  legendaryDescription?: string;
  /** « Le choix complet (Économisez {savings} $) » */
  heritageBundlePromo: string;
};

type Props = {
  copy: WizardBasePackagePickerCopy;
  locale?: "fr" | "en";
  value: WizardBasePackage;
  onChange: (pkg: WizardBasePackage) => void;
  compact?: boolean;
  /** Liste explicite de packages autorisés dans ce contexte. */
  availablePackages?: readonly WizardBasePackage[];
  /** Masque les montants B2C (partenaire B2B). */
  hidePrices?: boolean;
};

export function WizardBasePackagePicker({
  copy,
  locale = "fr",
  value,
  onChange,
  compact = false,
  availablePackages,
  hidePrices = false,
}: Props) {
  const heritageSavingsCents = calculateBundleSavings(
    WIZARD_PRICING.packages.HERITAGE.id,
  );
  const heritageSavingsLabel = bundleSavingsDollarsLabel(heritageSavingsCents);

  const defaultLegendaryLabel = locale === "en" ? "Legendary" : "Légendaire";
  const defaultLegendaryDescription =
    locale === "en"
      ? "White Gloves service, 4K finish, and premium handling."
      : "Service Gants Blancs, finition 4K et prise en charge premium.";

  const displayedPackages =
    availablePackages && availablePackages.length > 0
      ? availablePackages
      : hidePrices
        ? WIZARD_PARTNER_GRANTED_PACKAGES
        : WIZARD_B2C_DIRECT_PACKAGES;

  const labels: Record<
    WizardBasePackage,
    { label: string; description: string }
  > = {
    essential: {
      label: copy.essentialLabel,
      description: copy.essentialDescription,
    },
    signature: {
      label: copy.signatureLabel,
      description: copy.signatureDescription,
    },
    heritage: {
      label: copy.heritageLabel,
      description: copy.heritageDescription,
    },
    legendary: {
      label: copy.legendaryLabel ?? defaultLegendaryLabel,
      description:
        copy.legendaryDescription ?? defaultLegendaryDescription,
    },
  };

  return (
    <div
      className={compact ? "mt-6" : "mt-10"}
      role="group"
      aria-label={copy.title}
    >
      {!compact ? (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500">
            {copy.title}
          </p>
          <p className="mt-2 text-sm font-light text-zinc-500">{copy.hint}</p>
        </>
      ) : (
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500">
          {copy.title}
        </p>
      )}

      <div
        className={`mt-4 grid grid-cols-1 gap-3 ${
          displayedPackages.length >= 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
        {displayedPackages.map((pkgId) => {
          const selected = value === pkgId;
          const meta = labels[pkgId];
          const price = formatWizardPrice(packageCents(pkgId), locale);
          const isHeritage = pkgId === WIZARD_PRICING.packages.HERITAGE.id;
          const showBundlePromo =
            isHeritage && heritageSavingsCents > 0 && !hidePrices;

          return (
            <button
              key={pkgId}
              type="button"
              onClick={() => onChange(pkgId)}
              aria-pressed={selected}
              className={`rounded-2xl border px-4 py-4 text-left transition-[border,box-shadow] ${
                selected
                  ? "border-violet-400/40 bg-violet-500/[0.08] shadow-[0_0_28px_rgba(139,92,246,0.18)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/16"
              } ${isHeritage ? "ring-1 ring-amber-400/15" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-[family-name:var(--font-label)] text-sm font-medium text-zinc-100">
                  {meta.label}
                </span>
                {!hidePrices ? (
                  <span className="shrink-0 text-sm font-medium tabular-nums text-teal-300/90">
                    {price}
                  </span>
                ) : null}
              </div>
              {showBundlePromo ? (
                <p className="mt-2 text-[11px] font-medium leading-snug text-amber-200/95">
                  {copy.heritageBundlePromo.replace(
                    "{savings}",
                    heritageSavingsLabel,
                  )}
                </p>
              ) : null}
              <p className="mt-1.5 text-xs font-light leading-relaxed text-zinc-500">
                {meta.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
