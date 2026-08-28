"use client";

import { motion } from "framer-motion";
import { OdysseyLuminousText } from "@/src/components/marketing/OdysseyLuminousText";
import { sanctuarySubmitButton } from "@/src/lib/contribute/sanctuaryChrome";
import { CINEMATIC_VIEWPORT, LOCOMOTIVE_EASE } from "@/src/lib/cinematicMotion";
import { editorialColumn } from "@/src/lib/editorialSkin";

export type PartnersGrowthItem = {
  title: string;
  body: string;
};

export type PartnersPageIntroCopy = {
  title: string;
  kicker: string;
  introProblem: string;
  introResolution: string;
  promiseTitle: string;
  promiseBody: string;
  growthEngineTitle: string;
  growthEngineItems: PartnersGrowthItem[];
  demoTitle: string;
  demoIntro: string;
};

const GROWTH_GRAIN_CSS = `
  .partners-growth-grain::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: url("https://grainy-gradients.vercel.app/noise.svg");
    background-size: 200px;
    opacity: 0.07;
    pointer-events: none;
    animation: partners-growth-grain 8s steps(6) infinite;
  }
  @keyframes partners-growth-grain {
    0%, 100% { transform: translate(0, 0); }
    33% { transform: translate(-1%, 1.5%); }
    66% { transform: translate(1.5%, -1%); }
  }
`;

const centeredProseClass = "mx-auto max-w-2xl text-center md:max-w-3xl";
const growthColumnClass = `${editorialColumn} mx-auto w-full md:max-w-[76rem] lg:max-w-[92rem]`;

export function PartnersPageIntro({
  copy,
  onDemoRequest,
}: {
  copy: PartnersPageIntroCopy;
  onDemoRequest: () => void;
}) {
  return (
    <>
      {/* Acte I — Cadre */}
      <div className={`${centeredProseClass} text-center`}>
        <header>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={CINEMATIC_VIEWPORT}
            transition={{ duration: 0.85, ease: LOCOMOTIVE_EASE }}
            className="font-label text-[11px] font-bold uppercase tracking-[0.52em] text-[var(--salon-cyan)]"
          >
            {copy.kicker}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={CINEMATIC_VIEWPORT}
            transition={{ duration: 1, ease: LOCOMOTIVE_EASE, delay: 0.05 }}
            className="font-editorial mt-5 text-4xl tracking-tight md:text-5xl lg:text-6xl"
          >
            <OdysseyLuminousText variant="soft">{copy.title}</OdysseyLuminousText>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={CINEMATIC_VIEWPORT}
            transition={{ duration: 0.95, ease: LOCOMOTIVE_EASE, delay: 0.1 }}
            className="mt-8 space-y-5"
          >
            <p className="font-label text-sm leading-relaxed text-zinc-400 md:text-base md:leading-relaxed">
              {copy.introProblem}
            </p>
            <p className="font-label text-sm leading-relaxed text-zinc-300 md:text-base md:leading-relaxed">
              {copy.introResolution}
            </p>
          </motion.div>
        </header>

        {/* Acte II — La Promesse */}
        <motion.aside
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={CINEMATIC_VIEWPORT}
          transition={{ duration: 1, ease: LOCOMOTIVE_EASE, delay: 0.05 }}
          className="mt-14 md:mt-16"
        >
          <div
            aria-hidden
            className="mx-auto mb-8 h-px w-16 bg-[var(--salon-cyan)]/30"
          />
          <h2 className="font-editorial text-2xl tracking-tight text-white md:text-3xl lg:text-4xl">
            {copy.promiseTitle}
          </h2>
          <p className="font-label mt-5 text-sm leading-relaxed text-zinc-400 md:text-base md:leading-relaxed">
            {copy.promiseBody}
          </p>
        </motion.aside>
      </div>

      {/* Acte III — Moteur de croissance (liste gauche ; titre centré) */}
      <section
        className="partners-growth-grain group/partners-growth relative isolate -mx-6 mt-16 overflow-hidden border-t border-white/[0.06] md:-mx-12 md:mt-24"
        aria-labelledby="partners-growth-engine"
      >
        <style dangerouslySetInnerHTML={{ __html: GROWTH_GRAIN_CSS }} />

        <video
          src="/eclipse.mp4"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover mix-blend-screen opacity-[0.11] transition-opacity duration-1000 group-hover/partners-growth:opacity-[0.16]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#030303] via-[#030303]/88 to-[#030303]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(0,232,240,0.09),transparent_55%)]"
        />

        <div className={`relative px-6 py-16 md:px-12 md:py-24 ${growthColumnClass}`}>
          <motion.h2
            id="partners-growth-engine"
            initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={CINEMATIC_VIEWPORT}
            transition={{ duration: 1, ease: LOCOMOTIVE_EASE }}
            className="font-editorial mx-auto max-w-3xl text-center text-3xl tracking-tight text-white antialiased md:text-5xl md:leading-[1.08]"
          >
            {copy.growthEngineTitle}
          </motion.h2>

          <div className="mt-14 text-left md:mt-20">
            {copy.growthEngineItems.map((item, index) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={CINEMATIC_VIEWPORT}
                transition={{
                  duration: 1.05,
                  ease: LOCOMOTIVE_EASE,
                  delay: index * 0.04,
                }}
                className={`grid grid-cols-1 gap-4 border-t border-white/[0.07] py-10 md:grid-cols-[minmax(5.5rem,7rem)_1fr] md:gap-10 md:py-14 lg:grid-cols-[minmax(6.5rem,8.5rem)_1fr] lg:gap-14 ${
                  index === 0 ? "border-t-0 pt-0" : ""
                }`}
              >
                <p
                  aria-hidden
                  className="font-editorial select-none text-[clamp(3.25rem,9vw,5.75rem)] leading-none tabular-nums tracking-tighter text-[var(--salon-cyan)] [text-shadow:0_0_28px_rgba(0,232,240,0.42),0_0_56px_rgba(0,232,240,0.12)]"
                >
                  {String(index + 1).padStart(2, "0")}
                </p>
                <div className="min-w-0 md:pt-1">
                  <h3 className="font-editorial text-2xl tracking-tight text-white md:text-[1.75rem] md:leading-tight lg:text-[1.875rem]">
                    {item.title}
                  </h3>
                  <p className="font-label mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 md:mt-5 md:text-[15px] md:leading-[1.7]">
                    {item.body}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Acte IV — CTA démo → formulaire */}
      <div className={`${centeredProseClass} mt-16 md:mt-24`}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={CINEMATIC_VIEWPORT}
          transition={{ duration: 0.95, ease: LOCOMOTIVE_EASE }}
        >
          <p className="font-label text-sm leading-relaxed text-zinc-400 md:text-base md:leading-relaxed">
            {copy.demoIntro}
          </p>
          <button
            type="button"
            onClick={onDemoRequest}
            className={`${sanctuarySubmitButton} mx-auto mt-8 inline-flex min-h-[52px] w-auto rounded-2xl bg-white/[0.06] px-8 py-4 text-[11px] hover:bg-white/[0.09] touch-manipulation`}
          >
            {copy.demoTitle}
          </button>
        </motion.div>
      </div>
    </>
  );
}
