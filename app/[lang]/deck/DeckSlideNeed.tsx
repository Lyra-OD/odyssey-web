"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { OdysseyLuminousText } from "@/src/components/marketing/OdysseyLuminousText";
import { editorialFont } from "@/src/lib/fonts";

import {
  DECK_BODY_CLASS,
  DECK_BODY_EMPHASIS_CLASS,
  DECK_EYEBROW_CLASS,
  DECK_FILM_EASE,
  DECK_LABEL_CLASS,
  DECK_NEED_LAST_STEP,
  DECK_NEED_STEP,
  DECK_NEED_WAITS_S,
  DECK_TITLE_CLASS,
  useDeckSoftDock,
  useDeckStepReveal,
} from "./deckSoftDock";
import { DeckVision } from "./DeckVision";
import { highlightDeckTeal } from "./deckTealText";

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
 * Schéma 1 — SVG unifié. Points fixes.
 * Phase titres seuls (corps desktop = plus tard).
 * side left/right + translate % sur la hauteur du titre seul → centré sur le nœud.
 */
const FRICTION_NODES = [
  {
    x: 18,
    y: 48,
    // Industrie — titre à gauche du point
    anchor: "translate(calc(-100% - 0.75rem), -50%)",
  },
  {
    x: 28,
    y: 18,
    // Deuil — titre à droite du point, +2px vers le haut
    anchor: "translate(0.75rem, calc(-50% - 2px))",
  },
  {
    x: 50,
    y: 38,
    // Écosystème — titre à droite du point
    anchor: "translate(0.75rem, -50%)",
  },
] as const;

const BRIDGE_NODE = {
  x: 86,
  y: 12,
  // Pont — titre à droite du point
  anchor: "translate(0.75rem, -50%)",
} as const;

const NODE_STEPS = [
  DECK_NEED_STEP.node0,
  DECK_NEED_STEP.node1,
  DECK_NEED_STEP.node2,
] as const;

function frictionCenter() {
  const n = FRICTION_NODES.length;
  return {
    x: FRICTION_NODES.reduce((s, p) => s + p.x, 0) / n,
    y: FRICTION_NODES.reduce((s, p) => s + p.y, 0) / n,
  };
}

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
    n.includes("investor") ||
    n.includes("opportunité") ||
    n.includes("opportunite") ||
    n.includes("wedge") ||
    n.includes("opportunity")
  );
}

/** Petit guide lumineux le long d’un path (chic, discret). */
function FlowCurrent({
  d,
  play,
  delay = 0,
  duration = 1.35,
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

function EdgePath({
  d,
  show,
  duration,
  reduceMotion,
}: {
  d: string;
  show: boolean;
  duration: number;
  reduceMotion: boolean | null;
}) {
  return (
    <>
      <motion.path
        d={d}
        fill="none"
        stroke="rgba(0,232,240,0.55)"
        strokeWidth="2"
        strokeLinecap="round"
        initial={false}
        animate={{
          pathLength: show ? 1 : 0,
          opacity: show ? 1 : 0,
        }}
        transition={{
          duration,
          ease: DECK_FILM_EASE,
        }}
      />
      <FlowCurrent
        d={d}
        play={show}
        duration={duration || 1.35}
        reduceMotion={reduceMotion}
      />
    </>
  );
}

/**
 * Slide 2 — Need : triangle + textes + courant + convergence → pont.
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
  const dockNode0 = useDeckSoftDock(visible(DECK_NEED_STEP.node0));
  const dockNode1 = useDeckSoftDock(visible(DECK_NEED_STEP.node1));
  const dockNode2 = useDeckSoftDock(visible(DECK_NEED_STEP.node2));
  const dockBridge = useDeckSoftDock(visible(DECK_NEED_STEP.converge));
  const dockStations = [dockNode0, dockNode1, dockNode2];

  const showLine01 = Boolean(reduceMotion || visible(DECK_NEED_STEP.line01));
  const showLine12 = Boolean(reduceMotion || visible(DECK_NEED_STEP.line12));
  const showLine20 = Boolean(reduceMotion || visible(DECK_NEED_STEP.line20));
  const showConverge = Boolean(
    reduceMotion || visible(DECK_NEED_STEP.converge),
  );

  const center = useMemo(() => frictionCenter(), []);
  const mapRef = useRef<HTMLDivElement>(null);
  const industrieTitleRef = useRef<HTMLParagraphElement>(null);
  const ecosystemeTitleRef = useRef<HTMLParagraphElement>(null);
  const pontTitleRef = useRef<HTMLParagraphElement>(null);
  const [mapSize, setMapSize] = useState({ w: 1000, h: 600 });
  /** Corps Industrie : même bord gauche que le titre, sans bouger le titre. */
  const [industrieBodyBox, setIndustrieBodyBox] = useState<{
    left: number;
    top: number;
  } | null>(null);
  /** Corps Écosystème : sous le titre, même bord gauche (titre inchangé). */
  const [ecosystemeBodyBox, setEcosystemeBodyBox] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  /** Corps Pont : sous le titre, largeur ≥ titre (titre inchangé). */
  const [pontBodyBox, setPontBodyBox] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);

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

  const industrieBody = stations[0]?.body ?? "";
  const industrieLabelOn = Boolean(
    reduceMotion || visible(DECK_NEED_STEP.node0),
  );

  useEffect(() => {
    const map = mapRef.current;
    const titleEl = industrieTitleRef.current;
    if (!map || !titleEl || !industrieBody || !industrieLabelOn) {
      setIndustrieBodyBox(null);
      return;
    }
    let raf = 0;
    const sync = () => {
      const m = map.getBoundingClientRect();
      const t = titleEl.getBoundingClientRect();
      if (t.width < 2) return;
      setIndustrieBodyBox({
        left: t.left - m.left,
        top: t.bottom - m.top + 6,
      });
    };
    // Après le soft-dock (transform y) pour ne pas fausser le bord gauche
    raf = requestAnimationFrame(() => {
      sync();
      raf = requestAnimationFrame(sync);
    });
    const ro = new ResizeObserver(sync);
    ro.observe(map);
    ro.observe(titleEl);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [industrieBody, industrieLabelOn, mapSize.w, mapSize.h, active]);

  const ecosystemeBody = stations[2]?.body ?? "";
  const ecosystemeLabelOn = Boolean(
    reduceMotion || visible(DECK_NEED_STEP.node2),
  );

  useEffect(() => {
    const map = mapRef.current;
    const titleEl = ecosystemeTitleRef.current;
    if (!map || !titleEl || !ecosystemeBody || !ecosystemeLabelOn) {
      setEcosystemeBodyBox(null);
      return;
    }
    let raf = 0;
    const sync = () => {
      const m = map.getBoundingClientRect();
      const t = titleEl.getBoundingClientRect();
      if (t.width < 2) return;
      setEcosystemeBodyBox({
        left: t.left - m.left,
        top: t.bottom - m.top + 6,
        // Largeur fixe lisible (3 lignes) — le % du titre ne bougeait plus le wrap
        width: Math.max(t.width * 1.39, 20.5 * 16),
      });
    };
    raf = requestAnimationFrame(() => {
      sync();
      raf = requestAnimationFrame(sync);
    });
    const ro = new ResizeObserver(sync);
    ro.observe(map);
    ro.observe(titleEl);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [ecosystemeBody, ecosystemeLabelOn, mapSize.w, mapSize.h, active]);

  const pontBody = bridge?.body ?? "";
  const pontLabelOn = Boolean(
    reduceMotion || visible(DECK_NEED_STEP.converge),
  );

  useEffect(() => {
    const map = mapRef.current;
    const titleEl = pontTitleRef.current;
    if (!map || !titleEl || !pontBody || !pontLabelOn) {
      setPontBodyBox(null);
      return;
    }
    let raf = 0;
    const sync = () => {
      const m = map.getBoundingClientRect();
      const t = titleEl.getBoundingClientRect();
      if (t.width < 2) return;
      setPontBodyBox({
        left: t.left - m.left,
        top: t.bottom - m.top + 6,
        width: t.width * 2.11,
      });
    };
    raf = requestAnimationFrame(() => {
      sync();
      raf = requestAnimationFrame(sync);
    });
    const ro = new ResizeObserver(sync);
    ro.observe(map);
    ro.observe(titleEl);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [pontBody, pontLabelOn, mapSize.w, mapSize.h, active]);

  const toPx = (x: number, y: number) => ({
    x: (x / 100) * mapSize.w,
    y: (y / 60) * mapSize.h,
  });

  const path01 = useMemo(() => {
    const a = toPx(FRICTION_NODES[0].x, FRICTION_NODES[0].y);
    const b = toPx(FRICTION_NODES[1].x, FRICTION_NODES[1].y);
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapSize.w, mapSize.h]);

  const path12 = useMemo(() => {
    const a = toPx(FRICTION_NODES[1].x, FRICTION_NODES[1].y);
    const b = toPx(FRICTION_NODES[2].x, FRICTION_NODES[2].y);
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapSize.w, mapSize.h]);

  const path20 = useMemo(() => {
    const a = toPx(FRICTION_NODES[2].x, FRICTION_NODES[2].y);
    const b = toPx(FRICTION_NODES[0].x, FRICTION_NODES[0].y);
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapSize.w, mapSize.h]);

  const spokesPx = useMemo(() => {
    const c = toPx(center.x, center.y);
    return FRICTION_NODES.map((p) => {
      const q = toPx(p.x, p.y);
      return `M ${q.x} ${q.y} L ${c.x} ${c.y}`;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapSize.w, mapSize.h, center.x, center.y]);

  const breachPx = useMemo(() => {
    const c = toPx(center.x, center.y);
    const b = toPx(BRIDGE_NODE.x, BRIDGE_NODE.y);
    return `M ${c.x} ${c.y} L ${b.x} ${b.y}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapSize.w, mapSize.h, center.x, center.y]);

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

  const pathDur = reduceMotion ? 0 : 1.35;
  const convergeDur = reduceMotion ? 0 : 1.1;

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
          className={`${editorialFont.className} ${DECK_TITLE_CLASS}`}
          {...dockHero()}
        >
          <OdysseyLuminousText variant="deck">{title}</OdysseyLuminousText>
        </motion.h2>

        <DeckVision
          text={phase}
          className="max-w-[min(96rem,98vw)] text-[clamp(1.28rem,2.55vw,1.78rem)]"
          {...dockPhase()}
        />
      </div>

      {/* Mobile — descente verticale */}
      <div className="relative z-10 mt-10 flex w-full flex-col gap-10 md:hidden">
        {stations.map((item, i) => (
          <motion.div
            key={`m-${item.label}-${item.body}`}
            className="relative pl-7"
            {...(dockStations[i] ?? dockNode2)()}
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
              <p className={`${DECK_LABEL_CLASS} text-[rgba(0,232,240,0.7)]`}>
                {item.label}
              </p>
            ) : null}
            <p className={`${DECK_BODY_CLASS} mt-2 text-zinc-400`}>
              {highlightDeckTeal(item.body)}
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
              <p className={DECK_LABEL_CLASS}>
                {bridge.label}
              </p>
            ) : null}
            <p
              className={`${DECK_BODY_EMPHASIS_CLASS} mt-2 text-white`}
              style={{ textShadow: "none", filter: "none" }}
            >
              {highlightDeckTeal(bridge.body)}
            </p>
          </motion.div>
        ) : null}
      </div>

      {/* Desktop — SVG unifié + labels/body HTML */}
      <div
        ref={mapRef}
        className="relative z-10 mt-6 hidden min-h-[min(58vh,34rem)] w-full md:mt-8 md:block lg:min-h-[min(62vh,38rem)]"
      >
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          width={mapSize.w}
          height={mapSize.h}
          viewBox={`0 0 ${mapSize.w} ${mapSize.h}`}
        >
          <EdgePath
            d={path01}
            show={showLine01}
            duration={pathDur}
            reduceMotion={reduceMotion}
          />
          <EdgePath
            d={path12}
            show={showLine12}
            duration={pathDur}
            reduceMotion={reduceMotion}
          />
          <EdgePath
            d={path20}
            show={showLine20}
            duration={pathDur}
            reduceMotion={reduceMotion}
          />

          {/* Convergence 1,2,3 → centre */}
          {spokesPx.map((d, i) => (
            <g key={`spk-${i}`}>
              <motion.path
                d={d}
                fill="none"
                stroke="rgba(0,232,240,0.45)"
                strokeWidth="1.75"
                strokeLinecap="round"
                initial={false}
                animate={{
                  pathLength: showConverge ? 1 : 0,
                  opacity: showConverge ? 1 : 0,
                }}
                transition={{
                  duration: convergeDur,
                  ease: DECK_FILM_EASE,
                  delay: reduceMotion ? 0 : i * 0.08,
                }}
              />
              <FlowCurrent
                d={d}
                play={showConverge}
                delay={i * 0.08}
                duration={1.1}
                reduceMotion={reduceMotion}
              />
            </g>
          ))}

          {/* Centre → pont */}
          <motion.path
            d={breachPx}
            fill="none"
            stroke="rgba(0,232,240,0.7)"
            strokeWidth="2.25"
            strokeLinecap="round"
            initial={false}
            animate={{
              pathLength: showConverge ? 1 : 0,
              opacity: showConverge ? 1 : 0,
            }}
            transition={{
              duration: reduceMotion ? 0 : 1.2,
              ease: DECK_FILM_EASE,
              delay: reduceMotion ? 0 : 0.85,
            }}
          />
          <FlowCurrent
            d={breachPx}
            play={showConverge}
            delay={0.85}
            duration={1.2}
            reduceMotion={reduceMotion}
          />

          {/* Nœuds friction */}
          {FRICTION_NODES.map((p, i) => {
            const q = toPx(p.x, p.y);
            const on = Boolean(
              reduceMotion || visible(NODE_STEPS[i] ?? DECK_NEED_STEP.node2),
            );
            return (
              <motion.g
                key={`n-${i}`}
                initial={false}
                animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.6 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.45,
                  ease: DECK_FILM_EASE,
                }}
                style={{ transformOrigin: `${q.x}px ${q.y}px` }}
              >
                <circle
                  cx={q.x}
                  cy={q.y}
                  r="11"
                  fill="rgba(0,232,240,0.22)"
                />
                <circle cx={q.x} cy={q.y} r="5.5" fill="var(--salon-cyan)" />
                <circle cx={q.x} cy={q.y} r="2.2" fill="#ffffff" />
              </motion.g>
            );
          })}

          {/* Centre */}
          {(() => {
            const c = toPx(center.x, center.y);
            return (
              <motion.g
                initial={false}
                animate={{ opacity: showConverge ? 1 : 0 }}
                transition={{
                  delay: reduceMotion ? 0 : 0.55,
                  duration: 0.35,
                }}
              >
                <circle cx={c.x} cy={c.y} r="5.5" fill="var(--salon-cyan)" />
                <circle cx={c.x} cy={c.y} r="2" fill="#ffffff" />
              </motion.g>
            );
          })()}

          {/* Pont */}
          {(() => {
            const b = toPx(BRIDGE_NODE.x, BRIDGE_NODE.y);
            return (
              <motion.g
                initial={false}
                animate={{
                  opacity: showConverge ? 1 : 0,
                  scale: showConverge ? 1 : 0.6,
                }}
                transition={{
                  delay: reduceMotion ? 0 : 1.6,
                  duration: 0.4,
                  ease: DECK_FILM_EASE,
                }}
                style={{ transformOrigin: `${b.x}px ${b.y}px` }}
              >
                <circle cx={b.x} cy={b.y} r="14" fill="rgba(0,232,240,0.22)" />
                <circle cx={b.x} cy={b.y} r="6.5" fill="var(--salon-cyan)" />
                <circle cx={b.x} cy={b.y} r="2.6" fill="#ffffff" />
              </motion.g>
            );
          })()}
        </svg>

        {/* Desktop — titres (Deuil = titre + corps à côté). */}
        {stations.map((item, i) => {
          const node = FRICTION_NODES[i];
          if (!node || !item.label) return null;
          const dock = dockStations[i] ?? dockNode2;
          const isDeuil = i === 1;
          return (
            <div
              key={`lab-${item.label}-${i}`}
              className={`absolute z-10${isDeuil ? " flex max-w-[min(30.6rem,35.7vw)] items-baseline gap-x-3" : ""}`}
              style={{
                left: `${node.x}%`,
                top: `${(node.y / 60) * 100}%`,
                transform: node.anchor,
              }}
            >
              <motion.p
                ref={
                  i === 0
                    ? industrieTitleRef
                    : i === 2
                      ? ecosystemeTitleRef
                      : undefined
                }
                className={`${DECK_LABEL_CLASS} shrink-0 whitespace-nowrap`}
                {...dock()}
              >
                {item.label}
              </motion.p>
              {isDeuil && item.body ? (
                <motion.p
                  className={`${DECK_BODY_CLASS} min-w-0 text-zinc-400`}
                  {...dock()}
                >
                  {highlightDeckTeal(item.body)}
                </motion.p>
              ) : null}
            </div>
          );
        })}

        {bridge?.label ? (
          <div
            className="absolute z-10"
            style={{
              left: `${BRIDGE_NODE.x}%`,
              top: `${(BRIDGE_NODE.y / 60) * 100}%`,
              transform: BRIDGE_NODE.anchor,
            }}
          >
            <motion.p
              ref={pontTitleRef}
              className={`${DECK_LABEL_CLASS} whitespace-nowrap`}
              {...dockBridge()}
            >
              {bridge.label}
            </motion.p>
          </div>
        ) : null}

        {/* Corps Industrie : élargi, bord gauche = bord gauche du titre (titre inchangé). */}
        {stations[0]?.body && industrieBodyBox ? (
          <motion.p
            className={`${DECK_BODY_CLASS} absolute z-10 text-zinc-400`}
            style={{
              left: industrieBodyBox.left,
              top: industrieBodyBox.top,
              width: "22rem",
            }}
            {...dockNode0(0.05)}
          >
            {highlightDeckTeal(stations[0].body)}
          </motion.p>
        ) : null}

        {/* Corps Écosystème : sous le titre, aligné au titre (titre inchangé). */}
        {stations[2]?.body && ecosystemeBodyBox ? (
          <motion.p
            className={`${DECK_BODY_CLASS} absolute z-10 text-zinc-400`}
            style={{
              left: ecosystemeBodyBox.left,
              top: ecosystemeBodyBox.top,
              width: ecosystemeBodyBox.width,
            }}
            {...dockNode2(0.05)}
          >
            {highlightDeckTeal(stations[2].body)}
          </motion.p>
        ) : null}

        {/* Corps Pont : sous le titre, largeur = titre, aligné (titre inchangé). */}
        {bridge?.body && pontBodyBox ? (
          <motion.p
            className={`${DECK_BODY_EMPHASIS_CLASS} absolute z-10 text-white`}
            style={{
              left: pontBodyBox.left,
              top: pontBodyBox.top,
              width: pontBodyBox.width,
              textShadow: "none",
              filter: "none",
            }}
            {...dockBridge(0.05)}
          >
            {highlightDeckTeal(bridge.body)}
          </motion.p>
        ) : null}
      </div>
    </div>
  );
}
