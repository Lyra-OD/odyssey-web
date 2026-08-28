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
import { CinematicWordReveal } from "./CinematicWordReveal";
import { OdysseyBrandLockup } from "./OdysseyBrandLockup";

const KICKER_DURATION = 0.85;

export function Partnerships({
  lang,
  dictionary,
  logoFallback,
}: {
  lang: Locale;
  dictionary: AppDictionary["partnerships"];
  logoFallback: AppDictionary["header"]["logoFallback"];
}) {
  const t = dictionary;

  return (
    <section id="partners" className={`px-6 py-24 md:px-12 md:py-32 ${editorialSectionShell}`}>
      <div className={`${editorialColumn} md:max-w-[76rem] lg:max-w-[92rem] ${editorialAccentRule}`}>
        <div key={lang}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={CINEMATIC_VIEWPORT}
            transition={{ duration: 0.65, ease: LOCOMOTIVE_EASE }}
            className="mb-10 md:mb-12"
          >
            <OdysseyBrandLockup wordmark={logoFallback} size="section" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={CINEMATIC_VIEWPORT}
            transition={{ duration: KICKER_DURATION, ease: LOCOMOTIVE_EASE }}
            className="font-label text-[16px] font-bold uppercase tracking-[0.46em] text-zinc-300"
          >
            {t.kicker}
          </motion.p>
          <CinematicWordReveal
            lang={lang}
            text={t.title}
            preset="section"
            className="font-editorial mt-6 text-3xl tracking-tight text-white antialiased md:text-4xl lg:text-[2.75rem]"
          />
          <CinematicWordReveal
            lang={lang}
            text={t.body}
            preset="card"
            className="font-label mt-6 text-sm leading-[1.75] text-zinc-400 md:text-base"
          />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={CINEMATIC_VIEWPORT}
            transition={{ duration: 0.75, ease: LOCOMOTIVE_EASE, delay: 0.12 }}
            className="mt-12"
          >
            <Link
              href="/partners"
              className="font-label inline-flex border border-white/15 bg-transparent px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.42em] text-white transition-colors duration-300 hover:border-[var(--salon-cyan)]/45 hover:text-[var(--salon-cyan)] touch-manipulation"
            >
              {t.cta}
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
