"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { OdysseyLuminousText } from "@/src/components/marketing/OdysseyLuminousText";
import { editorialFont } from "@/src/lib/fonts";

import {
  DECK_BODY_CLASS,
  DECK_EYEBROW_CLASS,
  DECK_FILM_EASE,
  DECK_LABEL_CLASS,
  DECK_TITLE_CLASS,
  DECK_TRACTION_LAST_STEP,
  DECK_TRACTION_STEP,
  DECK_TRACTION_WAITS_S,
  DECK_VISION_CLASS,
  useDeckSoftDock,
  useDeckStepReveal,
} from "./deckSoftDock";
import { highlightDeckTeal } from "./deckTealText";

type DeckSlideTractionProps = {
  tagline: string;
  title: string;
  phase: string;
  bullets: string[];
  active: boolean;
  foyerLabel: string;
  ringOuter: string;
  ringInner: string;
  hubLabel: string;
  arcFrom: string;
  arcTo: string;
  phaseBadge: string;
  productDesktop: string;
  partnersDesktop: string;
};

type SplitBullet = {
  label: string;
  body: string;
};

/** Cadre film Studio — espace 100×60, ratio ~16:9. */
const FRAME = {
  x: 21,
  y: 13,
  w: 30,
  h: 16.5,
  bodyMax: "22rem",
} as const;

/** Hub Athos + orbite. */
const HUB = {
  x: 75,
  y: 13,
  r: 7.8,
  bodyMax: "22rem",
} as const;

const ORBIT = {
  cx: 75,
  cy: 13,
  rx: 16.2,
  ry: 9,
} as const;

const SAT_ANGLES = [-28, 100, 210] as const;
const ORBIT_DUR_S = 12;

/**
 * Validation A — trait droit Modélisé ●——● Terrain, juste sous les corps.
 */
const ARC = {
  y: 45.5,
  x1: 36,
  x2: 64,
} as const;

/** Corps collés sous leurs objets (après Soft Cap sous le cadre). */
const BODY_BAND_TOP = `${(((FRAME.y + FRAME.h / 2 + 3.2) / 60) * 100).toFixed(2)}%`;
/** Titre validation juste sous le trait. */
const VALIDATION_TOP = `${(((ARC.y + 2.4) / 60) * 100).toFixed(2)}%`;

/** Playhead Studio : 1→7, pause, retour. */
const PLAYHEAD_FORWARD_MS = 5200;
const PLAYHEAD_HOLD_MS = 1100;
const PLAYHEAD_BACK_MS = 2400;

function splitLabeledBullet(raw: string): SplitBullet {
  const idx = raw.search(/\s*[:：]\s*/);
  if (idx < 0) return { label: "", body: raw };
  const sep = raw.slice(idx).match(/^(\s*[:：]\s*)/)?.[1] ?? ":";
  return {
    label: raw.slice(0, idx).trim(),
    body: raw.slice(idx + sep.length).trim(),
  };
}

function extractSatellites(body: string): string[] {
  const m = body.match(/\(([^)]+)\)/);
  if (!m?.[1]) return [];
  return m[1]
    .split(/\s*,\s*|\s+&\s+|\s+et\s+/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function satPosition(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: ORBIT.cx + ORBIT.rx * Math.cos(rad),
    y: ORBIT.cy + ORBIT.ry * Math.sin(rad),
  };
}

function orbitMotionPath(cx: number, cy: number, rx: number, ry: number) {
  return `M ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy}`;
}

function HubDisk({
  cx,
  cy,
  r,
  on,
  reduceMotion,
  delay = 0,
  gradId,
}: {
  cx: number;
  cy: number;
  r: number;
  on: boolean;
  reduceMotion: boolean | null;
  delay?: number;
  gradId: string;
}) {
  const haloId = `${gradId}-halo`;
  const diamondId = `${gradId}-diamond`;
  const blurSoft = `${gradId}-blur-soft`;
  const blurRim = `${gradId}-blur-rim`;
  const lx = cx + r * 0.68;
  const ly = cy - r * 0.58;

  return (
    <motion.g
      initial={false}
      animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.72 }}
      transition={{
        duration: reduceMotion ? 0 : 0.65,
        delay: reduceMotion ? 0 : delay,
        ease: DECK_FILM_EASE,
      }}
      style={{ transformOrigin: `${cx}px ${cy}px` }}
    >
      <defs>
        <radialGradient id={haloId} cx="50%" cy="50%" r="50%">
          <stop offset="72%" stopColor="rgba(140,210,230,0)" />
          <stop offset="86%" stopColor="rgba(150,220,235,0.12)" />
          <stop offset="95%" stopColor="rgba(160,225,240,0.05)" />
          <stop offset="100%" stopColor="rgba(140,210,230,0)" />
        </radialGradient>
        <radialGradient id={diamondId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="35%" stopColor="rgba(190,235,250,0.32)" />
          <stop offset="100%" stopColor="rgba(120,200,220,0)" />
        </radialGradient>
        <filter id={blurSoft} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation={Math.max(3.2, r * 0.072)} />
        </filter>
        <filter id={blurRim} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={Math.max(1.8, r * 0.042)} />
        </filter>
      </defs>

      <circle
        cx={cx}
        cy={cy}
        r={r * 1.18}
        fill={`url(#${haloId})`}
        filter={`url(#${blurSoft})`}
      />
      <circle
        cx={cx}
        cy={cy}
        r={r + Math.max(1, r * 0.015)}
        fill="none"
        stroke="rgba(180,225,240,0.42)"
        strokeWidth={Math.max(1.15, r * 0.024)}
        filter={`url(#${blurRim})`}
      />
      <circle
        cx={lx}
        cy={ly}
        r={r * 0.36}
        fill={`url(#${diamondId})`}
        filter={`url(#${blurSoft})`}
        opacity="0.78"
      />
      <circle cx={cx} cy={cy} r={r} fill="#030508" />
    </motion.g>
  );
}

/**
 * Slide 8 — Traction : title-card Studio + Athos / satellites + courbe validation.
 */
export function DeckSlideTraction({
  tagline,
  title,
  phase,
  bullets,
  active,
  foyerLabel,
  ringOuter,
  ringInner,
  hubLabel,
  arcFrom,
  arcTo,
  phaseBadge,
  productDesktop,
  partnersDesktop,
}: DeckSlideTractionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [mapSize, setMapSize] = useState({ w: 1000, h: 600 });

  const { advance, visible, canAdvance } = useDeckStepReveal(
    active,
    DECK_TRACTION_WAITS_S,
    DECK_TRACTION_LAST_STEP,
  );
  const canAdvanceRef = useRef(canAdvance);
  const advanceRef = useRef(advance);
  canAdvanceRef.current = canAdvance;
  advanceRef.current = advance;

  const [product, partners, validation] = bullets
    .map(splitLabeledBullet)
    .slice(0, 3);
  const satellites = extractSatellites(partners?.body ?? "");

  const dockEyebrow = useDeckSoftDock(visible(DECK_TRACTION_STEP.eyebrow));
  const dockHero = useDeckSoftDock(visible(DECK_TRACTION_STEP.hero));
  const dockPhase = useDeckSoftDock(visible(DECK_TRACTION_STEP.phase));
  const dockProduct = useDeckSoftDock(visible(DECK_TRACTION_STEP.product));
  const dockHub = useDeckSoftDock(visible(DECK_TRACTION_STEP.hub));
  const dockSats = useDeckSoftDock(visible(DECK_TRACTION_STEP.sats));
  const dockValidation = useDeckSoftDock(
    visible(DECK_TRACTION_STEP.validation),
  );

  const showProduct = Boolean(
    reduceMotion || visible(DECK_TRACTION_STEP.product),
  );
  const showHub = Boolean(reduceMotion || visible(DECK_TRACTION_STEP.hub));
  const showSats = Boolean(reduceMotion || visible(DECK_TRACTION_STEP.sats));
  const showValidation = Boolean(
    reduceMotion || visible(DECK_TRACTION_STEP.validation),
  );
  const orbitLive = Boolean(showSats && !reduceMotion && active);

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

  const unitX = mapSize.w / 100;
  const unitY = mapSize.h / 60;

  const framePx = useMemo(() => {
    const w = FRAME.w * unitX;
    const h = FRAME.h * unitY;
    const cx = (FRAME.x / 100) * mapSize.w;
    const cy = (FRAME.y / 60) * mapSize.h;
    return { cx, cy, w, h, x: cx - w / 2, y: cy - h / 2 };
  }, [mapSize.w, mapSize.h, unitX, unitY]);

  const hubPx = useMemo(
    () => ({
      x: (HUB.x / 100) * mapSize.w,
      y: (HUB.y / 60) * mapSize.h,
    }),
    [mapSize.w, mapSize.h],
  );
  const orbitPx = useMemo(
    () => ({
      cx: (ORBIT.cx / 100) * mapSize.w,
      cy: (ORBIT.cy / 60) * mapSize.h,
      rx: ORBIT.rx * unitX,
      ry: ORBIT.ry * unitY,
    }),
    [mapSize.w, mapSize.h, unitX, unitY],
  );
  const motionPath = useMemo(
    () => orbitMotionPath(orbitPx.cx, orbitPx.cy, orbitPx.rx, orbitPx.ry),
    [orbitPx.cx, orbitPx.cy, orbitPx.rx, orbitPx.ry],
  );
  const arcLine = useMemo(() => {
    const x1 = (ARC.x1 / 100) * mapSize.w;
    const x2 = (ARC.x2 / 100) * mapSize.w;
    const y = (ARC.y / 60) * mapSize.h;
    return { x1, x2, y };
  }, [mapSize.w, mapSize.h]);

  /** 0 = étape 1, 1 = étape 7. */
  const [playheadProgress, setPlayheadProgress] = useState(0);

  useEffect(() => {
    if (!showProduct || !active) {
      setPlayheadProgress(0);
      return;
    }
    if (reduceMotion) {
      setPlayheadProgress(1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const cycle =
      PLAYHEAD_FORWARD_MS + PLAYHEAD_HOLD_MS + PLAYHEAD_BACK_MS;

    const tick = (now: number) => {
      const t = (now - start) % cycle;
      let p: number;
      if (t < PLAYHEAD_FORWARD_MS) {
        p = t / PLAYHEAD_FORWARD_MS;
      } else if (t < PLAYHEAD_FORWARD_MS + PLAYHEAD_HOLD_MS) {
        p = 1;
      } else {
        p = 1 - (t - PLAYHEAD_FORWARD_MS - PLAYHEAD_HOLD_MS) / PLAYHEAD_BACK_MS;
      }
      setPlayheadProgress(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showProduct, active, reduceMotion]);

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

  const satStatic = SAT_ANGLES.map((angle, i) => ({
    ...satPosition(angle),
    name: satellites[i] ?? "",
  })).filter((s) => s.name);

  /** Timeline basse dans le cadre (noir propre, sans gribouillis). */
  const stepTicks = useMemo(() => {
    const pad = framePx.w * 0.12;
    const y = framePx.y + framePx.h * 0.78;
    const span = framePx.w - pad * 2;
    return Array.from({ length: 7 }, (_, i) => ({
      x: framePx.x + pad + (span * i) / 6,
      y,
      n: i + 1,
    }));
  }, [framePx.x, framePx.y, framePx.w, framePx.h]);

  const tickY = stepTicks[0]?.y ?? framePx.y + framePx.h * 0.78;
  const numR = Math.max(3.6, unitX * 0.52);
  const numFont = Math.max(7, unitX * 0.55);
  /** Espace clair entre ronds-chiffres et ticks. */
  const numGap = Math.max(14, framePx.h * 0.14);
  const litThrough = Math.min(7, Math.max(1, Math.floor(playheadProgress * 6) + 1));
  const playheadX =
    (stepTicks[0]?.x ?? framePx.x) +
    playheadProgress *
      ((stepTicks[6]?.x ?? framePx.x + framePx.w) - (stepTicks[0]?.x ?? framePx.x));

  return (
    <div
      ref={rootRef}
      className={`relative mx-auto flex w-full max-w-[90rem] flex-col px-3 md:px-6 ${
        canAdvance ? "cursor-pointer" : ""
      }`}
    >
      <div className="relative z-10 mx-auto flex w-full max-w-[90rem] -translate-y-[46%] flex-col items-center text-center">
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

      {/* Mobile — stack narratif (corps complet) */}
      <div className="relative z-10 mt-8 flex w-full flex-col gap-10 md:hidden">
        {product ? (
          <motion.div className="text-left" {...dockProduct()}>
            {product.label ? (
              <p className={DECK_LABEL_CLASS}>{product.label}</p>
            ) : null}
            <p className={`${DECK_BODY_CLASS} mt-2.5`}>
              {highlightDeckTeal(product.body)}
            </p>
          </motion.div>
        ) : null}
        {partners ? (
          <motion.div className="text-left" {...dockHub()}>
            {partners.label ? (
              <p className={DECK_LABEL_CLASS}>{partners.label}</p>
            ) : null}
            <p className={`${DECK_BODY_CLASS} mt-2.5`}>
              {highlightDeckTeal(partners.body)}
            </p>
          </motion.div>
        ) : null}
        {validation ? (
          <motion.div className="text-left" {...dockValidation()}>
            {validation.label ? (
              <p className={DECK_LABEL_CLASS}>{validation.label}</p>
            ) : null}
            <p className={`${DECK_BODY_CLASS} mt-2.5`}>
              {highlightDeckTeal(validation.body)}
            </p>
          </motion.div>
        ) : null}
      </div>

      {/* Desktop */}
      <div
        ref={mapRef}
        className="relative z-10 -mt-2 hidden min-h-[min(60vh,36rem)] w-full -translate-y-[2%] md:mt-0 md:block lg:min-h-[min(64vh,40rem)]"
      >
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          width={mapSize.w}
          height={mapSize.h}
          viewBox={`0 0 ${mapSize.w} ${mapSize.h}`}
        >
          {/* Studio — rectangle, même finition halo/rim qu’Athos */}
          <motion.g
            initial={false}
            animate={{
              opacity: showProduct ? 1 : 0,
              scale: showProduct ? 1 : 0.9,
            }}
            transition={{
              duration: reduceMotion ? 0 : 0.7,
              ease: DECK_FILM_EASE,
            }}
            style={{
              transformOrigin: `${framePx.cx}px ${framePx.cy}px`,
            }}
          >
            <defs>
              <radialGradient
                id="deck-trac-frame-halo"
                cx="50%"
                cy="50%"
                r="50%"
              >
                <stop offset="62%" stopColor="rgba(140,210,230,0)" />
                <stop offset="82%" stopColor="rgba(150,220,235,0.13)" />
                <stop offset="94%" stopColor="rgba(160,225,240,0.05)" />
                <stop offset="100%" stopColor="rgba(140,210,230,0)" />
              </radialGradient>
              <radialGradient
                id="deck-trac-frame-diamond"
                cx="50%"
                cy="50%"
                r="50%"
              >
                <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
                <stop offset="35%" stopColor="rgba(190,235,250,0.32)" />
                <stop offset="100%" stopColor="rgba(120,200,220,0)" />
              </radialGradient>
              <filter
                id="deck-trac-frame-blur-soft"
                x="-40%"
                y="-50%"
                width="180%"
                height="200%"
              >
                <feGaussianBlur stdDeviation={Math.max(3.4, framePx.w * 0.018)} />
              </filter>
              <filter
                id="deck-trac-frame-blur-rim"
                x="-20%"
                y="-25%"
                width="140%"
                height="150%"
              >
                <feGaussianBlur stdDeviation={Math.max(1.6, framePx.w * 0.008)} />
              </filter>
            </defs>

            {/* Halo (même ADN planète) */}
            <ellipse
              cx={framePx.cx}
              cy={framePx.cy}
              rx={framePx.w * 0.72}
              ry={framePx.h * 0.82}
              fill="url(#deck-trac-frame-halo)"
              filter="url(#deck-trac-frame-blur-soft)"
            />
            {/* Rim soft */}
            <rect
              x={framePx.x - 1.5}
              y={framePx.y - 1.5}
              width={framePx.w + 3}
              height={framePx.h + 3}
              rx={2}
              ry={2}
              fill="none"
              stroke="rgba(180,225,240,0.42)"
              strokeWidth={Math.max(1.15, framePx.w * 0.008)}
              filter="url(#deck-trac-frame-blur-rim)"
            />
            {/* Diamond haut-droite */}
            <circle
              cx={framePx.x + framePx.w * 0.82}
              cy={framePx.y + framePx.h * 0.18}
              r={Math.min(framePx.w, framePx.h) * 0.16}
              fill="url(#deck-trac-frame-diamond)"
              filter="url(#deck-trac-frame-blur-soft)"
              opacity="0.78"
            />
            {/* Corps noir */}
            <rect
              x={framePx.x}
              y={framePx.y}
              width={framePx.w}
              height={framePx.h}
              rx={1.5}
              ry={1.5}
              fill="#030508"
              stroke="rgba(190,230,245,0.28)"
              strokeWidth="1"
            />

            {/* Timeline : ligne + points + ronds 1–7 + playhead */}
            <line
              x1={framePx.x + framePx.w * 0.12}
              y1={tickY}
              x2={framePx.x + framePx.w * 0.88}
              y2={tickY}
              stroke="rgba(200,225,230,0.28)"
              strokeWidth="1"
            />
            {stepTicks.map((t) => {
              const lit = t.n <= litThrough;
              return (
                <g key={`tick-${t.n}`}>
                  <circle
                    cx={t.x}
                    cy={t.y - numGap}
                    r={numR}
                    fill={lit ? "rgba(120,200,220,0.14)" : "none"}
                    stroke={
                      lit
                        ? "var(--salon-cyan)"
                        : "rgba(180,225,240,0.28)"
                    }
                    strokeWidth="1"
                  />
                  <text
                    x={t.x}
                    y={t.y - numGap}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={
                      lit
                        ? "var(--salon-cyan)"
                        : "rgba(180,225,240,0.35)"
                    }
                    style={{
                      fontFamily: "var(--font-label, Inter, sans-serif)",
                      fontSize: numFont,
                      fontWeight: 500,
                    }}
                  >
                    {t.n}
                  </text>
                  <circle
                    cx={t.x}
                    cy={t.y}
                    r={lit ? 2.4 : 1.55}
                    fill={
                      lit
                        ? "rgba(200,235,245,0.95)"
                        : "rgba(200,225,230,0.28)"
                    }
                  />
                </g>
              );
            })}
            {showProduct ? (
              <line
                x1={playheadX}
                y1={tickY - numGap * 0.55}
                x2={playheadX}
                y2={tickY + framePx.h * 0.07}
                stroke="rgba(180,230,245,0.9)"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            ) : null}
          </motion.g>

          {/* Orbite + hub */}
          <motion.ellipse
            cx={orbitPx.cx}
            cy={orbitPx.cy}
            rx={orbitPx.rx}
            ry={orbitPx.ry}
            fill="none"
            stroke="rgba(200,225,230,0.24)"
            strokeWidth="0.95"
            initial={false}
            animate={{ opacity: showSats || showHub ? 1 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.55 }}
          />

          <HubDisk
            cx={hubPx.x}
            cy={hubPx.y}
            r={HUB.r * unitX}
            on={showHub}
            reduceMotion={reduceMotion}
            gradId="deck-trac-hub"
          />

          {satellites.map((name, i) => {
            if (orbitLive) {
              const begin = `${(-i * (ORBIT_DUR_S / 3)).toFixed(2)}s`;
              return (
                <motion.g
                  key={`sat-live-${name}`}
                  initial={false}
                  animate={{ opacity: showSats ? 1 : 0 }}
                  transition={{
                    duration: 0.45,
                    delay: reduceMotion ? 0 : 0.06 * i,
                  }}
                >
                  <g>
                    <animateMotion
                      dur={`${ORBIT_DUR_S}s`}
                      repeatCount="indefinite"
                      begin={begin}
                      path={motionPath}
                    />
                    <circle r="5" fill="rgba(230,245,250,0.14)" />
                    <circle r="2.7" fill="rgba(220,235,240,0.95)" />
                    <text
                      y="-13"
                      textAnchor="middle"
                      fill="var(--salon-cyan)"
                      style={{
                        fontFamily: "var(--font-label, Inter, sans-serif)",
                        fontSize: Math.max(10.5, unitX * 1),
                        fontWeight: 500,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {name}
                    </text>
                  </g>
                </motion.g>
              );
            }

            const sat = satStatic[i];
            if (!sat) return null;
            const sx = (sat.x / 100) * mapSize.w;
            const sy = (sat.y / 60) * mapSize.h;
            return (
              <motion.g
                key={`sat-static-${name}`}
                initial={false}
                animate={{ opacity: showSats ? 1 : 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.45 }}
              >
                <circle cx={sx} cy={sy} r={5} fill="rgba(230,245,250,0.14)" />
                <circle
                  cx={sx}
                  cy={sy}
                  r={2.7}
                  fill="rgba(220,235,240,0.95)"
                />
                <text
                  x={sx}
                  y={sy - 13}
                  textAnchor="middle"
                  fill="var(--salon-cyan)"
                  style={{
                    fontFamily: "var(--font-label, Inter, sans-serif)",
                    fontSize: Math.max(10.5, unitX * 1),
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                  }}
                >
                  {name}
                </text>
              </motion.g>
            );
          })}

          {/* Validation A — trait droit + 2 bornes */}
          <motion.line
            x1={arcLine.x1}
            y1={arcLine.y}
            x2={arcLine.x2}
            y2={arcLine.y}
            stroke="rgba(180,225,240,0.5)"
            strokeWidth="1.35"
            strokeLinecap="round"
            initial={false}
            animate={{
              pathLength: showValidation ? 1 : 0,
              opacity: showValidation ? 1 : 0,
            }}
            transition={{
              duration: reduceMotion ? 0 : 0.9,
              ease: DECK_FILM_EASE,
            }}
          />
          {[arcLine.x1, arcLine.x2].map((px, i) => (
            <motion.circle
              key={`arc-end-${i}`}
              cx={px}
              cy={arcLine.y}
              r={3.2}
              fill="rgba(200,230,240,0.9)"
              initial={false}
              animate={{ opacity: showValidation ? 1 : 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.4,
                delay: reduceMotion ? 0 : 0.12 * i,
              }}
            />
          ))}
        </svg>

        {/* STUDIO au-dessus du cadre + badge Phase 1 */}
        <div
          className="absolute z-20"
          style={{
            left: `${FRAME.x}%`,
            top: `${((FRAME.y - FRAME.h / 2 - 1.6) / 60) * 100}%`,
            transform: "translate(-50%, -50%)",
            width: `${FRAME.w}%`,
          }}
        >
          <motion.div
            className="relative flex items-center justify-center"
            {...dockProduct()}
          >
            <p
              className={`${DECK_LABEL_CLASS} whitespace-nowrap tracking-[0.22em]`}
            >
              {foyerLabel}
            </p>
            <span className="font-label absolute right-0 top-1/2 -translate-y-1/2 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-[var(--salon-cyan)]/85">
              {phaseBadge}
            </span>
          </motion.div>
        </div>

        {/* Soft Cap · Sanctuaire — sous le cadre, hors timeline */}
        <div
          className="absolute z-20 text-center"
          style={{
            left: `${FRAME.x}%`,
            top: `${((FRAME.y + FRAME.h / 2 + 1.1) / 60) * 100}%`,
            transform: "translate(-50%, 0)",
          }}
        >
          <motion.p
            className="font-label whitespace-nowrap text-[0.78rem] font-medium uppercase tracking-[0.18em] text-white/60"
            {...dockProduct()}
          >
            {ringOuter}
            <span className="mx-1.5 text-white/28">·</span>
            {ringInner}
          </motion.p>
        </div>

        {/* Corps produit — collé sous le cadre */}
        <div
          className="absolute z-20"
          style={{
            left: `${FRAME.x}%`,
            top: BODY_BAND_TOP,
            transform: "translate(-50%, 0)",
            maxWidth: FRAME.bodyMax,
            width: FRAME.bodyMax,
          }}
        >
          <motion.div {...dockProduct()}>
            {product?.label ? (
              <p className={`${DECK_LABEL_CLASS} tracking-[0.22em]`}>
                {product.label}
              </p>
            ) : null}
            <p className={`${DECK_BODY_CLASS} mt-2 text-left`}>
              {highlightDeckTeal(productDesktop)}
            </p>
          </motion.div>
        </div>

        {/* Athos */}
        <div
          className="absolute z-20 text-center"
          style={{
            left: `${HUB.x}%`,
            top: `${(HUB.y / 60) * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <motion.p
            className={`${DECK_LABEL_CLASS} whitespace-nowrap tracking-[0.22em]`}
            {...dockHub()}
          >
            {hubLabel}
          </motion.p>
        </div>

        {/* Corps partenaires — collé sous Athos */}
        <div
          className="absolute z-20"
          style={{
            left: `${HUB.x}%`,
            top: BODY_BAND_TOP,
            transform: "translate(-50%, 0)",
            maxWidth: HUB.bodyMax,
            width: HUB.bodyMax,
          }}
        >
          <motion.div {...dockSats()}>
            {partners?.label ? (
              <p className={`${DECK_LABEL_CLASS} tracking-[0.22em]`}>
                {partners.label}
              </p>
            ) : null}
            <p className={`${DECK_BODY_CLASS} mt-2 text-left`}>
              {highlightDeckTeal(partnersDesktop)}
            </p>
          </motion.div>
        </div>

        {/* Module validation : arc + labels + titre + corps */}
        <div
          className="absolute z-20"
          style={{
            left: `${ARC.x1}%`,
            top: `${(ARC.y / 60) * 100}%`,
            transform: "translate(-50%, -1.2rem)",
          }}
        >
          <motion.p
            className="font-label whitespace-nowrap text-[0.75rem] font-medium uppercase tracking-[0.16em] text-[var(--salon-cyan)]"
            {...dockValidation()}
          >
            {arcFrom}
          </motion.p>
        </div>
        <div
          className="absolute z-20"
          style={{
            left: `${ARC.x2}%`,
            top: `${(ARC.y / 60) * 100}%`,
            transform: "translate(-50%, -1.2rem)",
          }}
        >
          <motion.p
            className="font-label whitespace-nowrap text-[0.75rem] font-medium uppercase tracking-[0.16em] text-[var(--salon-cyan)]"
            {...dockValidation()}
          >
            {arcTo}
          </motion.p>
        </div>

        {validation?.body ? (
          <div
            className="absolute z-20 text-center"
            style={{
              left: "50%",
              top: VALIDATION_TOP,
              transform: "translate(-50%, 0)",
              maxWidth: "34rem",
              width: "34rem",
            }}
          >
            <motion.div {...dockValidation()}>
              {validation.label ? (
                <p className={`${DECK_LABEL_CLASS} tracking-[0.22em]`}>
                  {validation.label}
                </p>
              ) : null}
              <p className={`${DECK_BODY_CLASS} mt-2`}>
                {highlightDeckTeal(validation.body)}
              </p>
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
