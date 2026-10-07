"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { OdysseyLuminousText } from "@/src/components/marketing/OdysseyLuminousText";
import { editorialFont } from "@/src/lib/fonts";

import {
  DECK_ECOSYSTEM_LAST_STEP,
  DECK_ECOSYSTEM_STEP,
  DECK_ECOSYSTEM_WAITS_S,
  DECK_EYEBROW_CLASS,
  DECK_FILM_EASE,
  DECK_PHASE_CLASS,
  useDeckSoftDock,
  useDeckStepReveal,
} from "./deckSoftDock";

type DeckSlideEcosystemProps = {
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

/** Titres dans les disques ; corps sous les planètes ; comportement au milieu. */
const SHOW_PLANET_TITLES = true;
const SHOW_SCHEMA_BODIES = true;

/**
 * Deux mondes (100×60) + satellite autour de Familles.
 */
const PLANET_LEFT = {
  x: 22,
  y: 16,
  r: 9.0,
  anchor: "translate(-50%, -50%)",
  bodyMax: "23rem",
} as const;
const PLANET_RIGHT = {
  x: 78,
  y: 16,
  r: 7.6,
  ring: true,
  anchor: "translate(-50%, -50%)",
  bodyMax: "23rem",
} as const;
/** Orbite du satellite autour de Familles. */
const ORBIT = {
  cx: 78,
  cy: 16,
  rx: 12.8,
  ry: 6.8,
} as const;
/** Corps Salon / Familles — un peu plus haut. */
const BODY_Y = 34;
/** Comportement — encore plus haut, juste sous le schéma. */
const BEHAVIOR_BLOCK = {
  x: 50,
  y: 21,
  maxWidth: "20rem",
} as const;

function bodyTopPct() {
  return (BODY_Y / 60) * 100;
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

function isBehaviorLabel(label: string) {
  const n = label.toLowerCase();
  return (
    n.includes("comportement") ||
    n.includes("behavior") ||
    n.includes("behaviour")
  );
}

/**
 * Planète look #2 — éclipse Quiet Luxury.
 * Disque noir + halo soft + rim/croissant asymétrique. Même cx/cy partout.
 */
function Planet({
  cx,
  cy,
  r,
  ring,
  on,
  reduceMotion,
  delay = 0,
  gradId,
}: {
  cx: number;
  cy: number;
  r: number;
  ring?: boolean;
  on: boolean;
  reduceMotion: boolean | null;
  delay?: number;
  gradId: string;
}) {
  const haloId = `${gradId}-halo`;
  const diamondId = `${gradId}-diamond`;
  const blurSoft = `${gradId}-blur-soft`;
  const blurRim = `${gradId}-blur-rim`;
  const ringRx = r * 1.62;
  const ringRy = r * 0.26;
  /** Diamant — haut-droite, visible mais contenu. */
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
        {/* Milieu : atmosphère présente, pas un phare */}
        <radialGradient id={haloId} cx="50%" cy="50%" r="50%">
          <stop offset="72%" stopColor="rgba(140,210,230,0)" />
          <stop offset="86%" stopColor="rgba(150,220,235,0.11)" />
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
        r={r * 1.16}
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

      {ring ? (
        <ellipse
          cx={cx}
          cy={cy}
          rx={ringRx}
          ry={ringRy}
          fill="none"
          stroke="rgba(180,220,235,0.22)"
          strokeWidth="0.85"
        />
      ) : null}

      <circle cx={cx} cy={cy} r={r} fill="#030508" />
    </motion.g>
  );
}

/**
 * Slide 4 — Ecosystem : deux planètes + satellite (comportement).
 */
export function DeckSlideEcosystem({
  tagline,
  title,
  phase,
  bullets,
  active,
}: DeckSlideEcosystemProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { advance, visible, canAdvance } = useDeckStepReveal(
    active,
    DECK_ECOSYSTEM_WAITS_S,
    DECK_ECOSYSTEM_LAST_STEP,
  );
  const canAdvanceRef = useRef(canAdvance);
  const advanceRef = useRef(advance);
  canAdvanceRef.current = canAdvance;
  advanceRef.current = advance;

  const parsed = bullets.map(splitLabeledBullet);
  const behaviorIdx = parsed.findIndex((b) => isBehaviorLabel(b.label));
  const poles =
    behaviorIdx >= 0
      ? parsed.filter((_, i) => i !== behaviorIdx).slice(0, 2)
      : parsed.slice(0, 2);
  const behavior =
    behaviorIdx >= 0
      ? parsed[behaviorIdx]
      : parsed.length > 2
        ? parsed[2]
        : null;

  const dockEyebrow = useDeckSoftDock(visible(DECK_ECOSYSTEM_STEP.eyebrow));
  const dockHero = useDeckSoftDock(visible(DECK_ECOSYSTEM_STEP.hero));
  const dockPhase = useDeckSoftDock(visible(DECK_ECOSYSTEM_STEP.phase));
  const dockPole0 = useDeckSoftDock(visible(DECK_ECOSYSTEM_STEP.pole0));
  const dockPole1 = useDeckSoftDock(visible(DECK_ECOSYSTEM_STEP.pole1));
  const dockBody0 = useDeckSoftDock(visible(DECK_ECOSYSTEM_STEP.body0));
  const dockBody1 = useDeckSoftDock(visible(DECK_ECOSYSTEM_STEP.body1));
  const dockSpark = useDeckSoftDock(visible(DECK_ECOSYSTEM_STEP.spark));
  const dockPoles = [dockPole0, dockPole1];
  const dockBodies = [dockBody0, dockBody1];

  const showLeft = Boolean(reduceMotion || visible(DECK_ECOSYSTEM_STEP.pole0));
  const showRight = Boolean(reduceMotion || visible(DECK_ECOSYSTEM_STEP.pole1));
  const showOrbit = Boolean(reduceMotion || visible(DECK_ECOSYSTEM_STEP.arc));
  const showSat = Boolean(reduceMotion || visible(DECK_ECOSYSTEM_STEP.spark));

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
  const unitX = mapSize.w / 100;
  const unitY = mapSize.h / 60;

  const leftPx = useMemo(
    () => toPx(PLANET_LEFT.x, PLANET_LEFT.y),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapSize.w, mapSize.h],
  );
  const rightPx = useMemo(
    () => toPx(PLANET_RIGHT.x, PLANET_RIGHT.y),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapSize.w, mapSize.h],
  );
  const orbitPx = useMemo(
    () => ({
      cx: (ORBIT.cx / 100) * mapSize.w,
      cy: (ORBIT.cy / 60) * mapSize.h,
      rx: ORBIT.rx * unitX,
      ry: ORBIT.ry * unitY,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapSize.w, mapSize.h, unitX, unitY],
  );

  /** Canal droit Salon → Familles (s’arrête aux bords des corps). */
  const canalPath = useMemo(() => {
    const y = leftPx.y;
    const gapL = PLANET_LEFT.r * unitX + 6;
    const gapR = PLANET_RIGHT.r * unitX + 6;
    return `M ${leftPx.x + gapL} ${y} L ${rightPx.x - gapR} ${y}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftPx.x, leftPx.y, rightPx.x, unitX]);

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

  const planets = [PLANET_LEFT, PLANET_RIGHT] as const;

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
          className={`${editorialFont.className} ${DECK_PHASE_CLASS} relative z-10 mt-8 w-full max-w-[68rem] whitespace-pre-line text-[clamp(1.15rem,2.2vw,1.45rem)] font-medium leading-[1.35] tracking-[0.01em] md:mt-10`}
          style={{ WebkitFontSmoothing: "antialiased" }}
          {...dockPhase()}
        >
          {phase}
        </motion.p>
      </div>

      {SHOW_PLANET_TITLES ? (
        <div className="relative z-10 mt-10 flex w-full flex-col gap-10 md:hidden">
          {poles.map((item, i) => (
            <div key={`m-${item.label}`} className="relative pl-7">
              <motion.div {...(dockPoles[i] ?? dockPole1)()}>
                {item.label ? (
                  <p className="font-label text-[0.68rem] font-medium uppercase tracking-[0.3em] text-[var(--salon-cyan)]">
                    {item.label}
                  </p>
                ) : null}
              </motion.div>
              {SHOW_SCHEMA_BODIES ? (
                <motion.p
                  className={`${editorialFont.className} mt-2 text-[1.15rem] font-light leading-snug text-zinc-300`}
                  {...(dockBodies[i] ?? dockBody1)()}
                >
                  {item.body}
                </motion.p>
              ) : null}
            </div>
          ))}
          {SHOW_SCHEMA_BODIES && behavior ? (
            <motion.div className="relative pl-7 pt-2" {...dockSpark()}>
              {behavior.label ? (
                <p className="font-label text-[0.68rem] font-medium uppercase tracking-[0.3em] text-[var(--salon-cyan)]">
                  {behavior.label}
                </p>
              ) : null}
              <p
                className={`${editorialFont.className} mt-2 text-[1.15rem] font-medium leading-snug text-white/90`}
              >
                {behavior.body}
              </p>
            </motion.div>
          ) : null}
        </div>
      ) : null}

      <div
        ref={mapRef}
        className="relative z-10 -mt-2 hidden min-h-[min(58vh,34rem)] w-full -translate-y-[8%] md:mt-0 md:block lg:min-h-[min(62vh,38rem)]"
      >
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          width={mapSize.w}
          height={mapSize.h}
          viewBox={`0 0 ${mapSize.w} ${mapSize.h}`}
        >
          {/* Canal très discret (distribution) — après les 2 planètes */}
          <motion.path
            d={canalPath}
            fill="none"
            stroke="rgba(200,225,230,0.28)"
            strokeWidth="1.15"
            strokeLinecap="round"
            initial={false}
            animate={{
              pathLength: showOrbit ? 1 : 0,
              opacity: showOrbit ? 1 : 0,
            }}
            transition={{
              duration: reduceMotion ? 0 : 1.1,
              ease: DECK_FILM_EASE,
            }}
          />

          <Planet
            cx={leftPx.x}
            cy={leftPx.y}
            r={PLANET_LEFT.r * unitX}
            on={showLeft}
            reduceMotion={reduceMotion}
            gradId="deck-eco-planet-left"
          />
          <Planet
            cx={rightPx.x}
            cy={rightPx.y}
            r={PLANET_RIGHT.r * unitX}
            ring
            on={showRight}
            reduceMotion={reduceMotion}
            delay={0.05}
            gradId="deck-eco-planet-right"
          />

          {/* Orbite filaire + satellite */}
          <motion.ellipse
            cx={orbitPx.cx}
            cy={orbitPx.cy}
            rx={orbitPx.rx}
            ry={orbitPx.ry}
            fill="none"
            stroke="rgba(200,225,230,0.22)"
            strokeWidth="0.9"
            initial={false}
            animate={{ opacity: showOrbit || showSat ? 1 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.5 }}
          />

          {showSat || reduceMotion ? (
            <motion.g
              initial={false}
              animate={{ opacity: showSat ? 1 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.4 }}
            >
              <g>
                <animateMotion
                  dur={reduceMotion ? "0s" : "7s"}
                  repeatCount="indefinite"
                  path={`M ${orbitPx.cx + orbitPx.rx} ${orbitPx.cy} A ${orbitPx.rx} ${orbitPx.ry} 0 1 1 ${orbitPx.cx - orbitPx.rx} ${orbitPx.cy} A ${orbitPx.rx} ${orbitPx.ry} 0 1 1 ${orbitPx.cx + orbitPx.rx} ${orbitPx.cy}`}
                />
                <circle r="3.2" fill="rgba(230,245,250,0.2)" />
                <circle r="1.85" fill="rgba(220,235,240,0.95)" />
              </g>
            </motion.g>
          ) : null}
        </svg>

        {SHOW_PLANET_TITLES
          ? poles.map((item, i) => {
              const meta = planets[i];
              if (!meta || !item.label) return null;
              const dock = dockPoles[i] ?? dockPole1;
              return (
                <div
                  key={`lab-${item.label}-${i}`}
                  className="absolute z-20"
                  style={{
                    left: `${meta.x}%`,
                    top: `${(meta.y / 60) * 100}%`,
                    transform: meta.anchor,
                  }}
                >
                  <motion.p
                    className="font-label whitespace-nowrap text-center text-[clamp(0.78rem,1.05vw,0.95rem)] font-semibold uppercase tracking-[0.22em] text-[var(--salon-cyan)]"
                    {...dock()}
                  >
                    {item.label}
                  </motion.p>
                </div>
              );
            })
          : null}

        {SHOW_SCHEMA_BODIES
          ? poles.map((item, i) => {
              const meta = planets[i];
              if (!meta || !item.body) return null;
              const dock = dockBodies[i] ?? dockBody1;
              // Familles : boîte décalée à droite pour s’équilibrer sous la planète
              const bodyTransform =
                i === 1 ? "translate(-38%, 0)" : "translate(-50%, 0)";
              return (
                <div
                  key={`body-${item.label}-${i}`}
                  className="absolute z-20"
                  style={{
                    left: `${meta.x}%`,
                    top: `${bodyTopPct()}%`,
                    transform: bodyTransform,
                    maxWidth: meta.bodyMax,
                    width: meta.bodyMax,
                    textAlign: "left",
                  }}
                >
                  <motion.p
                    className={`${editorialFont.className} text-left text-[clamp(1.05rem,1.35vw,1.22rem)] font-light leading-snug text-zinc-300`}
                    {...dock()}
                  >
                    {item.body}
                  </motion.p>
                </div>
              );
            })
          : null}

        {SHOW_SCHEMA_BODIES && behavior ? (
          <div
            className="absolute z-20 text-center"
            style={{
              left: `${BEHAVIOR_BLOCK.x}%`,
              top: `${(BEHAVIOR_BLOCK.y / 60) * 100}%`,
              transform: "translate(-50%, 0)",
              maxWidth: BEHAVIOR_BLOCK.maxWidth,
              width: BEHAVIOR_BLOCK.maxWidth,
            }}
          >
            <motion.div {...dockSpark()}>
              {behavior.label ? (
                <p className="font-label whitespace-nowrap text-[clamp(0.78rem,1.05vw,0.95rem)] font-semibold uppercase tracking-[0.22em] text-[var(--salon-cyan)]">
                  {behavior.label}
                </p>
              ) : null}
              <p
                className={`${editorialFont.className} mt-2 text-[clamp(1.05rem,1.35vw,1.22rem)] font-medium leading-snug text-white/90`}
              >
                {behavior.body}
              </p>
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
