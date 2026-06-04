"use client";

import { motion } from "framer-motion";
import { Check, Crown, Music2, Vault, Wand2, type LucideIcon } from "lucide-react";
import Image from "next/image";

import { EXTENSION_VISUALS } from "@/src/lib/wizard/extensionVisuals";
import { toggleWizardExtension } from "@/src/lib/wizard/wizardExtensions";
import {
  computeWizardCart,
  extensionCents,
  formatWizardPrice,
  heritagePackIndividualTotalCents,
  heritagePackSavingsCents,
  WIZARD_PRICING,
  type ExtensionLineKey,
  type WizardBasePackage,
  type WizardExtensionsState,
} from "@/src/lib/wizard/wizardPricing";

export type MontageExtensionsStepCopy = {
  title: string;
  description: string;
  aiRetouchTitle: string;
  aiRetouchDescription: string;
  extendedLicenseTitle: string;
  extendedLicenseDescription: string;
  collectorUsbTitle: string;
  collectorUsbDescription: string;
  digitalVaultTitle: string;
  digitalVaultDescription: string;
  heritagePackTitle: string;
  heritagePackDescription: string;
  heritagePackSavings: string;
  heritagePackIncludes: string;
  selectedBadge: string;
  recapTitle: string;
  recapEmpty: string;
  recapLineLabels: Record<Exclude<ExtensionLineKey, "base">, string>;
};

type ExtensionCardConfig = {
  key: keyof WizardExtensionsState;
  icon?: LucideIcon;
  imageUrl?: string;
  imageAlt?: string;
  title: string;
  description: string;
  priceCents: number;
  accent: string;
  selectedRing: string;
  iconBg: string;
};

type Props = {
  copy: MontageExtensionsStepCopy;
  locale?: "fr" | "en";
  extensions: WizardExtensionsState;
  basePackage?: WizardBasePackage;
  onChange: (next: WizardExtensionsState) => void;
};

function isCardLocked(
  extensions: WizardExtensionsState,
  key: keyof WizardExtensionsState,
): boolean {
  if (!extensions.heritagePack) return false;
  return (
    key === "aiRetouch" ||
    key === "extendedLicense" ||
    key === "digitalVault"
  );
}

function ExtensionVisual({
  card,
}: {
  card: ExtensionCardConfig;
}) {
  if (card.imageUrl) {
    return (
      <div className="relative h-28 w-full overflow-hidden rounded-xl border border-white/10 bg-black/20">
        <Image
          src={card.imageUrl}
          alt={card.imageAlt ?? ""}
          fill
          className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, 320px"
          unoptimized
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>
    );
  }

  const Icon = card.icon ?? Wand2;
  return (
    <span
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${card.iconBg}`}
    >
      <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden />
    </span>
  );
}

export function MontageExtensionsStep({
  copy,
  locale = "fr",
  extensions,
  basePackage = "signature",
  onChange,
}: Props) {
  const cart = computeWizardCart(extensions, basePackage);
  const recapLines = cart.lineItems.filter((line) => line.key !== "base");

  const cards: ExtensionCardConfig[] = [
    {
      key: "aiRetouch",
      icon: Wand2,
      title: copy.aiRetouchTitle,
      description: copy.aiRetouchDescription,
      priceCents: extensionCents("aiRetouch"),
      accent: "text-teal-300",
      selectedRing:
        "border-teal-400/40 bg-teal-400/[0.04] shadow-[0_0_40px_rgba(45,212,191,0.18),0_0_24px_rgba(139,92,246,0.08)]",
      iconBg: "bg-teal-400/10 text-teal-300",
    },
    {
      key: "extendedLicense",
      icon: Music2,
      title: copy.extendedLicenseTitle,
      description: copy.extendedLicenseDescription,
      priceCents: extensionCents("extendedLicense"),
      accent: "text-indigo-300",
      selectedRing:
        "border-indigo-400/40 bg-indigo-400/[0.04] shadow-[0_0_40px_rgba(129,140,248,0.18),0_0_24px_rgba(45,212,191,0.06)]",
      iconBg: "bg-indigo-400/10 text-indigo-300",
    },
    {
      key: "collectorUsb",
      imageUrl: EXTENSION_VISUALS.collectorUsb.cardImage,
      imageAlt: EXTENSION_VISUALS.collectorUsb.alt,
      title: copy.collectorUsbTitle,
      description: copy.collectorUsbDescription,
      priceCents: extensionCents("collectorUsb"),
      accent: "text-zinc-200",
      selectedRing:
        "border-white/30 bg-white/[0.04] shadow-[0_0_36px_rgba(255,255,255,0.1),0_0_20px_rgba(167,139,250,0.08)]",
      iconBg: "bg-white/[0.08] text-zinc-300",
    },
    {
      key: "digitalVault",
      icon: Vault,
      title: copy.digitalVaultTitle,
      description: copy.digitalVaultDescription,
      priceCents: extensionCents("digitalVault"),
      accent: "text-violet-300",
      selectedRing:
        "border-violet-400/40 bg-violet-400/[0.04] shadow-[0_0_40px_rgba(167,139,250,0.2),0_0_24px_rgba(45,212,191,0.08)]",
      iconBg: "bg-violet-400/10 text-violet-300",
    },
  ];

  const toggle = (key: keyof WizardExtensionsState) => {
    if (isCardLocked(extensions, key)) return;
    onChange(toggleWizardExtension(extensions, key, !extensions[key]));
  };

  return (
    <div className="space-y-10 pb-44">
      <header className="space-y-3">
        <h2 className="font-[family-name:var(--font-label)] text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {copy.title}
        </h2>
        <p className="max-w-2xl text-sm font-light leading-relaxed text-zinc-400 md:text-base">
          {copy.description}
        </p>
      </header>

      <button
        type="button"
        onClick={() =>
          onChange(
            toggleWizardExtension(
              extensions,
              "heritagePack",
              !extensions.heritagePack,
            ),
          )
        }
        className={`group w-full rounded-2xl border px-5 py-5 text-left transition-all duration-300 hover:shadow-[0_16px_48px_rgba(0,0,0,0.35)] ${
          extensions.heritagePack
            ? "border-amber-400/35 bg-gradient-to-br from-amber-400/[0.08] to-violet-500/[0.06] shadow-[0_0_40px_rgba(251,191,36,0.12)]"
            : "border-white/10 bg-white/[0.02] hover:border-amber-400/20"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-400/15 text-amber-300">
              <Image
                src={EXTENSION_VISUALS.heritagePack.thumbnail}
                alt=""
                fill
                className="object-cover opacity-80"
                sizes="44px"
                unoptimized
              />
              <Crown
                className="relative z-[1] h-5 w-5"
                strokeWidth={1.8}
                aria-hidden
              />
            </span>
            <div>
              <p className="font-[family-name:var(--font-label)] text-lg font-medium text-zinc-100">
                {copy.heritagePackTitle}
              </p>
              <p className="mt-1 max-w-xl text-sm font-light text-zinc-500">
                {copy.heritagePackDescription}
              </p>
              <p className="mt-2 text-xs font-light text-amber-200/80">
                {copy.heritagePackIncludes}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-amber-200">
              {formatWizardPrice(
                WIZARD_PRICING.extensions.PACK_HERITAGE.priceCents,
                locale,
              )}
            </p>
            <p className="text-xs text-zinc-500 line-through">
              {formatWizardPrice(heritagePackIndividualTotalCents(), locale)}
            </p>
            <p className="mt-1 text-[11px] font-medium text-teal-400/90">
              {copy.heritagePackSavings.replace(
                "{savings}",
                formatWizardPrice(heritagePackSavingsCents(), locale),
              )}
            </p>
          </div>
        </div>
      </button>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((card) => {
          const selected = Boolean(extensions[card.key]);
          const locked = isCardLocked(extensions, card.key);
          const hasHeroImage = Boolean(card.imageUrl);

          return (
            <motion.button
              key={card.key}
              type="button"
              layout
              onClick={() => toggle(card.key)}
              disabled={locked}
              aria-pressed={selected}
              className={`group relative rounded-2xl border p-6 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)] ${
                selected
                  ? card.selectedRing
                  : "border-white/10 bg-white/[0.02] hover:border-white/15"
              } ${locked ? "cursor-default opacity-60" : ""}`}
            >
              <div
                className={`flex items-start justify-between gap-3 ${hasHeroImage ? "flex-col" : ""}`}
              >
                <ExtensionVisual card={card} />
                {selected ? (
                  <span className="inline-flex items-center gap-1 self-end rounded-full border border-teal-400/20 bg-teal-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-teal-200">
                    <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                    {copy.selectedBadge}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 font-[family-name:var(--font-label)] text-lg font-medium text-zinc-100">
                {card.title}
              </p>
              <p className="mt-3 text-base font-light leading-relaxed text-zinc-400">
                {card.description}
              </p>
              <p className={`mt-4 text-sm font-semibold ${card.accent}`}>
                {formatWizardPrice(card.priceCents, locale)}
              </p>
            </motion.button>
          );
        })}
      </div>

      <section
        className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent p-5"
        aria-labelledby="extensions-recap-heading"
      >
        <h3
          id="extensions-recap-heading"
          className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500"
        >
          {copy.recapTitle}
        </h3>
        {recapLines.length ? (
          <ul className="mt-4 space-y-3">
            {recapLines.map((line) => {
              const lineKey = line.key as Exclude<ExtensionLineKey, "base">;
              const visual = EXTENSION_VISUALS[lineKey];

              return (
                <li
                  key={line.key}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10">
                      <Image
                        src={visual.thumbnail}
                        alt={visual.alt}
                        fill
                        className="object-cover"
                        sizes="40px"
                        unoptimized
                      />
                    </div>
                    <span className="truncate font-light text-zinc-300">
                      {copy.recapLineLabels[lineKey]}
                    </span>
                  </div>
                  <span className="shrink-0 font-medium text-zinc-200">
                    {formatWizardPrice(line.cents, locale)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm font-light text-zinc-600">
            {copy.recapEmpty}
          </p>
        )}
      </section>
    </div>
  );
}
