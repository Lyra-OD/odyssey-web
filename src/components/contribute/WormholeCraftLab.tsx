"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  WORMHOLE_CRAFT_DEFAULTS,
  type WormholeCraftKnobs,
} from "@/src/components/contribute/constellation/WormholeCraftShader";

type Locale = "fr" | "en";

const SanctuaryUniverse = dynamic(
  () =>
    import("@/src/components/contribute/SanctuaryUniverse").then(
      (m) => m.SanctuaryUniverse,
    ),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-black" />,
  },
);

/**
 * Lab craft wormhole — construction etape par etape.
 * Etape 1 : ciel Sanctuaire seul (craftLite, zoom loin, pas de core).
 */
export function WormholeCraftLab({ locale = "fr" }: { locale?: Locale }) {
  const [knobs, setKnobs] = useState<WormholeCraftKnobs>({
    ...WORMHOLE_CRAFT_DEFAULTS,
  });
  const [demo, setDemo] = useState(false);
  const demoRef = useRef(false);
  const startRef = useRef(0);

  const set = <K extends keyof WormholeCraftKnobs>(key: K, v: number) => {
    setKnobs((prev) => ({ ...prev, [key]: v }));
  };

  useEffect(() => {
    demoRef.current = demo;
    if (!demo) return;
    startRef.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      if (!demoRef.current) return;
      const u = Math.min(1, (now - startRef.current) / 4800);
      const ease = u * u * (3 - 2 * u);
      const velocity = 1.4 * (1 - ease);
      const alpha = 0.92 * (1 - Math.pow(ease, 1.25));
      setKnobs((prev) => ({
        ...prev,
        velocity,
        alpha,
      }));
      if (u >= 1) {
        setDemo(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [demo]);

  const copy =
    locale === "en"
      ? {
          title: "Wormhole · craft",
          sub: "Step 1 — Sanctuary sky only (zoomed out, lite). No core yet.",
          reset: "Reset",
          demo: "Decel → sky",
          demoRun: "…",
          play: "← Eclipse play",
          eclipse: "Eclipse lab",
          hint: "Step 1 — sky foundation.",
          velocity: "Velocity",
          density: "Density",
          alpha: "Alpha",
          core: "Core soft",
        }
      : {
          title: "Wormhole · craft",
          sub: "Étape 1 — ciel Sanctuaire seul (reculé, lite). Pas de core.",
          reset: "Reset",
          demo: "Décel → ciel",
          demoRun: "…",
          play: "← Lecture éclipse",
          eclipse: "Lab éclipse",
          hint: "Étape 1 — fondation ciel.",
          velocity: "Vélocité",
          density: "Densité",
          alpha: "Alpha",
          core: "Core soft",
        };

  const sliders: {
    key: keyof WormholeCraftKnobs;
    label: string;
    min: number;
    max: number;
    step: number;
  }[] = [
    { key: "velocity", label: copy.velocity, min: 0, max: 2, step: 0.01 },
    { key: "density", label: copy.density, min: 0.4, max: 2, step: 0.01 },
    { key: "alpha", label: copy.alpha, min: 0, max: 1, step: 0.01 },
    { key: "coreSoft", label: copy.core, min: 0.03, max: 0.16, step: 0.005 },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100 antialiased">
      <div className="pointer-events-none fixed inset-0 z-0">
        <SanctuaryUniverse
          mode="background"
          locale={locale}
          craftLite
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-1 px-5 pt-6 md:px-10 md:pt-10">
        <p className="text-xs font-light uppercase tracking-[0.28em] text-white/45 md:text-sm">
          {copy.title}
        </p>
        <p className="max-w-xl text-sm font-light text-white/50 md:text-base">
          {copy.sub}
        </p>
      </div>

      <div className="pointer-events-auto absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/55 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/contribute/test-eclipse-play`}
              className="rounded-sm border border-white/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/70 hover:border-white/40"
            >
              {copy.play}
            </Link>
            <Link
              href={`/${locale}/contribute/test-eclipse`}
              className="rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55 hover:border-white/30"
            >
              {copy.eclipse}
            </Link>
            <button
              type="button"
              onClick={() => setKnobs({ ...WORMHOLE_CRAFT_DEFAULTS })}
              className="rounded-sm border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/55 hover:border-white/30"
            >
              {copy.reset}
            </button>
            <button
              type="button"
              disabled={demo}
              onClick={() => {
                setKnobs((prev) => ({
                  ...prev,
                  velocity: 1.4,
                  alpha: 0.92,
                }));
                setDemo(true);
              }}
              className="rounded-sm border border-white/25 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-white/80 hover:border-white/45 disabled:opacity-40"
            >
              {demo ? copy.demoRun : copy.demo}
            </button>
            <p className="ml-auto hidden text-[11px] font-light tracking-wide text-white/30 sm:block">
              {copy.hint}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {sliders.map((s) => (
              <label key={s.key} className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                  {s.label}
                  <span className="ml-1 font-mono text-white/25">
                    {knobs[s.key].toFixed(s.step < 0.01 ? 3 : 2)}
                  </span>
                </span>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={knobs[s.key]}
                  onChange={(e) => set(s.key, Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
