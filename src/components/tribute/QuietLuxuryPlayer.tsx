"use client";

/**
 * C4 — Lecteur séance Quiet Luxury.
 * MP3 = master clock · dual video ping-pong · 2 actes · noir fin ≥1 s → onPlaybackComplete.
 * Zéro ML live · zéro hub cash (→ C8).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

export type QuietLuxuryClip = {
  id: string;
  kind: "image" | "video";
  url: string;
  durationSec: number;
  label?: string;
};

export type QuietLuxuryAct = {
  id: string;
  title?: string;
  /** URL audio déjà résolue (proxy Stingray / signed upload). */
  audioUrl: string | null;
  clips: QuietLuxuryClip[];
};

export type QuietLuxuryMemoryCard = {
  displayName: string;
  yearsLine: string;
};

export type QuietLuxuryPlayerCopy = {
  play: string;
  pause: string;
  loading?: string;
};

type Segment =
  | { kind: "breath_black"; start: number; end: number }
  | { kind: "breath_portrait"; start: number; end: number }
  | {
      kind: "clip";
      start: number;
      end: number;
      actIndex: number;
      clip: QuietLuxuryClip;
      actAudioUrl: string | null;
      actAudioOffsetSec: number;
    }
  | {
      kind: "act_bridge";
      start: number;
      end: number;
      title?: string;
    }
  | { kind: "memory_card"; start: number; end: number }
  | { kind: "end_black"; start: number; end: number };

const BREATH_BLACK_SEC = 0.85;
const BREATH_PORTRAIT_SEC = 2.8;
const ACT_BRIDGE_SEC = 1.35;
const MEMORY_CARD_SEC = 5.5;
const END_BLACK_SEC = 1.15;
const DEFAULT_IMAGE_SEC = 4.2;
const DEFAULT_VIDEO_SEC = 10;
const CROSSFADE_SEC = 0.45;

export type QuietLuxuryPlayerProps = {
  acts: QuietLuxuryAct[];
  openingPortraitUrl?: string | null;
  memoryCard?: QuietLuxuryMemoryCard | null;
  /** Pastille sobre — jamais un CTA cash. */
  salonBadge?: string | null;
  autoPlay?: boolean;
  /** Wizard teaser : contrôles visibles. Stream : masqués pendant lecture. */
  showControls?: boolean;
  onPlaybackComplete?: () => void;
  copy: QuietLuxuryPlayerCopy;
  className?: string;
  emptyLabel?: string;
};

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function buildTimeline(
  acts: QuietLuxuryAct[],
  hasPortrait: boolean,
  hasMemoryCard: boolean,
): { segments: Segment[]; durationSec: number } {
  const segments: Segment[] = [];
  let t = 0;

  segments.push({
    kind: "breath_black",
    start: t,
    end: t + BREATH_BLACK_SEC,
  });
  t += BREATH_BLACK_SEC;

  if (hasPortrait) {
    segments.push({
      kind: "breath_portrait",
      start: t,
      end: t + BREATH_PORTRAIT_SEC,
    });
    t += BREATH_PORTRAIT_SEC;
  }

  acts.forEach((act, actIndex) => {
    if (actIndex > 0) {
      segments.push({
        kind: "act_bridge",
        start: t,
        end: t + ACT_BRIDGE_SEC,
        title: act.title,
      });
      t += ACT_BRIDGE_SEC;
    }

    let audioCursor = 0;
    for (const clip of act.clips) {
      const dur = Math.max(
        0.8,
        clip.durationSec ||
          (clip.kind === "video" ? DEFAULT_VIDEO_SEC : DEFAULT_IMAGE_SEC),
      );
      segments.push({
        kind: "clip",
        start: t,
        end: t + dur,
        actIndex,
        clip,
        actAudioUrl: act.audioUrl,
        actAudioOffsetSec: audioCursor,
      });
      t += dur;
      audioCursor += dur;
    }
  });

  if (hasMemoryCard) {
    segments.push({
      kind: "memory_card",
      start: t,
      end: t + MEMORY_CARD_SEC,
    });
    t += MEMORY_CARD_SEC;
  }

  segments.push({
    kind: "end_black",
    start: t,
    end: t + END_BLACK_SEC,
  });
  t += END_BLACK_SEC;

  return { segments, durationSec: t };
}

function segmentAt(segments: Segment[], timeSec: number): Segment | null {
  if (!segments.length) return null;
  for (const s of segments) {
    if (timeSec >= s.start && timeSec < s.end) return s;
  }
  return segments[segments.length - 1] ?? null;
}

export function QuietLuxuryPlayer({
  acts,
  openingPortraitUrl = null,
  memoryCard = null,
  salonBadge = null,
  autoPlay = true,
  showControls = true,
  onPlaybackComplete,
  copy,
  className = "",
  emptyLabel,
}: QuietLuxuryPlayerProps) {
  const hasClips = acts.some((a) => a.clips.length > 0);
  const { segments, durationSec } = useMemo(
    () =>
      buildTimeline(
        acts,
        Boolean(openingPortraitUrl),
        Boolean(memoryCard?.displayName),
      ),
    [acts, openingPortraitUrl, memoryCard?.displayName],
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);
  const activeVideoSlot = useRef<0 | 1>(0);
  const loadedVideoUrl = useRef<[string | null, string | null]>([null, null]);
  const rafRef = useRef<number | null>(null);
  const playingRef = useRef(false);
  const completedRef = useRef(false);
  const wallOriginRef = useRef(0);
  const pauseAccumRef = useRef(0);
  const pauseStartedRef = useRef<number | null>(null);
  const audioActUrlRef = useRef<string | null>(null);
  const masterTimeRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [masterTime, setMasterTime] = useState(0);
  const [uiVisible, setUiVisible] = useState(true);
  const hideUiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = segmentAt(segments, masterTime);

  const cancelRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const readMasterTime = useCallback(() => {
    if (!playingRef.current) return masterTimeRef.current;
    if (pauseStartedRef.current != null) return masterTimeRef.current;
    const wall = (performance.now() - wallOriginRef.current) / 1000;
    return clamp(wall - pauseAccumRef.current, 0, durationSec);
  }, [durationSec]);

  const ensureAudio = useCallback(async (url: string | null, seekSec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!url) {
      audio.pause();
      audio.removeAttribute("src");
      audioActUrlRef.current = null;
      return;
    }
    if (audioActUrlRef.current !== url) {
      audio.src = url;
      audioActUrlRef.current = url;
      try {
        await audio.load();
      } catch {
        /* best-effort */
      }
    }
    try {
      if (Math.abs(audio.currentTime - seekSec) > 0.35) {
        audio.currentTime = Math.max(0, seekSec);
      }
      if (playingRef.current) {
        await audio.play();
      }
    } catch {
      /* autoplay / seek best-effort */
    }
  }, []);

  const prepareVideoSlot = useCallback(
    async (url: string, localTimeSec: number) => {
      const nextSlot: 0 | 1 = activeVideoSlot.current === 0 ? 1 : 0;
      const el = nextSlot === 0 ? videoARef.current : videoBRef.current;
      if (!el) return;
      if (loadedVideoUrl.current[nextSlot] !== url) {
        el.src = url;
        loadedVideoUrl.current[nextSlot] = url;
        try {
          el.load();
        } catch {
          /* */
        }
      }
      try {
        if (Math.abs(el.currentTime - localTimeSec) > 0.4) {
          el.currentTime = Math.max(0, localTimeSec);
        }
        if (playingRef.current) await el.play();
      } catch {
        /* */
      }
      activeVideoSlot.current = nextSlot;
    },
    [],
  );

  const syncMediaToClock = useCallback(
    async (timeSec: number) => {
      const seg = segmentAt(segments, timeSec);
      if (!seg) return;

      if (seg.kind === "clip" && seg.actAudioUrl) {
        const localAudio = timeSec - seg.start + seg.actAudioOffsetSec;
        // Master clock preference: if audio is playing, drift-correct wall to audio
        const audio = audioRef.current;
        if (
          audio &&
          audioActUrlRef.current === seg.actAudioUrl &&
          !audio.paused &&
          Number.isFinite(audio.currentTime)
        ) {
          const audioMaster =
            seg.start - seg.actAudioOffsetSec + audio.currentTime;
          if (Math.abs(audioMaster - timeSec) > 0.22) {
            // Snap wall origin so medias catch audio, never the reverse
            const desiredWall = audioMaster + pauseAccumRef.current;
            wallOriginRef.current = performance.now() - desiredWall * 1000;
            timeSec = audioMaster;
          }
        }
        await ensureAudio(seg.actAudioUrl, localAudio);
      } else {
        await ensureAudio(null, 0);
      }

      if (seg.kind === "clip" && seg.clip.kind === "video") {
        const local = timeSec - seg.start;
        const activeEl =
          activeVideoSlot.current === 0 ? videoARef.current : videoBRef.current;
        const activeUrl = loadedVideoUrl.current[activeVideoSlot.current];
        if (activeUrl !== seg.clip.url) {
          await prepareVideoSlot(seg.clip.url, local);
        } else if (activeEl && playingRef.current) {
          if (Math.abs(activeEl.currentTime - local) > 0.45) {
            try {
              activeEl.currentTime = Math.max(0, local);
            } catch {
              /* */
            }
          }
          if (activeEl.paused) {
            try {
              await activeEl.play();
            } catch {
              /* */
            }
          }
        }
      } else {
        videoARef.current?.pause();
        videoBRef.current?.pause();
      }
    },
    [ensureAudio, prepareVideoSlot, segments],
  );

  const tick = useCallback(() => {
    if (!playingRef.current) return;
    let t = readMasterTime();
    masterTimeRef.current = t;
    setMasterTime(t);
    void syncMediaToClock(t);

    if (t >= durationSec - 0.02) {
      playingRef.current = false;
      setIsPlaying(false);
      cancelRaf();
      audioRef.current?.pause();
      videoARef.current?.pause();
      videoBRef.current?.pause();
      if (!completedRef.current) {
        completedRef.current = true;
        onPlaybackComplete?.();
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [
    cancelRaf,
    durationSec,
    onPlaybackComplete,
    readMasterTime,
    syncMediaToClock,
  ]);

  const startClock = useCallback(() => {
    completedRef.current = false;
    pauseStartedRef.current = null;
    pauseAccumRef.current = 0;
    wallOriginRef.current = performance.now();
    masterTimeRef.current = 0;
    setMasterTime(0);
    playingRef.current = true;
    setIsPlaying(true);
    cancelRaf();
    rafRef.current = requestAnimationFrame(tick);
  }, [cancelRaf, tick]);

  const pauseClock = useCallback(() => {
    if (!playingRef.current) return;
    playingRef.current = false;
    setIsPlaying(false);
    pauseStartedRef.current = performance.now();
    masterTimeRef.current = readMasterTime();
    cancelRaf();
    audioRef.current?.pause();
    videoARef.current?.pause();
    videoBRef.current?.pause();
  }, [cancelRaf, readMasterTime]);

  const resumeClock = useCallback(() => {
    if (playingRef.current) return;
    if (pauseStartedRef.current != null) {
      pauseAccumRef.current +=
        (performance.now() - pauseStartedRef.current) / 1000;
      pauseStartedRef.current = null;
    }
    playingRef.current = true;
    setIsPlaying(true);
    cancelRaf();
    rafRef.current = requestAnimationFrame(tick);
  }, [cancelRaf, tick]);

  const toggle = useCallback(() => {
    if (playingRef.current) pauseClock();
    else if (masterTimeRef.current <= 0.05) startClock();
    else resumeClock();
  }, [pauseClock, resumeClock, startClock]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    return () => {
      playingRef.current = false;
      cancelRaf();
      audio.pause();
      audio.removeAttribute("src");
      audioRef.current = null;
    };
  }, [cancelRaf]);

  useEffect(() => {
    if (autoPlay && hasClips && !completedRef.current) {
      startClock();
    }
    return () => {
      playingRef.current = false;
      cancelRaf();
    };
    // intentional: start once when acts ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, hasClips, acts]);

  const bumpUi = useCallback(() => {
    setUiVisible(true);
    if (hideUiTimer.current) clearTimeout(hideUiTimer.current);
    if (!showControls) {
      hideUiTimer.current = setTimeout(() => setUiVisible(false), 2200);
    }
  }, [showControls]);

  useEffect(() => {
    if (showControls) {
      setUiVisible(true);
      return;
    }
    bumpUi();
  }, [bumpUi, showControls]);

  if (!hasClips) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.45)] ${className}`}
      >
        <div className="flex aspect-video min-h-[18rem] items-center justify-center px-6 text-center">
          <p className="max-w-md text-sm font-light leading-relaxed text-zinc-400">
            {emptyLabel ?? "—"}
          </p>
        </div>
      </div>
    );
  }

  const seg = current;
  const localProgress =
    seg && seg.end > seg.start
      ? clamp((masterTime - seg.start) / (seg.end - seg.start), 0, 1)
      : 0;

  const showPortrait = seg?.kind === "breath_portrait";
  const showCard = seg?.kind === "memory_card";
  const showClip = seg?.kind === "clip";
  const showBridge = seg?.kind === "act_bridge";
  const isBlack =
    seg?.kind === "breath_black" ||
    seg?.kind === "end_black" ||
    seg?.kind === "act_bridge";

  const clip = showClip && seg.kind === "clip" ? seg.clip : null;
  const activeSlot = activeVideoSlot.current;
  const portraitScale = showPortrait
    ? 1.04 - localProgress * 0.04
    : 1;

  const grainStyle: CSSProperties = {
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
    opacity: 0.07,
    mixBlendMode: "overlay",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.55)] ${className}`}
      onMouseMove={bumpUi}
      onTouchStart={bumpUi}
    >
      <div className="relative aspect-video w-full bg-black">
        {/* Dual video ping-pong */}
        <video
          ref={videoARef}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
          style={{
            opacity:
              showClip && clip?.kind === "video" && activeSlot === 0 ? 1 : 0,
          }}
          muted
          playsInline
          preload="auto"
          aria-hidden
        />
        <video
          ref={videoBRef}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
          style={{
            opacity:
              showClip && clip?.kind === "video" && activeSlot === 1 ? 1 : 0,
          }}
          muted
          playsInline
          preload="auto"
          aria-hidden
        />

        {/* Image clip / portrait */}
        {showClip && clip?.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={clip.id}
            src={clip.url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
            style={{ opacity: 1 }}
            draggable={false}
          />
        ) : null}

        {showPortrait && openingPortraitUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={openingPortraitUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              transform: `scale(${portraitScale})`,
              transition: "transform 80ms linear",
            }}
            draggable={false}
          />
        ) : null}

        {isBlack ? (
          <div className="absolute inset-0 bg-black" aria-hidden />
        ) : null}

        {showBridge && seg.kind === "act_bridge" && seg.title ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="font-[family-name:var(--font-label)] text-sm font-light tracking-[0.25em] text-zinc-300 uppercase">
              {seg.title}
            </p>
          </div>
        ) : null}

        {showCard && memoryCard ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black px-6 text-center">
            <p
              className="font-serif text-[clamp(1.6rem,4.2vw,2.75rem)] font-medium tracking-wide text-zinc-200"
              style={{ fontFamily: "var(--font-editorial), Georgia, serif" }}
            >
              {memoryCard.displayName}
            </p>
            <p className="mt-4 text-[clamp(0.75rem,1.6vw,1rem)] font-light tracking-[0.35em] text-zinc-400">
              {memoryCard.yearsLine}
            </p>
          </div>
        ) : null}

        {/* Grain + vignette */}
        <div
          className="pointer-events-none absolute inset-0"
          style={grainStyle}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 75% 70% at 50% 45%, transparent 40%, rgba(0,0,0,0.55) 100%)",
          }}
          aria-hidden
        />

        {salonBadge ? (
          <div
            className={`absolute left-3 top-3 z-10 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[10px] font-medium tracking-wide text-zinc-300 backdrop-blur-md transition-opacity duration-500 ${
              uiVisible || showControls ? "opacity-90" : "opacity-0"
            }`}
          >
            {salonBadge}
          </div>
        ) : null}

        {showClip && clip?.label && (uiVisible || showControls) ? (
          <div className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-zinc-400 backdrop-blur-md">
            {clip.label}
          </div>
        ) : null}
      </div>

      {showControls ? (
        <div className="border-t border-white/10 bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur-xl md:px-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              aria-label={isPlaying ? copy.pause : copy.play}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-zinc-100"
            >
              {isPlaying ? (
                <span className="text-xs tracking-wide">II</span>
              ) : (
                <span className="ml-0.5 text-xs tracking-wide">▶</span>
              )}
            </button>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-400/90 to-cyan-400/80"
                style={{
                  width: `${clamp((masterTime / Math.max(durationSec, 0.01)) * 100, 0, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Constantes exportées pour tests / smoke. */
export const QUIET_LUXURY_END_BLACK_SEC = END_BLACK_SEC;
export const QUIET_LUXURY_CROSSFADE_SEC = CROSSFADE_SEC;
