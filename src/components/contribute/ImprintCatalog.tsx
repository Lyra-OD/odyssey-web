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

export type ImprintCatalogProps = {
  locale: "fr" | "en";
  packs: readonly ImprintPack[];
  /** Sélection locale uniquement — pas de checkout à cette étape. */
  selectedKey: string | null;
  onSelect: (key: string) => void;
  /** Interaction voix. Rendue dans la carte `guest_voice` ouverte. */
  voiceSlot?: ReactNode;
  /** Interaction témoignage. Rendue dans la carte `guest_video` ouverte. */
  videoSlot?: ReactNode;
  /** Montant mécène. Rendu dans la carte `guest_patron` ouverte. */
  patronSlot?: ReactNode;
};

type ExpandCopy = { inspiration: string; body: string };

const EXPAND: Record<"fr" | "en", Record<string, ExpandCopy>> = {
  fr: {
    guest_voice: {
      inspiration: "Une voix qui reste, quand les jours passent.",
      body: "Enregistrez quelques mots, à votre rythme. Pour le film, pour ceux qui restent.",
    },
    guest_video: {
      inspiration: "Un regard. Une histoire.",
      body: "Enregistrez-vous face caméra. Votre présence, vivante, dans le film.",
    },
    guest_heritage: {
      inspiration: "Votre nom, au générique.",
      body: "Vous soutenez la production : version HD, partage, et votre nom inscrit dans le film.",
    },
    guest_candle: {
      inspiration: "Une lumière discrète.",
      body: "Un geste simple. Votre présence, sans enregistrement.",
    },
    guest_patron: {
      inspiration: "Un geste à la mesure de votre cœur.",
      body: "Choisissez le montant. Votre soutien aide à porter ce film plus loin.",
    },
  },
  en: {
    guest_voice: {
      inspiration: "A voice that remains, as the days go by.",
      body: "Record a few words, in your own time. For the film, for those who remain.",
    },
    guest_video: {
      inspiration: "A gaze. A story.",
      body: "Record yourself on camera. Your presence, alive, in the film.",
    },
    guest_heritage: {
      inspiration: "Your name, in the credits.",
      body: "You support the making: HD, share, and your name in the film.",
    },
    guest_candle: {
      inspiration: "A quiet light.",
      body: "A simple gesture. Your presence, with no recording.",
    },
    guest_patron: {
      inspiration: "A gift measured by the heart.",
      body: "Choose the amount. Your support helps carry this film further.",
    },
  },
};

const copy = {
  fr: {
    title: "Laissez une empreinte durable",
    promise: "Chaque empreinte aide à porter ce film plus loin.",
    patronRange: (min: number, max: number) =>
      `${formatWizardPrice(min, "fr")} – ${formatWizardPrice(max, "fr")}`,
  },
  en: {
    title: "Leave a lasting imprint",
    promise: "Every imprint helps carry this film further.",
    patronRange: (min: number, max: number) =>
      `${formatWizardPrice(min, "en")} – ${formatWizardPrice(max, "en")}`,
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
 * Étape 2 Sanctuaire — catalogue d'empreintes en cartes qui s'ouvrent.
 * Interaction (voix / mécène) vit dans la carte sélectionnée.
 */
export function ImprintCatalog({
  locale,
  packs,
  selectedKey,
  onSelect,
  voiceSlot,
  videoSlot,
  patronSlot,
}: ImprintCatalogProps) {
  const t = copy[locale];
  const primary = packs.filter((p) => !p.secondary);
  const secondary = packs.filter((p) => p.secondary);

  return (
    <div className="w-full space-y-6 text-left">
      <h3 className="text-center font-label text-[10px] font-medium uppercase tracking-[0.36em] text-teal-400/75">
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
            voiceSlot={voiceSlot}
            videoSlot={videoSlot}
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
              voiceSlot={voiceSlot}
              videoSlot={videoSlot}
              patronSlot={patronSlot}
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
  voiceSlot,
  videoSlot,
  patronSlot,
}: {
  pack: ImprintPack;
  locale: "fr" | "en";
  selected: boolean;
  onSelect: (key: string) => void;
  delayIndex: number;
  voiceSlot?: ReactNode;
  videoSlot?: ReactNode;
  patronSlot?: ReactNode;
}) {
  const expand = EXPAND[locale][pack.key];

  let interaction: ReactNode = null;
  if (selected) {
    if (pack.key === "guest_voice" && voiceSlot) {
      interaction = voiceSlot;
    } else if (pack.key === "guest_video" && videoSlot) {
      interaction = videoSlot;
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
            : "border-white/10 bg-white/[0.02] hover:border-teal-400/25 hover:bg-teal-400/[0.03]"
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
            <span className="block font-label text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-100">
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
              <div className="space-y-4 border-t border-teal-400/15 px-4 pb-5 pt-4">
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
