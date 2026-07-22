"use client";

import { motion } from "framer-motion";

import {
  DURATION_BREATH,
  EASE_OUT_LUXE,
} from "@/src/lib/motion/easing";
import { formatWizardPrice } from "@/src/lib/wizard/wizardPricing";

/** Pack tel que renvoyé par GET /api/contribute/[token] (ou preview). */
export type ImprintPack = {
  key: string;
  label: string;
  priceCents: number;
  secondary?: boolean;
  amountMinCents?: number | null;
  amountMaxCents?: number | null;
  amountSuggestedCents?: number | null;
};

export type ImprintCatalogProps = {
  locale: "fr" | "en";
  packs: readonly ImprintPack[];
  /** Sélection locale uniquement — pas de checkout à cette étape. */
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

const copy = {
  fr: {
    title: "Laissez une empreinte durable",
    promise:
      "Voix et témoignage filmé : soumis à la famille pour intégration dans l'œuvre.",
    patronRange: (min: number, max: number) =>
      `${formatWizardPrice(min, "fr")} – ${formatWizardPrice(max, "fr")}`,
    selected: "Sélectionné",
  },
  en: {
    title: "Leave a lasting imprint",
    promise:
      "Voice and filmed testimony: submitted to the family for inclusion in the work.",
    patronRange: (min: number, max: number) =>
      `${formatWizardPrice(min, "en")} – ${formatWizardPrice(max, "en")}`,
    selected: "Selected",
  },
} as const;

function priceLabel(pack: ImprintPack, locale: "fr" | "en"): string {
  if (pack.key === "guest_patron") {
    const min = pack.amountMinCents ?? 15_000;
    const max = pack.amountMaxCents ?? 100_000;
    return copy[locale].patronRange(min, max);
  }
  return formatWizardPrice(pack.priceCents, locale);
}

/**
 * Étape 2 Sanctuaire — catalogue d'empreintes (UI seule).
 * Pas de Stripe / PatronAmountField ici — lots suivants.
 */
export function ImprintCatalog({
  locale,
  packs,
  selectedKey,
  onSelect,
}: ImprintCatalogProps) {
  const t = copy[locale];
  const primary = packs.filter((p) => !p.secondary);
  const secondary = packs.filter((p) => p.secondary);

  return (
    <div className="w-full space-y-6 text-left">
      <h3 className="text-center font-label text-[10px] font-medium uppercase tracking-[0.36em] text-[#C4B5A0]/80">
        {t.title}
      </h3>

      <ul className="space-y-3" role="listbox" aria-label={t.title}>
        {primary.map((pack, i) => (
          <PackRow
            key={pack.key}
            pack={pack}
            locale={locale}
            selected={selectedKey === pack.key}
            onSelect={onSelect}
            delayIndex={i}
          />
        ))}
      </ul>

      {secondary.length > 0 ? (
        <ul className="space-y-3 border-t border-white/10 pt-5" role="listbox">
          {secondary.map((pack, i) => (
            <PackRow
              key={pack.key}
              pack={pack}
              locale={locale}
              selected={selectedKey === pack.key}
              onSelect={onSelect}
              delayIndex={primary.length + i}
            />
          ))}
        </ul>
      ) : null}

      <p className="text-center text-[11px] font-light leading-relaxed text-zinc-500">
        {t.promise}
      </p>
    </div>
  );
}

function PackRow({
  pack,
  locale,
  selected,
  onSelect,
  delayIndex,
}: {
  pack: ImprintPack;
  locale: "fr" | "en";
  selected: boolean;
  onSelect: (key: string) => void;
  delayIndex: number;
}) {
  const t = copy[locale];

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: DURATION_BREATH,
        ease: EASE_OUT_LUXE,
        delay: delayIndex * 0.04,
      }}
    >
      <button
        type="button"
        role="option"
        aria-selected={selected}
        onClick={() => onSelect(pack.key)}
        className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-4 text-left transition-colors duration-300 ${
          selected
            ? "border-violet-400/40 bg-violet-500/[0.08]"
            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
        }`}
      >
        <span className="min-w-0">
          <span className="block font-label text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-100">
            {pack.label}
          </span>
          {selected ? (
            <span className="mt-1 block text-[10px] uppercase tracking-[0.28em] text-violet-300/80">
              {t.selected}
            </span>
          ) : null}
        </span>
        <span
          className={`shrink-0 font-editorial text-lg tabular-nums tracking-tight ${
            selected ? "text-zinc-50" : "text-zinc-300"
          }`}
        >
          {priceLabel(pack, locale)}
        </span>
      </button>
    </motion.li>
  );
}
