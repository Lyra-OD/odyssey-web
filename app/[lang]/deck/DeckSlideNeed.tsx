"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

import { editorialFont } from "@/src/lib/fonts";

import {
  DECK_DOCK_DUR,
  DECK_EYEBROW_CLASS,
  DECK_FILM_EASE,
  DECK_NEED_LAST_STEP,
  DECK_NEED_STEP,
  DECK_NEED_WAITS_S,
  useDeckSoftDock,
  useDeckStepReveal,
} from "./deckSoftDock";

type DeckSlideNeedProps = {
  tagline: string;
  title: string;
  phase: string;
  bullets: string[];
  /** Slide active (index deck) — relance le tempo film à chaque entrée. */
  active: boolean;
};

type SplitBullet = {
  label: string;
  body: string;
};

function splitLabeledBullet(raw: string): SplitBullet {
  const idx = raw.search(/\s*[:：]\s*/);
  if (idx < 0) return { label: "", body: raw };
  const match = raw.slice(idx).match(/^(\s*[:：]\s*)/);
  const sepLen = match?.[1]?.length ?? 1;
  return {
    label: raw.slice(0, idx).trim(),
    body: raw.slice(idx + sepLen).trim(),
  };
}

function isBridgeLabel(label: string) {
  const n = label.toLowerCase();
  return (
    n.includes("pont") ||
    n.includes("bridge") ||
    n.includes("investisseur") ||
    n.includes("investor")
  );
}

const COL_STEPS = [
  DECK_NEED_STEP.col0,
  DECK_NEED_STEP.col1,
  DECK_NEED_STEP.col2,
] as const;

/**
 * Slide 2 — Need.
 * Tempo auto · clic (n’importe où sur la slide) = saute l’attente · fil cyan.
 * Eyebrow/title/phase centrés · triptyque plus large.
 */
export function DeckSlideNeed({
  tagline,
  title,
  phase,
  bullets,
  active,
}: DeckSlideNeedProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { advance, visible, canAdvance } = useDeckStepReveal(
    active,
    DECK_NEED_WAITS_S,
    DECK_NEED_LAST_STEP,
  );
  const canAdvanceRef = useRef(canAdvance);
  const advanceRef = useRef(advance);
  canAdvanceRef.current = canAdvance;
  advanceRef.current = advance;

  const parsed = bullets.map(splitLabeledBullet);
  const bridgeIdx = parsed.findIndex((b) => isBridgeLabel(b.label));
  const times =
    bridgeIdx >= 0
      ? parsed.filter((_, i) => i !== bridgeIdx)
      : parsed.slice(0, -1);
  const bridge =
    bridgeIdx >= 0
      ? parsed[bridgeIdx]
      : parsed.length > 0
        ? parsed[parsed.length - 1]
        : null;

  const dockEyebrow = useDeckSoftDock(visible(DECK_NEED_STEP.eyebrow));
  const dockHero = useDeckSoftDock(visible(DECK_NEED_STEP.hero));
  const dockPhase = useDeckSoftDock(visible(DECK_NEED_STEP.phase));
  const dockCol0 = useDeckSoftDock(visible(DECK_NEED_STEP.col0));
  const dockCol1 = useDeckSoftDock(visible(DECK_NEED_STEP.col1));
  const dockCol2 = useDeckSoftDock(visible(DECK_NEED_STEP.col2));
  const dockBridge = useDeckSoftDock(visible(DECK_NEED_STEP.bridge));
  const dockCols = [dockCol0, dockCol1, dockCol2];

  /** Clic plein slide (section parente) — pas seulement le bloc texte. */
  useEffect(() => {
    if (!active) return;
    const section = rootRef.current?.closest("[data-deck-slide]");
    if (!(section instanceof HTMLElement)) return;

    const onClick = (e: MouseEvent) => {
      if (!canAdvanceRef.current) return;
      if (!(e.target instanceof Element)) return;
      if (e.target.closest("a, button, input, textarea, select, [role='button']")) {
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
      className={`relative mx-auto flex w-full max-w-[80rem] flex-col items-center px-2 ${
        canAdvance ? "cursor-pointer" : ""
      }`}
    >
      <motion.p className={DECK_EYEBROW_CLASS} {...dockEyebrow()}>
        {tagline}
      </motion.p>

      <motion.h2
        className={`${editorialFont.className} relative z-10 mt-8 max-w-[22em] text-center text-[clamp(1.65rem,4.6vw,2.75rem)] font-medium leading-[1.2] tracking-[0.01em] text-white md:mt-10`}
        {...dockHero()}
      >
        {title}
      </motion.h2>

      <motion.p
        className={`${editorialFont.className} relative z-10 mt-5 max-w-[40rem] text-center text-[clamp(0.95rem,2.1vw,1.12rem)] font-medium leading-snug tracking-[0.01em] text-white/70 text-pretty md:mt-6 md:max-w-[46rem]`}
        {...dockPhase()}
      >
        {phase}
      </motion.p>

      <div className="relative z-10 mt-12 flex w-full max-w-[80rem] flex-col items-stretch gap-8 md:mt-14 md:flex-row md:items-start md:gap-0">
        {times.map((item, i) => {
          const colStep = COL_STEPS[i] ?? DECK_NEED_STEP.col2;
          const colVisible = visible(colStep);
          return (
            <div key={`${item.label}-${item.body}`} className="contents">
              {i > 0 ? (
                <motion.div
                  aria-hidden
                  className="mx-auto hidden h-px w-10 shrink-0 self-start bg-[rgba(0,232,240,0.4)] md:mx-0 md:mt-[0.85rem] md:block md:w-10 md:min-w-[2rem] lg:w-16"
                  initial={false}
                  animate={
                    reduceMotion || colVisible
                      ? { scaleX: 1, opacity: 0.85 }
                      : { scaleX: 0, opacity: 0 }
                  }
                  style={{ originX: 0 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : {
                          duration: colVisible ? DECK_DOCK_DUR * 0.85 : 0.3,
                          ease: DECK_FILM_EASE,
                          delay: 0,
                        }
                  }
                />
              ) : null}

              <motion.div
                className="flex min-w-0 flex-1 flex-col items-center px-1 text-center md:px-2 lg:px-4"
                {...(dockCols[i] ?? dockCol2)()}
              >
                {item.label ? (
                  <p className="font-label text-[0.72rem] font-medium uppercase tracking-[0.28em] text-[rgba(0,232,240,0.62)] md:text-[0.75rem]">
                    {item.label}
                  </p>
                ) : null}
                <p className="font-label mt-3 w-full text-[0.9rem] font-light leading-relaxed tracking-[0.01em] text-white/70 text-pretty md:text-[0.98rem] md:leading-[1.55]">
                  {item.body}
                </p>
              </motion.div>
            </div>
          );
        })}
      </div>

      {bridge ? (
        <motion.div
          className="relative z-10 mt-12 w-full max-w-3xl border-t border-[rgba(0,232,240,0.22)] pt-7 text-center md:mt-14 md:max-w-4xl"
          {...dockBridge()}
        >
          {bridge.label ? (
            <p className="font-label text-[0.7rem] font-medium uppercase tracking-[0.28em] text-[rgba(0,232,240,0.7)]">
              {bridge.label}
            </p>
          ) : null}
          <p className="font-label mt-3 text-[0.9rem] font-light leading-relaxed tracking-[0.01em] text-[rgba(0,232,240,0.55)] md:text-[0.95rem]">
            {bridge.body}
          </p>
        </motion.div>
      ) : null}
    </div>
  );
}
