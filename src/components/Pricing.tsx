"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { AppDictionary } from "../../lib/dictionaries";
import type { Locale } from "../../i18n.config";
import {
  editorialAccentRule,
  editorialColumn,
  editorialSectionShell,
} from "../lib/editorialSkin";
import { LOCOMOTIVE_EASE, CINEMATIC_VIEWPORT } from "../lib/cinematicMotion";
import {
  tierCardFeatureClass,
  tierCardPriceClass,
  tierCardStyleClass,
  tierCardSurfaceClass,
  tierCardTitleClass,
  UV_RADIAL,
} from "../lib/pricingTierCardSkin";
import { appRoutes } from "@/src/lib/appRoutes";
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

  return (
    <section id="pricing" className={`px-5 py-24 md:px-12 md:py-36 ${editorialSectionShell}`}>
      <div className="mx-auto w-full max-w-[1400px] md:max-w-[92rem]">
        <div key={lang}>
          <div className={`mb-16 md:mb-24 ${editorialColumn} md:max-w-[76rem] lg:max-w-[92rem] ${editorialAccentRule}`}>
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
              text={t.title}
              preset="section"
              className="font-editorial mt-5 max-w-2xl text-3xl tracking-tight text-white md:text-4xl"
            />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={CINEMATIC_VIEWPORT}
              transition={{ duration: 0.9, ease: LOCOMOTIVE_EASE, delay: 0.08 }}
              className="font-label mt-7 max-w-2xl text-sm leading-[1.9] text-zinc-400 md:text-base"
            >
              {t.subtitle}
            </motion.p>
          </div>

          <div className="relative py-6 md:py-10">
            <div
              aria-hidden
              className="pointer-events-none absolute left-[5%] right-[5%] top-0 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:block"
            />
            <div className="grid grid-cols-1 gap-6 overflow-visible md:grid-cols-[0.94fr_minmax(24rem,1.12fr)_0.94fr] md:items-start md:gap-8">
              {t.tiers.map((tier, index) => {
                const isPopular = "popular" in tier && Boolean(tier.popular);
                const isFeatured = isPopular;
                const chapterNumber = String(index + 1).padStart(2, "0");
                const articleOffsetClass =
                  index === 0
                    ? "md:translate-y-10"
                    : index === 2
                      ? "md:translate-y-16"
                      : "";

                return (
                  <motion.article
                    key={tier.key}
                    aria-label={`${t.tierTitles[tier.key as keyof typeof t.tierTitles]} · ${tier.price}`}
                    initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
                    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    viewport={CINEMATIC_VIEWPORT}
                    transition={{
                      delay: index * 0.13,
                      opacity: { duration: 1.08, ease: LOCOMOTIVE_EASE },
                      filter: { duration: 1.08, ease: LOCOMOTIVE_EASE },
                      y: { duration: 1.08, ease: LOCOMOTIVE_EASE },
                    }}
                    className={`${tierCardSurfaceClass(isFeatured, isFeatured)} ${articleOffsetClass} min-h-[31rem] px-7 py-9 md:px-9 md:py-10`}
                  >
                    {isFeatured && (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -inset-24 opacity-60 blur-3xl"
                        style={{ background: UV_RADIAL }}
                      />
                    )}

                    <header className="relative border-b border-white/10 pb-8">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={CINEMATIC_VIEWPORT}
                        transition={{
                          duration: 0.65,
                          ease: LOCOMOTIVE_EASE,
                          delay: 0.08 + index * 0.04,
                        }}
                        className="mb-8 flex items-center justify-between gap-4"
                      >
                        <span className="font-label text-[10px] uppercase tracking-[0.38em] text-zinc-500">
                          {chapterNumber}
                        </span>
                        {isPopular ? (
                          <span className="font-label text-[10px] uppercase tracking-[0.38em] text-violet-100/80">
                            {t.recommended}
                          </span>
                        ) : (
                          <span className="h-px flex-1 bg-white/10" aria-hidden />
                        )}
                      </motion.div>
                      <CinematicWordReveal
                        lang={lang}
                        text={t.tierTitles[tier.key as keyof typeof t.tierTitles]}
                        preset="card"
                        className={tierCardTitleClass(isFeatured)}
                      />
                      <div className="mt-7">
                        <motion.div
                          initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          viewport={CINEMATIC_VIEWPORT}
                          transition={{
                            duration: 0.95,
                            ease: LOCOMOTIVE_EASE,
                            delay: 0.12 + index * 0.05,
                          }}
                          className={tierCardPriceClass(isFeatured)}
                        >
                          {tier.price}
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={CINEMATIC_VIEWPORT}
                          transition={{
                            duration: 0.75,
                            ease: LOCOMOTIVE_EASE,
                            delay: 0.28 + index * 0.05,
                          }}
                          className={`${tierCardStyleClass(isFeatured)} mt-5 max-w-[15rem]`}
                        >
                          {tier.style}
                        </motion.div>
                      </div>
                    </header>

                    <ul className="relative mt-10 space-y-5">
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
                          className={`${tierCardFeatureClass(isFeatured)} border-t border-white/8 pt-5`}
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
                      className="relative mt-14 border-t border-white/10 pt-6"
                    >
                      <Link
                        href={appRoutes.studioInscription(lang)}
                        className="flex w-full items-center justify-center px-2 py-2 font-label text-[10px] uppercase tracking-[0.42em] text-zinc-300 transition-colors duration-300 hover:text-white"
                      >
                        {t.cta}
                      </Link>
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
