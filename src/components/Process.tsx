"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AppDictionary } from "../../lib/dictionaries";
import type { Locale } from "../../i18n.config";
import {
  editorialAccentRule,
  editorialColumn,
  editorialSectionShell,
} from "../lib/editorialSkin";
import { LOCOMOTIVE_EASE, CINEMATIC_VIEWPORT } from "../lib/cinematicMotion";
import { CinematicWordReveal } from "./CinematicWordReveal";

const KICKER_DURATION = 0.85;

/** Cinema-style spotlight: each step reads as “selected” before handing off to the next */
const SPOTLIGHT_INTERVAL_MS = 3000;
const SPOTLIGHT_TRANSITION = {
  duration: 0.9,
  ease: LOCOMOTIVE_EASE,
} as const;

const FILM_GRAIN_CSS = `
  .process-grain::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: url("https://grainy-gradients.vercel.app/noise.svg");
    background-size: 200px;
    opacity: 0.055;
    pointer-events: none;
    animation: process-grain-shift 8s steps(6) infinite;
  }
  @keyframes process-grain-shift {
    0%, 100% { transform: translate(0, 0); }
    33% { transform: translate(-1%, 1.5%); }
    66% { transform: translate(1.5%, -1%); }
  }
`;

function useDominantStepIndex(stepCount: number, lang: Locale) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const setStepRef = useCallback((index: number) => (el: HTMLElement | null) => {
    refs.current[index] = el;
  }, []);

  useLayoutEffect(() => {
    const elements = refs.current.filter(Boolean) as HTMLElement[];
    if (elements.length !== stepCount) return;

    const ratios = new Map<Element, number>();
    elements.forEach((el) => ratios.set(el, 0));

    const pickDominant = () => {
      let bestIdx = 0;
      let bestRatio = -1;
      elements.forEach((el, i) => {
        const r = ratios.get(el) ?? 0;
        if (r > bestRatio) {
          bestRatio = r;
          bestIdx = i;
        }
      });
      if (bestRatio > 0.04) setActiveIndex(bestIdx);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          ratios.set(e.target, e.intersectionRatio);
        });
        pickDominant();
      },
      {
        root: null,
        rootMargin: "-36% 0px -36% 0px",
        threshold: [
          0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6,
          0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1,
        ],
      },
    );

    elements.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [stepCount, lang]);

  return { activeIndex, setStepRef };
}

export function Process({
  lang,
  dictionary,
}: {
  lang: Locale;
  dictionary: AppDictionary["process"];
}) {
  const t = dictionary;
  const stepCount = t.steps.length;
  const { activeIndex, setStepRef } = useDominantStepIndex(stepCount, lang);

  const sectionRef = useRef<HTMLElement>(null);
  const sectionInView = useInView(sectionRef, {
    margin: "-10% 0px",
    amount: 0.14,
    once: false,
  });
  const prefersReducedMotion = useReducedMotion();
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  useEffect(() => {
    setSpotlightIndex(0);
  }, [lang]);

  useEffect(() => {
    if (!sectionInView || prefersReducedMotion === true) return;
    const id = window.setInterval(() => {
      setSpotlightIndex((i) => (i + 1) % stepCount);
    }, SPOTLIGHT_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [sectionInView, prefersReducedMotion, stepCount]);

  const useSpotlightCycle = sectionInView && prefersReducedMotion !== true;
  const emphasizedIndex = useSpotlightCycle ? spotlightIndex : activeIndex;

  const stepKeys = useMemo(
    () => t.steps.map((s) => `${lang}-${s.title}`),
    [lang, t.steps],
  );
  const stepLabels = useMemo(
    () => ({
      step1Label: t.step1Label,
      step2Label: t.step2Label,
      step3Label: t.step3Label,
    }),
    [t.step1Label, t.step2Label, t.step3Label],
  );

  return (
    <section
      ref={sectionRef}
      id="process"
      className={`process-grain relative isolate overflow-hidden px-6 py-20 md:px-12 md:py-28 ${editorialSectionShell}`}
    >
      <style dangerouslySetInnerHTML={{ __html: FILM_GRAIN_CSS }} />

      {/* Soft vignette + lens accent (very low contrast, dignified) */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_35%,rgba(0,232,240,0.05),transparent_62%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl md:max-w-[92rem]">
        <div key={lang}>
          <div className={`${editorialColumn} md:max-w-[76rem] lg:max-w-[92rem] ${editorialAccentRule}`}>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={CINEMATIC_VIEWPORT}
              transition={{ duration: KICKER_DURATION, ease: LOCOMOTIVE_EASE }}
              className="font-editorial text-3xl tracking-tight text-white antialiased md:text-4xl"
            >
              {t.emotionalKicker}
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={CINEMATIC_VIEWPORT}
              transition={{ duration: KICKER_DURATION * 0.85, ease: LOCOMOTIVE_EASE, delay: 0.06 }}
              className="font-label mt-4 text-[11px] font-bold uppercase tracking-[0.46em] text-zinc-300"
            >
              {t.sectionSubtitle}
            </motion.p>

            <CinematicWordReveal
              lang={lang}
              text={t.subtitle}
              preset="section"
              delayOffset={0.08}
              className="font-editorial mt-6 max-w-3xl text-3xl tracking-tight text-white md:text-4xl"
            />

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={CINEMATIC_VIEWPORT}
              transition={{ duration: KICKER_DURATION * 0.9, ease: LOCOMOTIVE_EASE }}
              className="font-label mt-8 text-[11px] font-bold uppercase leading-relaxed tracking-[0.46em] text-zinc-300 md:mt-10"
            >
              {t.timelineHint}
            </motion.p>
          </div>

          {/* Desktop: horizontal pellicule only — no vertical stems (avoids “column” at page edge) */}
          <div className="mt-10 hidden md:block">
            <div
              className="relative mx-auto max-w-7xl md:max-w-[92rem]"
              aria-label="Process timeline: three chapters"
            >
              <div
                className="pointer-events-none absolute left-[6%] right-[6%] top-[13px] z-0 h-px bg-gradient-to-r from-transparent via-white/[0.2] to-transparent"
                aria-hidden
              />
              <div className="relative z-10 grid grid-cols-3 gap-5">
                {t.steps.map((_, index) => (
                  <div key={`rail-${stepKeys[index]}`} className="flex flex-col items-center pb-2">
                    <motion.div
                      animate={{
                        scale: emphasizedIndex === index ? 1.22 : 1,
                        borderColor:
                          emphasizedIndex === index
                            ? "rgba(0, 232, 240, 0.55)"
                            : "rgba(255,255,255,0.22)",
                        boxShadow:
                          emphasizedIndex === index
                            ? "0 0 28px rgba(0, 232, 240, 0.38)"
                            : "0 0 0 rgba(0,0,0,0)",
                      }}
                      transition={SPOTLIGHT_TRANSITION}
                      className="relative z-10 h-3 w-3 rounded-full border bg-black"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 md:mt-10 py-2 md:py-6">
            <div className="relative grid grid-cols-1 gap-6 overflow-visible md:grid-cols-3 md:gap-6">
              {t.steps.map((step, index) => (
                <motion.article
                  key={stepKeys[index]}
                  ref={setStepRef(index)}
                  data-process-step={index}
                  initial={{ opacity: 0, y: 36, filter: "blur(12px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={CINEMATIC_VIEWPORT}
                  transition={{
                    delay: index * 0.14,
                    opacity: { duration: 1.05, ease: LOCOMOTIVE_EASE },
                    filter: { duration: 1.05, ease: LOCOMOTIVE_EASE },
                    y: { duration: 1.05, ease: LOCOMOTIVE_EASE },
                    scale: { duration: SPOTLIGHT_TRANSITION.duration, ease: SPOTLIGHT_TRANSITION.ease },
                    borderColor: { duration: SPOTLIGHT_TRANSITION.duration, ease: SPOTLIGHT_TRANSITION.ease },
                    backgroundColor: { duration: SPOTLIGHT_TRANSITION.duration, ease: SPOTLIGHT_TRANSITION.ease },
                    boxShadow: { duration: SPOTLIGHT_TRANSITION.duration, ease: SPOTLIGHT_TRANSITION.ease },
                  }}
                  animate={{
                    scale: emphasizedIndex === index ? 1.045 : 1,
                    borderColor:
                      emphasizedIndex === index
                        ? "rgba(0, 232, 240, 0.52)"
                        : "rgba(255, 255, 255, 0.1)",
                    backgroundColor:
                      emphasizedIndex === index ? "rgba(255, 255, 255, 0.055)" : "rgba(255, 255, 255, 0.02)",
                    boxShadow:
                      emphasizedIndex === index
                        ? "0 0 56px -10px rgba(0, 232, 240, 0.35), 0 16px 48px -24px rgba(0, 0, 0, 0.65)"
                        : "0 0 0 rgba(0,0,0,0)",
                  }}
                  style={{ transformOrigin: "center center" }}
                  className={`relative rounded-sm border bg-white/[0.02] p-7 will-change-transform ${emphasizedIndex === index ? "z-10" : "z-0"}`}
                >
                  <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={CINEMATIC_VIEWPORT}
                    transition={{
                      duration: 0.65,
                      ease: LOCOMOTIVE_EASE,
                      delay: 0.08 + index * 0.06,
                    }}
                    className="font-label text-[11px] font-bold uppercase tracking-[0.46em] text-zinc-300"
                  >
                    {`${String(index + 1).padStart(2, "0")} ${stepLabels[step.labelKey as keyof typeof stepLabels]}`}
                  </motion.p>
                  <CinematicWordReveal
                    lang={lang}
                    text={step.title}
                    preset="card"
                    className="font-editorial mt-5 text-2xl tracking-tight text-white"
                  />
                  <CinematicWordReveal
                    lang={lang}
                    text={step.body}
                    preset="card"
                    className="font-label mt-4 text-sm leading-relaxed text-zinc-400"
                  />
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
