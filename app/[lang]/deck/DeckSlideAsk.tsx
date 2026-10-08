"use client";

import { motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { OdysseyLuminousText } from "@/src/components/marketing/OdysseyLuminousText";
import { editorialFont } from "@/src/lib/fonts";

import {
  DECK_ASK_LAST_STEP,
  DECK_ASK_STEP,
  DECK_ASK_WAITS_S,
  DECK_BODY_CLASS,
  DECK_EYEBROW_CLASS,
  DECK_LABEL_CLASS,
  DECK_TITLE_CLASS,
  DECK_VISION_CLASS,
  useDeckSoftDock,
  useDeckStepReveal,
} from "./deckSoftDock";
import { highlightDeckTeal } from "./deckTealText";

type DeckSlideAskProps = {
  tagline: string;
  title: string;
  phase: string;
  bullets: string[];
  active: boolean;
};

type Station = {
  num: string;
  label: string;
  body: string;
};

type SplitBullet = {
  label: string;
  body: string;
};

type ArcGeom = { x1: number; x2: number; y: number };

function splitPhaseStation(raw: string, index: number): Station {
  const idx = raw.search(/\s*[:：]\s*/);
  let head = raw.trim();
  let body = raw.trim();
  if (idx >= 0) {
    const sep = raw.slice(idx).match(/^(\s*[:：]\s*)/)?.[1] ?? ":";
    head = raw.slice(0, idx).trim();
    body = raw.slice(idx + sep.length).trim();
  }

  const paren = head.match(/\(([^)]+)\)/);
  const numMatch = head.match(/(\d+)/);
  const num = String(
    numMatch ? Number(numMatch[1]) : index + 1,
  ).padStart(2, "0");

  return {
    num,
    label: (paren?.[1] ?? head).trim(),
    body,
  };
}

function splitLabeledBullet(raw: string): SplitBullet {
  const idx = raw.search(/\s*[:：]\s*/);
  if (idx < 0) return { label: "", body: raw };
  const sep = raw.slice(idx).match(/^(\s*[:：]\s*)/)?.[1] ?? ":";
  return {
    label: raw.slice(0, idx).trim(),
    body: raw.slice(idx + sep.length).trim(),
  };
}

/**
 * Slide 10 — Ask : corridor 01 Réseau — 02 Terrain — 03 Lyra + coda 90 j / limite.
 */
export function DeckSlideAsk({
  tagline,
  title,
  phase,
  bullets,
  active,
}: DeckSlideAskProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const corridorRef = useRef<HTMLDivElement>(null);
  const badgeRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const [arcs, setArcs] = useState<[ArcGeom | null, ArcGeom | null]>([
    null,
    null,
  ]);

  const { advance, visible, canAdvance } = useDeckStepReveal(
    active,
    DECK_ASK_WAITS_S,
    DECK_ASK_LAST_STEP,
  );
  const canAdvanceRef = useRef(canAdvance);
  const advanceRef = useRef(advance);
  canAdvanceRef.current = canAdvance;
  advanceRef.current = advance;

  const stations = bullets.slice(0, 3).map(splitPhaseStation);
  const [risk, limit] = bullets.slice(3, 5).map(splitLabeledBullet);

  const dockEyebrow = useDeckSoftDock(visible(DECK_ASK_STEP.eyebrow));
  const dockHero = useDeckSoftDock(visible(DECK_ASK_STEP.hero));
  const dockPhase = useDeckSoftDock(visible(DECK_ASK_STEP.phase));
  const dockStation0 = useDeckSoftDock(visible(DECK_ASK_STEP.station0));
  const dockArc01 = useDeckSoftDock(visible(DECK_ASK_STEP.arc01));
  const dockStation1 = useDeckSoftDock(visible(DECK_ASK_STEP.station1));
  const dockArc12 = useDeckSoftDock(visible(DECK_ASK_STEP.arc12));
  const dockStation2 = useDeckSoftDock(visible(DECK_ASK_STEP.station2));
  const dockRisk = useDeckSoftDock(visible(DECK_ASK_STEP.risk));
  const dockLimit = useDeckSoftDock(visible(DECK_ASK_STEP.limit));
  const dockStations = [dockStation0, dockStation1, dockStation2];

  useLayoutEffect(() => {
    const corridor = corridorRef.current;
    if (!corridor) return;

    const measure = () => {
      const cRect = corridor.getBoundingClientRect();
      const next: [ArcGeom | null, ArcGeom | null] = [null, null];
      for (let i = 0; i < 2; i++) {
        const a = badgeRefs.current[i];
        const b = badgeRefs.current[i + 1];
        if (!a || !b) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        next[i] = {
          x1: ra.right - cRect.left,
          x2: rb.left - cRect.left,
          y: ra.top + ra.height / 2 - cRect.top,
        };
      }
      setArcs(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(corridor);
    for (const el of badgeRefs.current) {
      if (el) ro.observe(el);
    }
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [stations.length, active]);

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
      className={`relative mx-auto flex w-full max-w-[118rem] flex-col px-2 md:px-4 lg:px-6 ${
        canAdvance ? "cursor-pointer" : ""
      }`}
    >
      <div className="relative z-10 mx-auto flex w-full max-w-[90rem] -translate-y-[48%] flex-col items-center text-center">
        <motion.p className={DECK_EYEBROW_CLASS} {...dockEyebrow()}>
          {tagline}
        </motion.p>

        <motion.h2
          className={`${editorialFont.className} ${DECK_TITLE_CLASS}`}
          {...dockHero()}
        >
          <OdysseyLuminousText variant="deck">{title}</OdysseyLuminousText>
        </motion.h2>

        <motion.p
          className={`${editorialFont.className} ${DECK_VISION_CLASS} whitespace-pre-line`}
          style={{ WebkitFontSmoothing: "antialiased" }}
          {...dockPhase()}
        >
          {highlightDeckTeal(phase)}
        </motion.p>
      </div>

      {/* Corridor 01 — 02 — 03 */}
      <div
        ref={corridorRef}
        className="relative z-10 mx-auto mt-2 w-full translate-x-[7%] md:mt-0 md:translate-x-[9.5%] lg:translate-x-[11%]"
      >
        <svg
          className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
          aria-hidden
        >
          {arcs[0] && arcs[0].x2 - arcs[0].x1 > 8 ? (
            <motion.line
              x1={arcs[0].x1}
              y1={arcs[0].y}
              x2={arcs[0].x2}
              y2={arcs[0].y}
              stroke="rgba(200,225,230,0.28)"
              strokeWidth="1.15"
              strokeLinecap="round"
              {...dockArc01()}
            />
          ) : null}
          {arcs[1] && arcs[1].x2 - arcs[1].x1 > 8 ? (
            <motion.line
              x1={arcs[1].x1}
              y1={arcs[1].y}
              x2={arcs[1].x2}
              y2={arcs[1].y}
              stroke="rgba(200,225,230,0.28)"
              strokeWidth="1.15"
              strokeLinecap="round"
              {...dockArc12()}
            />
          ) : null}
        </svg>

        <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-20 lg:gap-32 xl:gap-40">
          {stations.map((item, i) => {
            const dock = dockStations[i] ?? dockStation2;
            return (
              <motion.div
                key={`ask-station-${item.num}-${item.label}`}
                className="flex flex-col items-center text-center md:items-start md:text-left"
                {...dock()}
              >
                <div
                  ref={(el) => {
                    badgeRefs.current[i] = el;
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(0,232,240,0.35)] bg-[rgba(0,232,240,0.06)] md:h-12 md:w-12"
                >
                  <span className="font-label text-[0.78rem] font-semibold tracking-[0.18em] text-[var(--salon-cyan)] md:text-[0.85rem]">
                    {item.num}
                  </span>
                </div>

                <p className={`${DECK_LABEL_CLASS} mt-5`}>{item.label}</p>

                <p className={`${DECK_BODY_CLASS} mt-3 max-w-[15.5rem] md:max-w-[16.5rem]`}>
                  {highlightDeckTeal(item.body)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Coda : 90 jours + limite Marketplace (+ montant) */}
      <div className="relative z-10 mx-auto mt-10 flex w-full max-w-[52rem] flex-col gap-7 text-center md:mt-12">
        {risk ? (
          <motion.div {...dockRisk()}>
            {risk.label ? (
              <p className={`${DECK_LABEL_CLASS} tracking-[0.22em]`}>
                {risk.label}
              </p>
            ) : null}
            <p className={`${DECK_BODY_CLASS} mt-2.5 whitespace-pre-line`}>
              {highlightDeckTeal(risk.body)}
            </p>
          </motion.div>
        ) : null}

        {limit ? (
          <motion.div {...dockLimit()}>
            {limit.label ? (
              <p className={`${DECK_LABEL_CLASS} tracking-[0.22em]`}>
                {limit.label}
              </p>
            ) : null}
            <p className={`${DECK_BODY_CLASS} mt-2.5`}>
              {highlightDeckTeal(limit.body)}
            </p>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
