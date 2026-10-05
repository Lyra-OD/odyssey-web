"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";

import { editorialFont } from "@/src/lib/fonts";

import {
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
  active: boolean;
};

type SplitBullet = {
  label: string;
  body: string;
};

/**
 * Desktop — 4 points sur la diagonale voie lactée (bas-G → haut-D), en zigzag
 * (alternance au-dessus / en-dessous de la ligne).
 */
const NODE_LAYOUT = [
  { left: "1%", top: "68%", maxW: "min(20rem,36%)" },
  { left: "24%", top: "14%", maxW: "min(21rem,34%)" },
  { left: "50%", top: "46%", maxW: "min(20rem,32%)" },
  { left: "74%", top: "6%", maxW: "min(22rem,26%)" },
];

/** Path SVG viewBox 0 0 100 60 — même zigzag. */
const PATH_POINTS = [
  { x: 7, y: 54 },
  { x: 30, y: 12 },
  { x: 56, y: 40 },
  { x: 88, y: 8 },
];

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

function pathD(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((p) => `L ${p.x} ${p.y}`).join(" ")}`;
}

/**
 * Slide 2 — Need : constellation zigzag (version d’avant le ruban épais).
 * Soft dock sans blur — pas de halo mauve.
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
  const { advance, visible, canAdvance, step } = useDeckStepReveal(
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
  const stations =
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
  const dockStations = [dockCol0, dockCol1, dockCol2];

  const stationsVisible = Math.max(
    0,
    Math.min(
      stations.length,
      step >= DECK_NEED_STEP.col0 ? step - DECK_NEED_STEP.col0 + 1 : 0,
    ),
  );
  const arrivalOn = visible(DECK_NEED_STEP.bridge);
  const pathProgress = reduceMotion
    ? 1
    : arrivalOn
      ? 1
      : stationsVisible <= 0
        ? 0
        : stationsVisible / (stations.length + 1);

  const d = useMemo(() => pathD(PATH_POINTS), []);

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
      className={`relative mx-auto flex w-full max-w-[90rem] flex-col px-3 md:px-6 ${
        canAdvance ? "cursor-pointer" : ""
      }`}
    >
      <div className="relative z-10 mx-auto flex w-full max-w-[90rem] flex-col items-center text-center">
        <motion.p className={DECK_EYEBROW_CLASS} {...dockEyebrow()}>
          {tagline}
        </motion.p>

        <motion.h2
          className={`${editorialFont.className} relative z-10 mt-6 whitespace-nowrap text-[clamp(1.2rem,2.9vw,2.45rem)] font-medium leading-none tracking-[0.01em] text-white md:mt-8`}
          style={{ textShadow: "none", filter: "none" }}
          {...dockHero()}
        >
          {title}
        </motion.h2>

        <motion.p
          className={`${editorialFont.className} relative z-10 mt-8 w-full max-w-[68rem] text-[clamp(1.2rem,2.4vw,1.55rem)] font-medium leading-[1.35] tracking-[0.01em] text-[#6d4fc4] md:mt-10`}
          style={{
            color: "#6d4fc4",
            textShadow: "none",
            filter: "none",
            WebkitFontSmoothing: "antialiased",
          }}
          {...dockPhase()}
        >
          {phase}
        </motion.p>
      </div>

      {/* Mobile — descente verticale */}
      <div className="relative z-10 mt-10 flex w-full flex-col gap-10 md:hidden">
        {stations.map((item, i) => (
          <motion.div
            key={`m-${item.label}-${item.body}`}
            className="relative pl-7"
            {...(dockStations[i] ?? dockCol2)()}
          >
            <span
              aria-hidden
              className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--salon-cyan)]"
            />
            {i < stations.length - 1 || bridge ? (
              <span
                aria-hidden
                className="absolute bottom-[-2.2rem] left-[2px] top-4 w-px bg-[rgba(0,232,240,0.2)]"
              />
            ) : null}
            {item.label ? (
              <p className="font-label text-[0.68rem] font-medium uppercase tracking-[0.3em] text-[rgba(0,232,240,0.7)]">
                {item.label}
              </p>
            ) : null}
            <p
              className={`${editorialFont.className} mt-2 text-[1.05rem] font-light leading-snug text-zinc-400`}
            >
              {item.body}
            </p>
          </motion.div>
        ))}
        {bridge ? (
          <motion.div className="relative pl-7 pt-2" {...dockBridge()}>
            <span
              aria-hidden
              className="absolute left-0 top-3.5 h-2 w-2 rounded-full bg-[var(--salon-cyan)]"
            />
            {bridge.label ? (
              <p className="font-label text-[0.68rem] font-medium uppercase tracking-[0.3em] text-[var(--salon-cyan)]">
                {bridge.label}
              </p>
            ) : null}
            <p
              className={`${editorialFont.className} mt-2 text-[1.1rem] font-medium leading-snug text-white`}
              style={{ textShadow: "none", filter: "none" }}
            >
              {bridge.body}
            </p>
          </motion.div>
        ) : null}
      </div>

      {/* Desktop — constellation zigzag fine */}
      <div className="relative z-10 mt-6 hidden min-h-[min(58vh,34rem)] w-full md:mt-8 md:block lg:min-h-[min(62vh,38rem)]">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 60"
          preserveAspectRatio="none"
        >
          <motion.path
            d={d}
            fill="none"
            stroke="rgba(0,232,240,0.22)"
            strokeWidth="0.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={false}
            animate={{
              pathLength: pathProgress,
              opacity: pathProgress > 0 ? 1 : 0,
            }}
            transition={{
              duration: reduceMotion ? 0 : 1.1,
              ease: DECK_FILM_EASE,
            }}
          />
        </svg>

        {stations.map((item, i) => {
          const layout = NODE_LAYOUT[i] ?? NODE_LAYOUT[0];
          return (
            <motion.div
              key={`d-${item.label}-${item.body}`}
              className="absolute text-left"
              style={{
                left: layout.left,
                top: layout.top,
                maxWidth: layout.maxW,
              }}
              {...(dockStations[i] ?? dockCol2)()}
            >
              <div className="mb-2.5 flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--salon-cyan)]"
                />
                {item.label ? (
                  <p className="font-label text-[0.65rem] font-medium uppercase tracking-[0.32em] text-[var(--salon-cyan)]">
                    {item.label}
                  </p>
                ) : null}
              </div>
              <p
                className={`${editorialFont.className} text-[clamp(0.95rem,1.25vw,1.12rem)] font-light leading-[1.5] text-zinc-400 text-pretty`}
              >
                {item.body}
              </p>
            </motion.div>
          );
        })}

        {bridge ? (
          <motion.div
            className="absolute text-left"
            style={{
              left: NODE_LAYOUT[3].left,
              top: NODE_LAYOUT[3].top,
              maxWidth: NODE_LAYOUT[3].maxW,
            }}
            {...dockBridge()}
          >
            <div className="mb-2.5 flex items-center gap-2">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full bg-[var(--salon-cyan)]"
              />
              {bridge.label ? (
                <p className="font-label text-[0.65rem] font-medium uppercase tracking-[0.32em] text-[var(--salon-cyan)]">
                  {bridge.label}
                </p>
              ) : null}
            </div>
            <p
              className={`${editorialFont.className} text-[clamp(1.02rem,1.4vw,1.28rem)] font-medium leading-snug text-white`}
              style={{ textShadow: "none", filter: "none" }}
            >
              {bridge.body}
            </p>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
