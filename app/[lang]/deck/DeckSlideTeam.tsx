"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { OdysseyLuminousText } from "@/src/components/marketing/OdysseyLuminousText";
import { editorialFont } from "@/src/lib/fonts";

import {
  DECK_BODY_CLASS,
  DECK_DOCK_DUR,
  DECK_EYEBROW_CLASS,
  DECK_FILM_EASE,
  DECK_LABEL_CLASS,
  DECK_TEAM_LAST_STEP,
  DECK_TEAM_STEP,
  DECK_TEAM_WAITS_S,
  DECK_TITLE_CLASS,
  useDeckSoftDock,
  useDeckStepReveal,
} from "./deckSoftDock";
import { DeckVision } from "./DeckVision";
import { highlightDeckTeal } from "./deckTealText";

type DeckSlideTeamProps = {
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

/** Espace 100×60 — diptyque Erik | Jon. */
const POLE_LEFT = { x: 28, y: 16, r: 8.2, bodyMax: "22rem" } as const;
const POLE_RIGHT = { x: 72, y: 16, r: 8.2, bodyMax: "22rem" } as const;
const BODY_TOP = "48%";
const ADVANTAGE_TOP = "78%";

const DECK_SVG_DOCK_Y = 10;

function splitLabeledBullet(raw: string): SplitBullet {
  const idx = raw.search(/\s*[:：]\s*/);
  if (idx < 0) return { label: "", body: raw };
  const sep = raw.slice(idx).match(/^(\s*[:：]\s*)/)?.[1] ?? ":";
  return {
    label: raw.slice(0, idx).trim(),
    body: raw.slice(idx + sep.length).trim(),
  };
}

/** « Erik (CEO & CPO) » → { name, role }. */
function splitNameRole(label: string): { name: string; role: string } {
  const m = label.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (m) {
    return { name: m[1].trim(), role: m[2].trim() };
  }
  return { name: label.trim(), role: "" };
}

function deckSvgSoftDock(
  play: boolean,
  reduceMotion: boolean | null,
  delay = 0,
) {
  if (reduceMotion) {
    return {
      initial: false as const,
      animate: { opacity: 1, transform: "translateY(0px)" },
      transition: { duration: 0 },
    };
  }
  return {
    initial: false as const,
    animate: play
      ? { opacity: 1, transform: "translateY(0px)" }
      : {
          opacity: 0,
          transform: `translateY(${DECK_SVG_DOCK_Y}px)`,
        },
    transition: {
      duration: play ? DECK_DOCK_DUR : 0.35,
      ease: DECK_FILM_EASE,
      delay: play ? delay : 0,
    },
  };
}

function TeamDisk({
  cx,
  cy,
  r,
  on,
  reduceMotion,
  gradId,
}: {
  cx: number;
  cy: number;
  r: number;
  on: boolean;
  reduceMotion: boolean | null;
  gradId: string;
}) {
  const haloId = `${gradId}-halo`;
  const diamondId = `${gradId}-diamond`;
  const blurSoft = `${gradId}-blur-soft`;
  const blurRim = `${gradId}-blur-rim`;
  const lx = cx + r * 0.68;
  const ly = cy - r * 0.58;

  return (
    <motion.g {...deckSvgSoftDock(on, reduceMotion)}>
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
 * Slide 9 — Team : diptyque Erik | Jon + coda avantage déloyal.
 */
export function DeckSlideTeam({
  tagline,
  title,
  phase,
  bullets,
  active,
}: DeckSlideTeamProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [mapSize, setMapSize] = useState({ w: 1000, h: 600 });

  const { advance, visible, canAdvance } = useDeckStepReveal(
    active,
    DECK_TEAM_WAITS_S,
    DECK_TEAM_LAST_STEP,
  );
  const canAdvanceRef = useRef(canAdvance);
  const advanceRef = useRef(advance);
  canAdvanceRef.current = canAdvance;
  advanceRef.current = advance;

  const [erik, jon, advantage] = bullets.map(splitLabeledBullet).slice(0, 3);

  const dockEyebrow = useDeckSoftDock(visible(DECK_TEAM_STEP.eyebrow));
  const dockHero = useDeckSoftDock(visible(DECK_TEAM_STEP.hero));
  const dockPhase = useDeckSoftDock(visible(DECK_TEAM_STEP.phase));
  const dockErik = useDeckSoftDock(visible(DECK_TEAM_STEP.erik));
  const dockJon = useDeckSoftDock(visible(DECK_TEAM_STEP.jon));
  const dockAdvantage = useDeckSoftDock(visible(DECK_TEAM_STEP.advantage));

  const showErik = Boolean(reduceMotion || visible(DECK_TEAM_STEP.erik));
  const showJon = Boolean(reduceMotion || visible(DECK_TEAM_STEP.jon));
  const showAdvantage = Boolean(
    reduceMotion || visible(DECK_TEAM_STEP.advantage),
  );

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
  const leftPx = useMemo(
    () => ({
      x: (POLE_LEFT.x / 100) * mapSize.w,
      y: (POLE_LEFT.y / 60) * mapSize.h,
    }),
    [mapSize.w, mapSize.h],
  );
  const rightPx = useMemo(
    () => ({
      x: (POLE_RIGHT.x / 100) * mapSize.w,
      y: (POLE_RIGHT.y / 60) * mapSize.h,
    }),
    [mapSize.w, mapSize.h],
  );

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

  const poles = [
    {
      meta: POLE_LEFT,
      px: leftPx,
      person: erik,
      show: showErik,
      dock: dockErik,
      gradId: "deck-team-erik",
    },
    {
      meta: POLE_RIGHT,
      px: rightPx,
      person: jon,
      show: showJon,
      dock: dockJon,
      gradId: "deck-team-jon",
    },
  ] as const;

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

        <DeckVision text={phase} {...dockPhase()} />
      </div>

      {/* Mobile */}
      <div className="relative z-10 mt-8 flex w-full flex-col gap-10 md:hidden">
        {poles.map(({ person, dock }, i) => {
          if (!person) return null;
          const { name, role } = splitNameRole(person.label);
          return (
            <motion.div
              key={`m-${person.label || i}`}
              className="text-left"
              {...dock()}
            >
              {name ? (
                <p
                  className={`${editorialFont.className} text-[clamp(1.5rem,3vw,2rem)] font-medium text-[var(--salon-cyan)]`}
                >
                  {name}
                </p>
              ) : null}
              {role ? (
                <p className={`${DECK_LABEL_CLASS} mt-2`}>{role}</p>
              ) : null}
              <p className={`${DECK_BODY_CLASS} mt-2.5`}>
                {highlightDeckTeal(person.body)}
              </p>
            </motion.div>
          );
        })}
        {advantage ? (
          <motion.div className="text-left" {...dockAdvantage()}>
            {advantage.label ? (
              <p className={DECK_LABEL_CLASS}>{advantage.label}</p>
            ) : null}
            <p className={`${DECK_BODY_CLASS} mt-2.5`}>
              {highlightDeckTeal(advantage.body)}
            </p>
          </motion.div>
        ) : null}
      </div>

      {/* Desktop — diptyque */}
      <div
        ref={mapRef}
        className="relative z-10 -mt-2 hidden min-h-[min(58vh,34rem)] w-full -translate-y-[2%] md:mt-0 md:block lg:min-h-[min(62vh,38rem)]"
      >
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          width={mapSize.w}
          height={mapSize.h}
          viewBox={`0 0 ${mapSize.w} ${mapSize.h}`}
        >
          {/* Canal discret entre les deux */}
          <motion.line
            x1={leftPx.x + POLE_LEFT.r * unitX + 8}
            y1={leftPx.y}
            x2={rightPx.x - POLE_RIGHT.r * unitX - 8}
            y2={rightPx.y}
            stroke="rgba(200,225,230,0.22)"
            strokeWidth="1.1"
            strokeLinecap="round"
            {...deckSvgSoftDock(showJon, reduceMotion, 0.05)}
          />

          {poles.map(({ meta, px, show, gradId }) => (
            <TeamDisk
              key={gradId}
              cx={px.x}
              cy={px.y}
              r={meta.r * unitX}
              on={show}
              reduceMotion={reduceMotion}
              gradId={gradId}
            />
          ))}

          {/* Trait coda avantage */}
          <motion.g {...deckSvgSoftDock(showAdvantage, reduceMotion)}>
            <line
              x1={mapSize.w * 0.32}
              y1={(46 / 60) * mapSize.h}
              x2={mapSize.w * 0.68}
              y2={(46 / 60) * mapSize.h}
              stroke="rgba(180,225,240,0.4)"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </motion.g>
        </svg>

        {poles.map(({ meta, person, dock }) => {
          if (!person) return null;
          const { name, role } = splitNameRole(person.label);
          return (
            <div key={`pole-${meta.x}`}>
              {/* Nom dans le disque */}
              <div
                className="absolute z-20 text-center"
                style={{
                  left: `${meta.x}%`,
                  top: `${(meta.y / 60) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <motion.p
                  className={`${editorialFont.className} text-[clamp(1.35rem,2.4vw,1.95rem)] font-medium tracking-[0.02em] text-[var(--salon-cyan)]`}
                  {...dock()}
                >
                  {name}
                </motion.p>
              </div>

              {/* Titre + corps sous le disque */}
              <div
                className="absolute z-20 text-center"
                style={{
                  left: `${meta.x}%`,
                  top: BODY_TOP,
                  transform: "translate(-50%, 0)",
                  maxWidth: meta.bodyMax,
                  width: meta.bodyMax,
                }}
              >
                <motion.div {...dock()}>
                  {role ? (
                    <p className={`${DECK_LABEL_CLASS} tracking-[0.18em]`}>
                      {role}
                    </p>
                  ) : null}
                  <p
                    className={`${DECK_BODY_CLASS} mt-2.5 whitespace-pre-line text-center`}
                  >
                    {highlightDeckTeal(
                      person.body.replace(/\.\s+/g, ".\n"),
                    )}
                  </p>
                </motion.div>
              </div>
            </div>
          );
        })}

        {advantage ? (
          <div
            className="absolute z-20 text-center"
            style={{
              left: "50%",
              top: ADVANTAGE_TOP,
              transform: "translate(-50%, 0)",
              maxWidth: "40rem",
              width: "40rem",
            }}
          >
            <motion.div {...dockAdvantage()}>
              {advantage.label ? (
                <p className={`${DECK_LABEL_CLASS} tracking-[0.22em]`}>
                  {advantage.label}
                </p>
              ) : null}
              <p className={`${DECK_BODY_CLASS} mt-2.5`}>
                {highlightDeckTeal(advantage.body)}
              </p>
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
