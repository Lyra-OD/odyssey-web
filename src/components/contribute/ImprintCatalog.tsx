"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { sanctuarySelectBreathe } from "@/src/lib/contribute/sanctuaryChrome";
import {
  DURATION_BREATH,
  DURATION_RITUAL,
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

export type ImprintPackExpand = {
  inspiration: string;
  body: string;
};

export type ImprintCatalogProps = {
  locale: "fr" | "en";
  packs: readonly ImprintPack[];
  /** Sélection locale uniquement — pas de checkout à cette étape. */
  selectedKey: string | null;
  onSelect: (key: string) => void;
  title: string;
  promise: string;
  expand: Record<string, ImprintPackExpand>;
  /** Interaction voix. Rendue dans la carte `guest_voice` ouverte. */
  voiceSlot?: ReactNode;
  /** Interaction témoignage. Rendue dans la carte `guest_video` ouverte. */
  videoSlot?: ReactNode;
  /** Présence Lueur. Rendue dans la carte `guest_candle` ouverte. */
  lueurSlot?: ReactNode;
  /** Montant mécène. Rendu dans la carte `guest_patron` ouverte. */
  patronSlot?: ReactNode;
};

function priceLabel(pack: ImprintPack, locale: "fr" | "en"): string {
  if (pack.key === "guest_patron") {
    const min = pack.amountMinCents ?? 15_000;
    const max = pack.amountMaxCents ?? 100_000;
    return `${formatWizardPrice(min, locale)} – ${formatWizardPrice(max, locale)}`;
  }
  return formatWizardPrice(pack.priceCents, locale);
}

/**
 * Étape 2 Sanctuaire — catalogue d'empreintes en cartes qui s'ouvrent.
 * Interaction (voix / mécène) vit dans la carte sélectionnée.
 */
export function ImprintCatalog({
  locale,
  packs,
  selectedKey,
  onSelect,
  title,
  promise,
  expand,
  voiceSlot,
  videoSlot,
  lueurSlot,
  patronSlot,
}: ImprintCatalogProps) {
  const primary = packs.filter((p) => !p.secondary);
  const secondary = packs.filter((p) => p.secondary);

  return (
    <div className="w-full space-y-6 text-left">
      <h3 className="text-center font-editorial text-2xl font-medium tracking-tight text-zinc-50 md:text-3xl">
        {title}
      </h3>

      <ul className="space-y-3" role="listbox" aria-label={title}>
        {primary.map((pack, i) => (
          <PackRow
            key={pack.key}
            pack={pack}
            locale={locale}
            selected={selectedKey === pack.key}
            onSelect={onSelect}
            delayIndex={i}
            expand={expand[pack.key]}
            voiceSlot={voiceSlot}
            videoSlot={videoSlot}
            lueurSlot={lueurSlot}
            patronSlot={patronSlot}
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
              expand={expand[pack.key]}
              voiceSlot={voiceSlot}
              videoSlot={videoSlot}
              lueurSlot={lueurSlot}
              patronSlot={patronSlot}
            />
          ))}
        </ul>
      ) : null}

      <p className="text-center text-[11px] font-light leading-relaxed text-zinc-500">
        {promise}
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
  expand,
  voiceSlot,
  videoSlot,
  lueurSlot,
  patronSlot,
}: {
  pack: ImprintPack;
  locale: "fr" | "en";
  selected: boolean;
  onSelect: (key: string) => void;
  delayIndex: number;
  expand?: ImprintPackExpand;
  voiceSlot?: ReactNode;
  videoSlot?: ReactNode;
  lueurSlot?: ReactNode;
  patronSlot?: ReactNode;
}) {
  let interaction: ReactNode = null;
  if (selected) {
    if (pack.key === "guest_voice" && voiceSlot) {
      interaction = voiceSlot;
    } else if (pack.key === "guest_video" && videoSlot) {
      interaction = videoSlot;
    } else if (pack.key === "guest_candle" && lueurSlot) {
      interaction = lueurSlot;
    } else if (pack.key === "guest_patron" && patronSlot) {
      interaction = patronSlot;
    }
  }

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
      <div
        className={`rounded-xl border transition-[border-color,box-shadow,background-color] duration-300 ${
          selected
            ? `${sanctuarySelectBreathe} border-teal-400/40 bg-teal-400/[0.06]`
            : "border-white/10 bg-white/[0.04] hover:border-teal-400/25 hover:bg-teal-400/[0.05]"
        }`}
      >
        <button
          type="button"
          role="option"
          aria-selected={selected}
          aria-expanded={selected}
          onClick={() => onSelect(pack.key)}
          className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
        >
          <span className="min-w-0">
            <span className="block font-label text-[11px] font-medium uppercase leading-snug tracking-[0.18em] text-zinc-100">
              {pack.label}
            </span>
          </span>
          <span
            className={`shrink-0 font-editorial text-lg tabular-nums tracking-tight ${
              selected ? "text-teal-100" : "text-zinc-300"
            }`}
          >
            {priceLabel(pack, locale)}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {selected && expand ? (
            <motion.div
              key={`expand-${pack.key}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: DURATION_RITUAL, ease: EASE_OUT_LUXE }}
              className="overflow-hidden"
            >
              <div
                className={`space-y-4 border-t border-teal-400/15 px-4 pb-5 pt-4 ${
                  pack.key === "guest_candle"
                    ? "rounded-b-[0.7rem] bg-black"
                    : ""
                }`}
              >
                <div className="space-y-2 text-center md:text-left">
                  <p className="font-editorial text-lg leading-snug text-zinc-50 md:text-xl">
                    {expand.inspiration}
                  </p>
                  <p className="text-sm font-light leading-relaxed text-white/55">
                    {expand.body}
                  </p>
                </div>
                {interaction ? (
                  <div className="pt-1">{interaction}</div>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}
