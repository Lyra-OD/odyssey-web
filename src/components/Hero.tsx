"use client";

import { motion, AnimatePresence, useInView } from "framer-motion";
import Link from "next/link";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { AppDictionary } from "../../lib/dictionaries";
import type { Locale } from "../../i18n.config";

type HeroPitchDeck = {
  hooks: string[];
  steps: string[];
  memory: string[];
  signatures: string[];
};

// CONFIGURATION DES VIDÉOS — fichiers dans `public/`
const VIDEOS = ["/hero.mp4"];

const FILM_GRAIN_STYLES = `
  .grain-engine::before {
    content: ""; position: absolute; inset: -100%;
    background-image: url("https://grainy-gradients.vercel.app/noise.svg");
    background-size: 180px; opacity: 0.12; pointer-events: none;
    animation: grain-dance 4s steps(5) infinite;
  }
  @keyframes grain-dance {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(-1%, 2%); }
    50% { transform: translate(2%, -1%); }
  }
  .vibrant-halo {
    color: white;
    text-shadow: 0 0 15px rgba(124, 58, 237, 0.8), 0 0 30px rgba(139, 92, 246, 0.5);
  }
  .neon-vivid:hover {
    color: #ffffff !important;
    text-shadow: 0 0 10px #fff, 0 0 20px #8b5cf6, 0 0 40px #7c3aed;
    transform: scale(1.06); letter-spacing: 0.6em;
  }
  .hero-kenburns {
    animation: hero-kenburns 14s ease-in-out infinite alternate;
    transform-origin: center center;
  }
  @keyframes hero-kenburns {
    from { transform: scale(1); }
    to { transform: scale(1.04); }
  }
`;

const LOCOMOTIVE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const VIDEO_CROSSFADE_MS = 2500;

function pickRandomLine(pool: readonly string[]): string {
  if (pool.length === 0) return "";
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}

export function Hero({
  lang,
  dictionary,
  headerNav,
}: {
  lang: Locale;
  dictionary: AppDictionary["hero"];
  headerNav: AppDictionary["header"]["nav"];
}) {
  const heroRef = useRef<HTMLElement>(null);
  // "some" + threshold 0: reliable when hero fills the viewport (numeric amount could miss the first paint).
  const heroInView = useInView(heroRef, { amount: "some", once: false });

  const pitchStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevHeroInViewRef = useRef<boolean | undefined>(undefined);
  const userLeftHeroRef = useRef(false);

  const [pitchPhase, setPitchPhase] = useState(0);
  const [pitchLine, setPitchLine] = useState("");
  const [activeDeck, setActiveDeck] = useState<0 | 1>(0);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [nextVideoIndex, setNextVideoIndex] = useState(1 % VIDEOS.length);
  const [switchRequested, setSwitchRequested] = useState(false);
  const [nextReady, setNextReady] = useState(false);
  const [isMobileMode, setIsMobileMode] = useState(false);
  const [useStaticFallback, setUseStaticFallback] = useState(false);
  const [isNarrativeMode, setIsNarrativeMode] = useState(false);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const inactiveVideoRef = useRef<HTMLVideoElement | null>(null);
  const switchingRef = useRef(false);

  const pitchDeck = useMemo(() => dictionary.pitch as HeroPitchDeck, [dictionary.pitch]);

  const menuNav = useMemo(() => headerNav, [headerNav]);

  const brandFoot = useMemo(() => {
    const b = dictionary.branding;
    return `${b.line1} ${b.line2}`;
  }, [dictionary.branding]);

  useEffect(() => {
    setPitchPhase(0);
  }, [lang]);

  useEffect(() => {
    if (!isNarrativeMode) return;
    const pools: readonly (readonly string[])[] = [
      pitchDeck.hooks,
      pitchDeck.steps,
      pitchDeck.memory,
      pitchDeck.signatures,
    ];
    const pool = pools[pitchPhase % 4] ?? pitchDeck.hooks;
    setPitchLine(pickRandomLine(pool));
  }, [pitchPhase, isNarrativeMode, pitchDeck]);

  const clearPitchStartTimeout = useCallback(() => {
    if (pitchStartTimeoutRef.current !== null) {
      clearTimeout(pitchStartTimeoutRef.current);
      pitchStartTimeoutRef.current = null;
    }
  }, []);

  const schedulePitchStart = useCallback(() => {
    clearPitchStartTimeout();
    pitchStartTimeoutRef.current = setTimeout(() => setIsNarrativeMode(true), 3500);
  }, [clearPitchStartTimeout]);

  // Same as original: pitch delay follows mount / language change (do not gate on useInView — see scroll effect).
  useEffect(() => {
    schedulePitchStart();
    return clearPitchStartTimeout;
  }, [lang, schedulePitchStart, clearPitchStartTimeout]);

  useEffect(() => {
    if (!isNarrativeMode) return;
    const timer = setInterval(() => setPitchPhase((p) => (p + 1) % 4), 5000);
    return () => clearInterval(timer);
  }, [isNarrativeMode]);

  /**
   * useInView starts false until the observer runs; resetting narrative on that first `false`
   * cleared the 3.5s timeout and blocked pitch + branding transitions. Only treat `false` as
   * "user left the hero" after we have observed a transition from visible -> not visible.
   */
  useEffect(() => {
    const prev = prevHeroInViewRef.current;
    prevHeroInViewRef.current = heroInView;

    if (prev === undefined) {
      return;
    }

    if (prev && !heroInView) {
      userLeftHeroRef.current = true;
      clearPitchStartTimeout();
      setIsNarrativeMode(false);
      setPitchPhase(0);
      setPitchLine("");
      return;
    }

    if (!prev && heroInView && userLeftHeroRef.current) {
      userLeftHeroRef.current = false;
      schedulePitchStart();
    }
  }, [heroInView]);

  useEffect(() => {
    // 2. On change de vidéo toutes le 12s (Seulement s'il y en a plus d'une)
    if (VIDEOS.length <= 1) return;
    const videoTimer = setInterval(() => {
      setSwitchRequested(true);
      setNextReady(false);
      setNextVideoIndex((prev) => {
        if (prev === activeVideoIndex) {
          return (activeVideoIndex + 1) % VIDEOS.length;
        }
        return prev;
      });
    }, 12000);
    return () => clearInterval(videoTimer);
  }, [activeVideoIndex]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        saveData?: boolean;
      };
      deviceMemory?: number;
      hardwareConcurrency?: number;
    };

    const isSmallScreen = window.matchMedia("(max-width: 768px)").matches;
    const connectionType = nav.connection?.effectiveType ?? "";
    const isSlowNetwork = ["slow-2g", "2g"].includes(connectionType);
    const saveData = nav.connection?.saveData === true;
    const lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2;
    const lowCpu = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 2;

    setIsMobileMode(isSmallScreen);
    setUseStaticFallback(saveData || isSlowNetwork || lowMemory || lowCpu);
  }, []);

  useEffect(() => {
    if (!switchRequested || !nextReady) return;
    if (switchingRef.current) return;
    switchingRef.current = true;
    const oldActive = activeVideoRef.current;
    const newActive = inactiveVideoRef.current;
    if (!newActive) {
      switchingRef.current = false;
      return;
    }

    const runSwitch = async () => {
      try {
        newActive.currentTime = 0;
        await newActive.play();
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => resolve()),
          ),
        );

        setActiveDeck((prev) => (prev === 0 ? 1 : 0));
        setActiveVideoIndex(nextVideoIndex);
        setNextVideoIndex((nextVideoIndex + 1) % VIDEOS.length);
        setSwitchRequested(false);
        setNextReady(false);

        window.setTimeout(() => {
          if (oldActive) {
            oldActive.pause();
            oldActive.removeAttribute("src");
            oldActive.load();
          }
          switchingRef.current = false;
        }, VIDEO_CROSSFADE_MS);
      } catch {
        switchingRef.current = false;
      }
    };

    void runSwitch();
  }, [switchRequested, nextReady, nextVideoIndex]);

  useEffect(() => {
    if (!switchRequested || useStaticFallback) return;
    const candidate = inactiveVideoRef.current;
    if (candidate && candidate.readyState >= 3) {
      setNextReady(true);
    }
  }, [switchRequested, nextVideoIndex, activeDeck, useStaticFallback]);

  useEffect(() => {
    const ref = activeDeck === 0 ? activeVideoRef : inactiveVideoRef;
    const current = ref.current;
    if (!current || useStaticFallback) return;
    void current.play().catch(() => {
      // Ignore autoplay restrictions.
    });
  }, [activeDeck, activeVideoIndex, useStaticFallback]);

  const registerInactiveCanPlay = useCallback(() => {
    const candidate = inactiveVideoRef.current;
    if (!candidate) return;
    if (candidate.readyState >= 3) {
      setNextReady(true);
    }
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative w-full h-screen bg-[#020202] overflow-hidden select-none"
      style={{ isolation: "isolate" }}
    >
      
      <style dangerouslySetInnerHTML={{ __html: FILM_GRAIN_STYLES }} />

      {/* LAYER 0 : VIDEO ENGINE (Sécurisé) */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[#020202]">
        {useStaticFallback ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2.5, ease: LOCOMOTIVE_EASE }}
            className="absolute inset-0 will-change-opacity"
          >
            <video
              src={VIDEOS[0]}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-hidden
              className="hero-kenburns h-full w-full object-cover grayscale-[0.05] contrast-[1.1]"
            />
          </motion.div>
        ) : isMobileMode ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2.5, ease: LOCOMOTIVE_EASE }}
            className="absolute inset-0 will-change-opacity"
            style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
          >
            <video
              src={VIDEOS[0]}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover grayscale-[0.05] contrast-[1.1]"
            />
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={false}
              animate={{ opacity: activeDeck === 0 ? 1 : 0 }}
              transition={{ duration: 2.5, ease: LOCOMOTIVE_EASE }}
              className="absolute inset-0 will-change-opacity"
              style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
            >
              <video
                ref={activeDeck === 0 ? activeVideoRef : inactiveVideoRef}
                src={VIDEOS[activeDeck === 0 ? activeVideoIndex : nextVideoIndex]}
                autoPlay
                loop
                muted
                playsInline
                preload={activeDeck === 0 ? "auto" : "metadata"}
                className="w-full h-full object-cover grayscale-[0.05] contrast-[1.1]"
                onCanPlay={activeDeck === 0 ? undefined : registerInactiveCanPlay}
              />
            </motion.div>
            <motion.div
              initial={false}
              animate={{ opacity: activeDeck === 1 ? 1 : 0 }}
              transition={{ duration: 2.5, ease: LOCOMOTIVE_EASE }}
              className="absolute inset-0 will-change-opacity"
              style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}
            >
              <video
                ref={activeDeck === 1 ? activeVideoRef : inactiveVideoRef}
                src={VIDEOS[activeDeck === 1 ? activeVideoIndex : nextVideoIndex]}
                autoPlay
                loop
                muted
                playsInline
                preload={activeDeck === 1 ? "auto" : "metadata"}
                className="w-full h-full object-cover grayscale-[0.05] contrast-[1.1]"
                onCanPlay={activeDeck === 1 ? undefined : registerInactiveCanPlay}
              />
            </motion.div>
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 z-[1]" />
      </div>

      {/* LAYER 2 : BRANDING (Position Initiale 14vh -> 20% Opacité) */}
      <motion.div 
        initial={{ opacity: 0, y: 40, filter: "blur(20px)" }}
        animate={{ 
          opacity: isNarrativeMode ? 0.4 : 0.2, 
          y: 0,
          filter: "blur(0px)",
          top: isNarrativeMode ? "85px" : "14vh", 
          left: "40px",
          scale: isNarrativeMode ? 0.12 : 1,
        }}
        transition={{ duration: 2.5, ease: LOCOMOTIVE_EASE }}
        className="absolute z-20 pointer-events-none px-8 md:px-20 origin-top-left will-change-transform"
      >
        <h1 className="text-[16vw] md:text-[12.5vw] leading-[0.8] tracking-[-0.05em] text-white font-bold uppercase whitespace-nowrap">
          Odyssey <br /> Films
        </h1>
      </motion.div>

      {/* LAYER 3 : PITCH (Remonté, 50% Opacité, Halo serré) */}
      <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center px-12 text-center">
        <AnimatePresence mode="wait">
          {isNarrativeMode && (
            <motion.div
              key={`${lang}-${pitchPhase}-${pitchLine}`}
              initial={{ opacity: 0, filter: "blur(20px)", y: 25 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: -60 }}
              exit={{ opacity: 0, filter: "blur(20px)", y: -80 }}
              transition={{ duration: 1.8, ease: LOCOMOTIVE_EASE }}
              className="will-change-transform"
            >
              <PitchLine
                phrase={pitchLine || pitchDeck.hooks[0]}
                phase={pitchPhase % 4}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute inset-0 z-50 pointer-events-none grain-engine" />

      {/* LAYER 10 : NAVIGATION BASSE */}
      <div className="absolute inset-0 z-[100] flex flex-col justify-end p-10 md:p-24 pointer-events-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-20 w-full">
          <div className="flex flex-col gap-5 items-start md:-translate-x-1 md:translate-y-2 md:rotate-[-0.4deg]">
            <NavItem href="/" label={menuNav.home} delay={1.2} itemClass="md:translate-x-2" />
            <NavItem
              href="#manifesto"
              label={menuNav.manifesto}
              delay={1.3}
              isWhite
              itemClass="-translate-y-0.5 md:-translate-x-1"
            />
            <Link
              href="/"
              className="text-[10px] md:text-[11px] font-medium uppercase tracking-[0.5em] text-zinc-600 transition-colors duration-300 hover:text-zinc-400 md:translate-x-3"
            >
              {brandFoot}
            </Link>
          </div>
          <div className="flex flex-col items-start pt-2.5 md:translate-x-4 md:-translate-y-1 md:rotate-[0.6deg]">
            <NavItem href="#process" label={menuNav.process} delay={1.4} itemClass="md:-translate-x-1" />
            <NavItem href="#pricing" label={menuNav.pricing} delay={1.45} itemClass="md:mt-2 md:-translate-x-1" />
          </div>
          <div className="flex flex-col gap-5 items-start md:translate-x-1 md:-translate-y-3 md:rotate-[0.35deg]">
            <NavItem
              href="#partners"
              label={menuNav.partners}
              delay={1.5}
              itemClass="md:translate-x-2 md:translate-y-1"
            />
            <NavItem
              href="#manifesto"
              label={menuNav.manifesto}
              delay={1.6}
              isWhite
              itemClass="-translate-x-1 md:translate-y-2"
            />
            <Link
              href="/"
              className="text-[10px] md:text-[11px] font-medium uppercase tracking-[0.5em] text-zinc-600 transition-colors duration-300 hover:text-zinc-400 md:-translate-x-2"
            >
              {brandFoot}
            </Link>
          </div>
          <div className="flex flex-col items-start pt-2.5 md:-translate-x-2 md:translate-y-4 md:rotate-[-0.55deg]">
            <NavItem href="/contact" label={menuNav.contact} delay={1.7} itemClass="md:translate-x-1" />
          </div>
        </div>
      </div>

    </section>
  );
}

function PitchLine({ phrase, phase }: { phrase: string; phase: number }) {
  const isHook = phase === 0;
  const isSignature = phase === 3;
  return (
    <h2
      className={[
        "vibrant-halo max-w-[90vw] text-[4.5vw] font-bold uppercase leading-[1.15] sm:max-w-[88vw] sm:text-[4vw] md:max-w-[85vw] md:text-[3.25vw]",
        isSignature
          ? "tracking-[0.44em] sm:tracking-[0.56em] md:tracking-[0.72em]"
          : "tracking-[0.38em] sm:tracking-[0.48em] md:tracking-[0.58em]",
      ].join(" ")}
      style={{ opacity: isHook ? 0.68 : 0.5 }}
    >
      {phrase}
    </h2>
  );
}

function NavItem({
  href,
  label,
  delay,
  isWhite = false,
  itemClass = "",
}: {
  href: string;
  label: string;
  delay: number;
  isWhite?: boolean;
  itemClass?: string;
}) {
  return (
    <div className={`relative py-2 px-4 -ml-4 overflow-visible ${itemClass}`}>
      <motion.div className="will-change-transform" initial={{ y: "110%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay }}>
        <Link
          href={href}
          className={`neon-vivid inline-block text-[12px] md:text-[14px] font-bold uppercase tracking-[0.5em] transition-all duration-700 ease-out cursor-pointer select-none ${isWhite ? "text-white" : "text-zinc-500"}`}
        >
          {label}
        </Link>
      </motion.div>
    </div>
  );
}

