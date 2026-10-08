"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

import { OdysseyLuminousText } from "@/src/components/marketing/OdysseyLuminousText";
import { editorialFont } from "@/src/lib/fonts";

import {
  DECK_BODY_CLASS,
  DECK_EYEBROW_CLASS,
  DECK_LABEL_CLASS,
  DECK_MODEL_LAST_STEP,
  DECK_MODEL_STEP,
  DECK_MODEL_WAITS_S,
  DECK_TITLE_CLASS,
  useDeckSoftDock,
  useDeckStepReveal,
} from "./deckSoftDock";
import { DeckVision } from "./DeckVision";
import { highlightDeckTeal } from "./deckTealText";

type DeckSlideModelProps = {
  tagline: string;
  title: string;
  phase: string;
  bullets: string[];
  active: boolean;
};

type SplitBullet = {
  label: string;
  body: string;
};

type TierRow = {
  price: string;
  name: string;
  blurb: string;
};

function splitLabeledBullet(raw: string): SplitBullet {
  const idx = raw.search(/\s*[:：]\s*/);
  if (idx < 0) return { label: "", body: raw };
  const sep = raw.slice(idx).match(/^(\s*[:：]\s*)/)?.[1] ?? ":";
  return {
    label: raw.slice(0, idx).trim(),
    body: raw.slice(idx + sep.length).trim(),
  };
}

/** Découpe forfaits en 3 colonnes : prix / nom / micro-ligne (sans double prix). */
function parseTierRows(body: string): TierRow[] {
  const chunks = body
    .split(/\.\s+/)
    .map((s) => s.replace(/\.$/, "").trim())
    .filter(Boolean);
  const rows: TierRow[] = [];
  for (const chunk of chunks) {
    const priced = chunk.match(
      /^([^:：]+)\s*[:：]\s*(.+?)\s*·\s*(\d[\d\s]*\s*\$|\$\d[\d,]*)$/,
    );
    if (priced) {
      rows.push({
        name: priced[1].trim(),
        blurb: priced[2].trim(),
        price: priced[3].replace(/\s+/g, "\u00a0"),
      });
      continue;
    }
    const priceMatch = chunk.match(/(\d[\d\s]*\s*\$|\$\d[\d,]*)/);
    rows.push({
      name: chunk.split(/[:：]/)[0]?.trim() ?? chunk,
      blurb: chunk,
      price: priceMatch?.[1]?.replace(/\s+/g, "\u00a0") ?? "",
    });
  }
  return rows;
}

function extractLeadPrice(body: string): string | null {
  const m = body.match(/(\d[\d\s]*\s*\$|\$\d[\d,]*)/);
  return m?.[1]?.replace(/\s+/g, "\u00a0") ?? null;
}

/**
 * Slide 7 — Model Soft Cap : diptyque forfaits | yield 22→43.
 */
export function DeckSlideModel({
  tagline,
  title,
  phase,
  bullets,
  active,
}: DeckSlideModelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { advance, visible, canAdvance } = useDeckStepReveal(
    active,
    DECK_MODEL_WAITS_S,
    DECK_MODEL_LAST_STEP,
  );
  const canAdvanceRef = useRef(canAdvance);
  const advanceRef = useRef(advance);
  canAdvanceRef.current = canAdvance;
  advanceRef.current = advance;

  const [tiersBullet, economicsBullet, yieldBullet, viralBullet] = bullets
    .map(splitLabeledBullet)
    .slice(0, 4);
  const tierRows = parseTierRows(tiersBullet?.body ?? "");
  const yieldPrice = extractLeadPrice(yieldBullet?.body ?? "") ?? "22\u00a0$";
  const viralPrice = extractLeadPrice(viralBullet?.body ?? "") ?? "43\u00a0$";

  const dockEyebrow = useDeckSoftDock(visible(DECK_MODEL_STEP.eyebrow));
  const dockHero = useDeckSoftDock(visible(DECK_MODEL_STEP.hero));
  const dockPhase = useDeckSoftDock(visible(DECK_MODEL_STEP.phase));
  const dockTiers = useDeckSoftDock(visible(DECK_MODEL_STEP.tiers));
  const dockEconomics = useDeckSoftDock(visible(DECK_MODEL_STEP.economics));
  const dockYield = useDeckSoftDock(visible(DECK_MODEL_STEP.yield));
  const dockArc = useDeckSoftDock(visible(DECK_MODEL_STEP.arc));
  const dockViral = useDeckSoftDock(visible(DECK_MODEL_STEP.viral));

  useEffect(() => {
    if (!active) return;
    const section = rootRef.current?.closest("[data-deck-slide]");
    if (!(section instanceof HTMLElement)) return;

    const onClick = (e: MouseEvent) => {
      if (!canAdvanceRef.current) return;
      if (!(e.target instanceof Element)) return;
      if (
        e.target.closest("a, button, input, textarea, select, [role='button']")
      ) {
        return;
      }
      e.preventDefault();
      advanceRef.current();
    };

    section.addEventListener("click", onClick);
    return () => section.removeEventListener("click", onClick);
  }, [active]);

  return (
    <div
      ref={rootRef}
      className={`relative mx-auto flex w-full max-w-[110rem] flex-col px-2 md:px-4 lg:px-6 ${
        canAdvance ? "cursor-pointer" : ""
      }`}
    >
      <div className="relative z-10 mx-auto flex w-full max-w-[90rem] -translate-y-[42%] flex-col items-center text-center">
        <motion.p className={DECK_EYEBROW_CLASS} {...dockEyebrow()}>
          {tagline}
        </motion.p>

        <motion.h2
          className={`${editorialFont.className} ${DECK_TITLE_CLASS}`}
          {...dockHero()}
        >
          <OdysseyLuminousText variant="deck">{title}</OdysseyLuminousText>
        </motion.h2>

        <DeckVision text={phase} {...dockPhase()} />
      </div>

      {/* Diptyque : forfaits + économie | yield → boucle */}
      <div className="relative z-10 mx-auto mt-2 grid w-full max-w-[96rem] grid-cols-1 gap-14 md:mt-0 md:grid-cols-2 md:gap-16 lg:gap-24">
        {/* Gauche */}
        <div className="flex flex-col gap-10 text-left">
          {tiersBullet ? (
            <motion.div {...dockTiers()}>
              {tiersBullet.label ? (
                <p className={DECK_LABEL_CLASS}>{tiersBullet.label}</p>
              ) : null}
              <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-8">
                {tierRows.map((row, i) => (
                  <div
                    key={`${row.name}-${row.price}`}
                    className={`flex flex-col text-left ${
                      i > 0
                        ? "sm:border-l sm:border-[rgba(200,225,230,0.18)] sm:pl-6 lg:pl-8"
                        : ""
                    }`}
                  >
                    <p
                      className={`${editorialFont.className} text-[clamp(1.65rem,2.8vw,2.35rem)] font-medium leading-none tracking-[0.01em] text-[var(--salon-cyan)]`}
                    >
                      {row.price}
                    </p>
                    <p className={`${DECK_LABEL_CLASS} mt-4 tracking-[0.22em]`}>
                      {row.name}
                    </p>
                    <p className={`${DECK_BODY_CLASS} mt-2.5`}>
                      {highlightDeckTeal(row.blurb)}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : null}

          {economicsBullet ? (
            <motion.div {...dockEconomics()}>
              {economicsBullet.label ? (
                <p className={DECK_LABEL_CLASS}>{economicsBullet.label}</p>
              ) : null}
              <p className={`${DECK_BODY_CLASS} mt-3`}>
                {highlightDeckTeal(economicsBullet.body)}
              </p>
            </motion.div>
          ) : null}
        </div>

        {/* Droite */}
        <div className="flex flex-col text-left">
          {yieldBullet ? (
            <motion.div {...dockYield()}>
              {yieldBullet.label ? (
                <p className={DECK_LABEL_CLASS}>{yieldBullet.label}</p>
              ) : null}
              <p
                className={`${editorialFont.className} mt-4 text-[clamp(2.4rem,5vw,3.6rem)] font-medium leading-none tracking-[0.01em] text-[var(--salon-cyan)]`}
              >
                {yieldPrice}
              </p>
              <p className={`${DECK_BODY_CLASS} mt-4`}>
                {highlightDeckTeal(yieldBullet.body)}
              </p>
            </motion.div>
          ) : null}

          <motion.div
            className="my-7 hidden h-px w-full max-w-[12rem] bg-[rgba(200,225,230,0.28)] md:block"
            aria-hidden
            {...dockArc()}
          />
          <motion.div
            className="my-6 h-px w-16 bg-[rgba(200,225,230,0.28)] md:hidden"
            aria-hidden
            {...dockArc()}
          />

          {viralBullet ? (
            <motion.div {...dockViral()}>
              {viralBullet.label ? (
                <p className={DECK_LABEL_CLASS}>{viralBullet.label}</p>
              ) : null}
              <p
                className={`${editorialFont.className} mt-4 text-[clamp(2.4rem,5vw,3.6rem)] font-medium leading-none tracking-[0.01em] text-[var(--salon-cyan)]`}
              >
                {viralPrice}
              </p>
              <p className={`${DECK_BODY_CLASS} mt-4`}>
                {highlightDeckTeal(viralBullet.body)}
              </p>
            </motion.div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
