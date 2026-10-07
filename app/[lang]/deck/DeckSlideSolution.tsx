"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { OdysseyLuminousText } from "@/src/components/marketing/OdysseyLuminousText";
import { editorialFont } from "@/src/lib/fonts";

import {
  DECK_EYEBROW_CLASS,
  DECK_FILM_EASE,
  DECK_PHASE_CLASS,
  DECK_SOLUTION_LAST_STEP,
  DECK_SOLUTION_STEP,
  DECK_SOLUTION_WAITS_S,
  useDeckSoftDock,
  useDeckStepReveal,
} from "./deckSoftDock";

type DeckSlideSolutionProps = {
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
 * Schéma A — 3 nœuds → foyer (pas un triangle).
 * Phase titres : labels nœuds + Odyssey ; boîtes corps / économie encore masquées.
 * Coords % dans un espace 100×60.
 */
const SHOW_SCHEMA_TITLES = true;
const SHOW_SCHEMA_BODIES = false;

const BEAM_NODES = [
  {
    x: 50,
    y: 6,
    // Points fixes — seul le label monte un peu (anchor)
    anchor: "translate(-50%, calc(-100% - 1.15rem))",
    bodyMax: "18rem",
  },
  {
    x: 28,
    y: 50,
    // Points fixes — label mini à gauche
    anchor: "translate(calc(-100% - 1.2rem), -40%)",
    bodyMax: "17rem",
  },
  {
    x: 72,
    y: 50,
    // Points fixes — label mini à droite
    anchor: "translate(1.2rem, -40%)",
    bodyMax: "17rem",
  },
] as const;

const FOCUS_NODE = { x: 50, y: 30 } as const;

const NODE_STEPS = [
  DECK_SOLUTION_STEP.node0,
  DECK_SOLUTION_STEP.node1,
  DECK_SOLUTION_STEP.node2,
] as const;

const BEAM_STEPS = [
  DECK_SOLUTION_STEP.beam0,
  DECK_SOLUTION_STEP.beam1,
  DECK_SOLUTION_STEP.beam2,
] as const;

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

function isCodaLabel(label: string) {
  const n = label.toLowerCase();
  return (
    n.includes("économie") ||
    n.includes("economie") ||
    n.includes("economics") ||
    n.includes("soft cap") ||
    n.includes("business")
  );
}

/** Courant le long d’un path (même ADN Need). */
function FlowCurrent({
  d,
  play,
  delay = 0,
  duration = 1.25,
  reduceMotion,
}: {
  d: string;
  play: boolean;
  delay?: number;
  duration?: number;
  reduceMotion: boolean | null;
}) {
  const ref = useRef<SVGCircleElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const dot = ref.current;
    const glow = glowRef.current;
    if (!dot || !glow) return;
    if (!play || reduceMotion) {
      dot.setAttribute("opacity", "0");
      glow.setAttribute("opacity", "0");
      return;
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    const len = path.getTotalLength();
    if (len < 1) return;

    let raf = 0;
    const startAt = performance.now() + delay * 1000;

    const tick = (now: number) => {
      const elapsed = now - startAt;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const u = Math.min(1, elapsed / (duration * 1000));
      const ease = 1 - Math.pow(1 - u, 2.4);
      const pt = path.getPointAtLength(ease * len);
      dot.setAttribute("cx", String(pt.x));
      dot.setAttribute("cy", String(pt.y));
      glow.setAttribute("cx", String(pt.x));
      glow.setAttribute("cy", String(pt.y));
      const fade = u < 0.08 ? u / 0.08 : u > 0.92 ? (1 - u) / 0.08 : 1;
      dot.setAttribute("opacity", String(fade));
      glow.setAttribute("opacity", String(fade * 0.4));
      if (u < 1) raf = requestAnimationFrame(tick);
      else {
        dot.setAttribute("opacity", "0");
        glow.setAttribute("opacity", "0");
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [d, play, delay, duration, reduceMotion]);

  return (
    <g>
      <circle ref={glowRef} r="6" fill="rgba(0,232,240,0.28)" opacity="0" />
      <circle ref={ref} r="2.8" fill="#ffffff" opacity="0" />
    </g>
  );
}

/**
 * Slide 3 — Solution : 3 faisceaux cosmiques → foyer Odyssey.
 */
export function DeckSlideSolution({
  tagline,
  title,
  phase,
  bullets,
  active,
}: DeckSlideSolutionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { advance, visible, canAdvance } = useDeckStepReveal(
    active,
    DECK_SOLUTION_WAITS_S,
    DECK_SOLUTION_LAST_STEP,
  );
  const canAdvanceRef = useRef(canAdvance);
  const advanceRef = useRef(advance);
  canAdvanceRef.current = canAdvance;
  advanceRef.current = advance;

  const parsed = bullets.map(splitLabeledBullet);
  const codaIdx = parsed.findIndex((b) => isCodaLabel(b.label));
  const beams =
    codaIdx >= 0
      ? parsed.filter((_, i) => i !== codaIdx).slice(0, 3)
      : parsed.slice(0, 3);
  const coda =
    codaIdx >= 0
      ? parsed[codaIdx]
      : parsed.length > 3
        ? parsed[parsed.length - 1]
        : null;

  const dockEyebrow = useDeckSoftDock(visible(DECK_SOLUTION_STEP.eyebrow));
  const dockHero = useDeckSoftDock(visible(DECK_SOLUTION_STEP.hero));
  const dockPhase = useDeckSoftDock(visible(DECK_SOLUTION_STEP.phase));
  /** Phase titres : tous visibles (tempo/anim = plus tard). */
  const titlesOn = Boolean(reduceMotion || active);
  const dockNode0 = useDeckSoftDock(titlesOn);
  const dockNode1 = useDeckSoftDock(titlesOn);
  const dockNode2 = useDeckSoftDock(titlesOn);
  const dockFocus = useDeckSoftDock(titlesOn);
  const dockCoda = useDeckSoftDock(visible(DECK_SOLUTION_STEP.coda));
  const dockNodes = [dockNode0, dockNode1, dockNode2];

  /** Phase schéma : géométrie complète dès que la slide est active. */
  const geoOn = Boolean(reduceMotion || active);

  const mapRef = useRef<HTMLDivElement>(null);
  const [mapSize, setMapSize] = useState({ w: 1000, h: 600 });

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r || r.width < 2 || r.height < 2) return;
      setMapSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toPx = (x: number, y: number) => ({
    x: (x / 100) * mapSize.w,
    y: (y / 60) * mapSize.h,
  });

  const focusPx = useMemo(
    () => toPx(FOCUS_NODE.x, FOCUS_NODE.y),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapSize.w, mapSize.h],
  );

  const beamPaths = useMemo(() => {
    const f = toPx(FOCUS_NODE.x, FOCUS_NODE.y);
    return BEAM_NODES.map((n) => {
      const p = toPx(n.x, n.y);
      return `M ${p.x} ${p.y} L ${f.x} ${f.y}`;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapSize.w, mapSize.h]);

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

  const beamDur = reduceMotion ? 0 : 1.25;

  return (
    <div
      ref={rootRef}
      className={`relative mx-auto flex w-full max-w-[90rem] flex-col px-3 md:px-6 ${
        canAdvance ? "cursor-pointer" : ""
      }`}
    >
      <div className="relative z-10 mx-auto flex w-full max-w-[90rem] -translate-y-[70%] flex-col items-center text-center">
        <motion.p className={DECK_EYEBROW_CLASS} {...dockEyebrow()}>
          {tagline}
        </motion.p>

        <motion.h2
          className={`${editorialFont.className} relative z-10 mt-6 text-center text-[clamp(1.2rem,2.9vw,2.45rem)] font-medium leading-[1.15] tracking-[0.01em] text-white md:mt-8`}
          {...dockHero()}
        >
          <OdysseyLuminousText variant="deck">{title}</OdysseyLuminousText>
        </motion.h2>

        <motion.p
          className={`${editorialFont.className} ${DECK_PHASE_CLASS} relative z-10 mt-8 w-full max-w-[68rem] text-[clamp(1.15rem,2.2vw,1.45rem)] font-medium leading-[1.35] tracking-[0.01em] md:mt-10`}
          style={{ WebkitFontSmoothing: "antialiased" }}
          {...dockPhase()}
        >
          {phase}
        </motion.p>
      </div>

      {/* Mobile — titres (+ corps si phase boîtes) */}
      {SHOW_SCHEMA_TITLES ? (
        <div className="relative z-10 mt-10 flex w-full flex-col gap-10 md:hidden">
          {beams.map((item, i) => (
            <motion.div
              key={`m-${item.label}`}
              className="relative pl-7"
              {...(dockNodes[i] ?? dockNode2)()}
            >
              <span
                aria-hidden
                className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--salon-cyan)]"
              />
              {item.label ? (
                <p className="font-label text-[0.68rem] font-medium uppercase tracking-[0.3em] text-[rgba(0,232,240,0.7)]">
                  {item.label}
                </p>
              ) : null}
              {SHOW_SCHEMA_BODIES ? (
                <p
                  className={`${editorialFont.className} mt-2 text-[1.05rem] font-light leading-snug text-zinc-400`}
                >
                  {item.body}
                </p>
              ) : null}
            </motion.div>
          ))}
          {SHOW_SCHEMA_BODIES && coda ? (
            <motion.div className="relative pl-7 pt-2" {...dockCoda()}>
              {coda.label ? (
                <p className="font-label text-[0.68rem] font-medium uppercase tracking-[0.3em] text-[var(--salon-cyan)]">
                  {coda.label}
                </p>
              ) : null}
              <p
                className={`${editorialFont.className} mt-2 text-[1.05rem] font-medium leading-snug text-white`}
              >
                {coda.body}
              </p>
            </motion.div>
          ) : null}
        </div>
      ) : null}

      {/* Desktop — phase 1 : SVG schéma seul */}
      <div
        ref={mapRef}
        className="relative z-10 mt-6 hidden min-h-[min(52vh,30rem)] w-full md:mt-8 md:block lg:min-h-[min(56vh,34rem)]"
      >
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          width={mapSize.w}
          height={mapSize.h}
          viewBox={`0 0 ${mapSize.w} ${mapSize.h}`}
        >
          {beamPaths.map((d, i) => (
            <g key={`beam-${i}`}>
              <motion.path
                d={d}
                fill="none"
                stroke="rgba(0,232,240,0.6)"
                strokeWidth="2"
                strokeLinecap="round"
                initial={false}
                animate={{
                  pathLength: geoOn ? 1 : 0,
                  opacity: geoOn ? 1 : 0,
                }}
                transition={{
                  duration: beamDur,
                  ease: DECK_FILM_EASE,
                  delay: reduceMotion ? 0 : i * 0.12,
                }}
              />
              <FlowCurrent
                d={d}
                play={geoOn}
                delay={i * 0.12}
                duration={1.25}
                reduceMotion={reduceMotion}
              />
            </g>
          ))}

          {BEAM_NODES.map((n, i) => {
            const q = toPx(n.x, n.y);
            return (
              <motion.g
                key={`bn-${i}`}
                initial={false}
                animate={{ opacity: geoOn ? 1 : 0, scale: geoOn ? 1 : 0.6 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.45,
                  ease: DECK_FILM_EASE,
                  delay: reduceMotion ? 0 : i * 0.1,
                }}
                style={{ transformOrigin: `${q.x}px ${q.y}px` }}
              >
                <circle
                  cx={q.x}
                  cy={q.y}
                  r="18"
                  fill="rgba(0,232,240,0.22)"
                />
                <circle cx={q.x} cy={q.y} r="9" fill="var(--salon-cyan)" />
                <circle cx={q.x} cy={q.y} r="3.2" fill="#ffffff" />
              </motion.g>
            );
          })}

          {/* Foyer — échelle wow, traits inchangés */}
          <motion.g
            initial={false}
            animate={{
              opacity: geoOn ? 1 : 0,
              scale: geoOn ? 1 : 0.5,
            }}
            transition={{
              duration: reduceMotion ? 0 : 0.55,
              ease: DECK_FILM_EASE,
              delay: reduceMotion ? 0 : 0.35,
            }}
            style={{
              transformOrigin: `${focusPx.x}px ${focusPx.y}px`,
            }}
          >
            <circle
              cx={focusPx.x}
              cy={focusPx.y}
              r="42"
              fill="rgba(0,232,240,0.08)"
            />
            <circle
              cx={focusPx.x}
              cy={focusPx.y}
              r="28"
              fill="rgba(0,232,240,0.14)"
            />
            <circle
              cx={focusPx.x}
              cy={focusPx.y}
              r="16"
              fill="rgba(0,232,240,0.28)"
            />
            <circle
              cx={focusPx.x}
              cy={focusPx.y}
              r="9"
              fill="var(--salon-cyan)"
            />
            <circle cx={focusPx.x} cy={focusPx.y} r="3.4" fill="#ffffff" />
          </motion.g>
        </svg>

        {SHOW_SCHEMA_TITLES
          ? beams.map((item, i) => {
              const node = BEAM_NODES[i];
              if (!node || !item.label) return null;
              const dock = dockNodes[i] ?? dockNode2;
              return (
                <div
                  key={`lab-${item.label}-${i}`}
                  className="absolute z-10"
                  style={{
                    left: `${node.x}%`,
                    top: `${(node.y / 60) * 100}%`,
                    transform: node.anchor,
                    maxWidth: node.bodyMax,
                  }}
                >
                  <motion.div {...dock()}>
                    <p className="font-label whitespace-nowrap text-[clamp(0.8rem,1.1vw,0.98rem)] font-semibold uppercase tracking-[0.28em] text-[var(--salon-cyan)]">
                      {item.label}
                    </p>
                    {SHOW_SCHEMA_BODIES ? (
                      <p
                        className={`${editorialFont.className} mt-1.5 text-[clamp(0.95rem,1.15vw,1.12rem)] font-light leading-snug text-zinc-400`}
                      >
                        {item.body}
                      </p>
                    ) : null}
                  </motion.div>
                </div>
              );
            })
          : null}

        {SHOW_SCHEMA_TITLES ? (
          <div
            className="absolute z-10"
            style={{
              left: `${FOCUS_NODE.x}%`,
              top: `${(FOCUS_NODE.y / 60) * 100}%`,
              // Hors soft-dock : Framer y écrasait le transform
              transform: "translate(3.7rem, -58%)",
            }}
          >
            <motion.p
              className="font-label whitespace-nowrap text-[clamp(1.05rem,1.55vw,1.35rem)] font-semibold uppercase tracking-[0.36em] text-white"
              {...dockFocus()}
            >
              <OdysseyLuminousText variant="deck">Odyssey</OdysseyLuminousText>
            </motion.p>
          </div>
        ) : null}

        {SHOW_SCHEMA_BODIES && coda ? (
          <motion.div
            className="absolute bottom-2 left-1/2 z-10 w-[min(36rem,70%)] -translate-x-1/2 text-center"
            {...dockCoda()}
          >
            {coda.label ? (
              <p className="font-label text-[0.72rem] font-medium uppercase tracking-[0.28em] text-[var(--salon-cyan)]">
                {coda.label}
              </p>
            ) : null}
            <p
              className={`${editorialFont.className} mt-1.5 text-[clamp(0.95rem,1.15vw,1.1rem)] font-medium leading-snug text-white/85`}
            >
              {coda.body}
            </p>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
