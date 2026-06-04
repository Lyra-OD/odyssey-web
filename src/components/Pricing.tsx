"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import type { AppDictionary } from "../../lib/dictionaries";
import type { Locale } from "../../i18n.config";
import {
  editorialAccentRule,
  editorialColumn,
  editorialSectionShell,
} from "../lib/editorialSkin";
import { LOCOMOTIVE_EASE, CINEMATIC_VIEWPORT } from "../lib/cinematicMotion";
import {
  getTierCardMotionState,
  TIER_CARD_SELECT_TRANSITION,
  tierCardCtaClass,
  tierCardFeatureClass,
  tierCardPriceClass,
  tierCardStyleClass,
  tierCardSurfaceClass,
  tierCardTitleClass,
  UV_RADIAL,
} from "../lib/pricingTierCardSkin";
import { playProcessStepHoverChime } from "../lib/processHoverChime";
import { CinematicWordReveal } from "./CinematicWordReveal";

const KICKER_DURATION = 0.85;

export function Pricing({
  lang,
  dictionary,
}: {
  lang: Locale;
  dictionary: AppDictionary["pricing"];
}) {
  const t = dictionary;
  const prefersReducedMotion = useReducedMotion();
  const [selectedTierKey, setSelectedTierKey] = useState<string | null>(null);

  useEffect(() => {
    setSelectedTierKey(null);
  }, [lang]);

  const hasSelection = selectedTierKey !== null;

  const selectTier = useCallback((key: string) => {
    setSelectedTierKey(key);
    playProcessStepHoverChime();
  }, []);

  return (
    <section id="pricing" className={`px-5 py-24 md:px-12 md:py-32 ${editorialSectionShell}`}>
      <div className="mx-auto w-full max-w-[1400px] md:max-w-[92rem]">
        <div key={lang}>
          <div className={`mb-14 md:mb-18 ${editorialColumn} md:max-w-[76rem] lg:max-w-[92rem] ${editorialAccentRule}`}>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={CINEMATIC_VIEWPORT}
              transition={{ duration: KICKER_DURATION, ease: LOCOMOTIVE_EASE }}
              className="font-label text-[10px] font-bold uppercase tracking-[0.5em] text-zinc-500"
            >
              {t.sectionSubtitle}
            </motion.p>
            <CinematicWordReveal
              lang={lang}
              text={t.subtitle}
              preset="section"
              className="font-editorial mt-5 text-3xl tracking-tight text-white md:text-4xl"
            />
          </div>

          <div className="relative py-3 md:py-6">
            <div className="grid grid-cols-1 gap-6 overflow-visible md:grid-cols-3 md:gap-8">
              {t.tiers.map((tier, index) => {
                const isPopular = "popular" in tier && Boolean(tier.popular);
                const isSelected = selectedTierKey === tier.key;
                /** Middle column default state (no user pick yet) — same UV language as “recommended” */
                const isDefaultPopularGlow = isPopular && !hasSelection;
                const { isUltraviolet, showRadialBlur, animate } =
                  getTierCardMotionState(
                    isSelected,
                    isDefaultPopularGlow,
                    prefersReducedMotion,
                  );

                return (
                  <motion.article
                    key={tier.key}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={`${t.tierTitles[tier.key as keyof typeof t.tierTitles]} — ${tier.price}`}
                    initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
                    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    viewport={CINEMATIC_VIEWPORT}
                    transition={{
                      delay: index * 0.13,
                      opacity: { duration: 1.08, ease: LOCOMOTIVE_EASE },
                      filter: { duration: 1.08, ease: LOCOMOTIVE_EASE },
                      y: { duration: 1.08, ease: LOCOMOTIVE_EASE },
                      scale: TIER_CARD_SELECT_TRANSITION,
                      borderColor: TIER_CARD_SELECT_TRANSITION,
                      backgroundColor: TIER_CARD_SELECT_TRANSITION,
                      boxShadow: TIER_CARD_SELECT_TRANSITION,
                    }}
                    animate={animate}
                    style={{ transformOrigin: "center center" }}
                    className={tierCardSurfaceClass(isUltraviolet, isSelected)}
                    onClick={() => selectTier(tier.key)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectTier(tier.key);
                      }
                    }}
                  >
                    {showRadialBlur && (
                      <div
                        aria-hidden
                        className={[
                          "pointer-events-none absolute -inset-24 blur-3xl",
                          isSelected ? "opacity-95" : "opacity-80",
                        ].join(" ")}
                        style={{ background: UV_RADIAL }}
                      />
                    )}

                    {isPopular && (
                      <motion.div
                        initial={{ opacity: 0, x: 12 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={CINEMATIC_VIEWPORT}
                        transition={{
                          duration: 0.7,
                          ease: LOCOMOTIVE_EASE,
                          delay: 0.15 + index * 0.05,
                        }}
                        className="absolute right-5 top-5 border border-purple-500/40 bg-black/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.32em] text-white"
                      >
                        {t.recommended}
                      </motion.div>
                    )}

                    <header className="relative">
                      <CinematicWordReveal
                        lang={lang}
                        text={t.tierTitles[tier.key as keyof typeof t.tierTitles]}
                        preset="card"
                        className={tierCardTitleClass(isSelected)}
                      />
                      <div className="mt-5 flex items-baseline gap-3">
                        <motion.div
                          initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          viewport={CINEMATIC_VIEWPORT}
                          transition={{
                            duration: 0.95,
                            ease: LOCOMOTIVE_EASE,
                            delay: 0.12 + index * 0.05,
                          }}
                          className={tierCardPriceClass(isSelected)}
                        >
                          {tier.price}
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={CINEMATIC_VIEWPORT}
                          transition={{
                            duration: 0.6,
                            ease: LOCOMOTIVE_EASE,
                            delay: 0.28 + index * 0.05,
                          }}
                          className={tierCardStyleClass(isSelected)}
                        >
                          {tier.style}
                        </motion.div>
                      </div>
                    </header>

                    <ul className="relative mt-8 space-y-3">
                      {tier.features.map((feature, featureIndex) => (
                        <motion.li
                          key={feature}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={CINEMATIC_VIEWPORT}
                          transition={{
                            duration: 0.55,
                            ease: LOCOMOTIVE_EASE,
                            delay: 0.22 + index * 0.06 + featureIndex * 0.07,
                          }}
                          className={tierCardFeatureClass(isSelected)}
                        >
                          {feature}
                        </motion.li>
                      ))}
                    </ul>

                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={CINEMATIC_VIEWPORT}
                      transition={{
                        duration: 0.75,
                        ease: LOCOMOTIVE_EASE,
                        delay: 0.45 + index * 0.08,
                      }}
                      className="relative mt-10"
                    >
                      <span className={tierCardCtaClass(isSelected)}>
                        {t.cta}
                      </span>
                    </motion.div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
