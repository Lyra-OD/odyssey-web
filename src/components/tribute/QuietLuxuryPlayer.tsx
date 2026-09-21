"use client";

/**
 * C4 — Lecteur séance Quiet Luxury.
 * MP3 = master clock · dual video ping-pong · 2 actes · noir fin ≥1 s → onPlaybackComplete.
 * Variant `cinema` = présentation immersive (lab /stream) — teaser wizard inchangé.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

export type QuietLuxuryKenBurns = "push" | "pull";

export type QuietLuxuryClip = {
  id: string;
  kind: "image" | "video";
  url: string;
  durationSec: number;
  label?: string;
  /** Portrait → push (100→104). Paysage → pull (104→100). */
  kenBurns?: QuietLuxuryKenBurns;
  /** Cadrage visage / sujet (ex. "center 22%"). */
  objectPosition?: string;
};

export type QuietLuxuryAct = {
  id: string;
  title?: string;
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
  /** Pastille si autoplay audio bloqué après geste. */
  enableSound?: string;
};

type Timing = {
  /** Titre seul sur noir (cinéma). Teaser = 0. */
  breathTitle: number;
  breathBlack: number;
  breathPortrait: number;
  /** Micro-noir entre clips (cinéma). Teaser = 0. */
  interBlack: number;
  actBridge: number;
  memoryCard: number;
  endBlack: number;
  audioFade: number;
};

const TEASER_TIMING: Timing = {
  breathTitle: 0,
  breathBlack: 0.85,
  breathPortrait: 2.8,
  interBlack: 0,
  actBridge: 1.35,
  memoryCard: 5.5,
  endBlack: 1.15,
  audioFade: 0.6,
};

const CINEMA_TIMING: Timing = {
  breathTitle: 1.5,
  breathBlack: 0.35,
  breathPortrait: 3.25,
  interBlack: 0.2,
  actBridge: 3.4,
  memoryCard: 6.5,
  endBlack: 1.55,
  audioFade: 1.5,
};

const DEFAULT_IMAGE_SEC = 4.2;
const DEFAULT_VIDEO_SEC = 10;

type Segment =
  | { kind: "breath_title"; start: number; end: number }
  | { kind: "breath_black"; start: number; end: number }
  | { kind: "breath_portrait"; start: number; end: number }
  | {
      kind: "clip";
      start: number;
      end: number;
      actIndex: number;
      clipIndex: number;
      clip: QuietLuxuryClip;
      actAudioUrl: string | null;
      actAudioOffsetSec: number;
    }
  | {
      kind: "clip_black";
      start: number;
      end: number;
      actAudioUrl: string | null;
      actAudioOffsetSec: number;
    }
  | { kind: "act_bridge"; start: number; end: number; title?: string }
  | { kind: "memory_card"; start: number; end: number }
  | { kind: "end_black"; start: number; end: number };

export type QuietLuxuryPlayerProps = {
  acts: QuietLuxuryAct[];
  openingPortraitUrl?: string | null;
  memoryCard?: QuietLuxuryMemoryCard | null;
  salonBadge?: string | null;
  autoPlay?: boolean;
  showControls?: boolean;
  /** Présentation immersive (lab / stream). */
  cinema?: boolean;
  /** Instance Audio amorcée au geste utilisateur — jamais recreée. */
  primedAudio?: HTMLAudioElement | null;
  onPlaybackComplete?: () => void;
  copy: QuietLuxuryPlayerCopy;
  className?: string;
  emptyLabel?: string;
};

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function sameMediaUrl(a: string | null, b: string | null): boolean {
  if (!a || !b) return a === b;
  if (a === b) return true;
  try {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://local";
    return new URL(a, origin).pathname === new URL(b, origin).pathname;
  } catch {
    return a === b;
  }
}

function buildTimeline(
  acts: QuietLuxuryAct[],
  hasPortrait: boolean,
  hasMemoryCard: boolean,
  timing: Timing,
  cinema: boolean,
): { segments: Segment[]; durationSec: number } {
  const segments: Segment[] = [];
  let t = 0;

  if (cinema && hasMemoryCard && timing.breathTitle > 0) {
    segments.push({
      kind: "breath_title",
      start: t,
      end: t + timing.breathTitle,
    });
    t += timing.breathTitle;
  } else if (timing.breathBlack > 0) {
    segments.push({
      kind: "breath_black",
      start: t,
      end: t + timing.breathBlack,
    });
    t += timing.breathBlack;
  }

  if (hasPortrait) {
    segments.push({
      kind: "breath_portrait",
      start: t,
      end: t + timing.breathPortrait,
    });
    t += timing.breathPortrait;
  }

  const openingDur = t;

  acts.forEach((act, actIndex) => {
    if (actIndex > 0) {
      segments.push({
        kind: "act_bridge",
        start: t,
        end: t + timing.actBridge,
        title: act.title,
      });
      t += timing.actBridge;
    }

    // Cinéma : l'audio du 1er chapitre court dès t=0 (noir) → offset = ouverture.
    let audioCursor = actIndex === 0 && cinema ? openingDur : 0;
    act.clips.forEach((clip, clipIndex) => {
      if (clipIndex > 0 && timing.interBlack > 0) {
        segments.push({
          kind: "clip_black",
          start: t,
          end: t + timing.interBlack,
          actAudioUrl: act.audioUrl,
          actAudioOffsetSec: audioCursor,
        });
        t += timing.interBlack;
        audioCursor += timing.interBlack;
      }
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
        clipIndex,
        clip,
        actAudioUrl: act.audioUrl,
        actAudioOffsetSec: audioCursor,
      });
      t += dur;
      audioCursor += dur;
    });
  });

  if (hasMemoryCard) {
    segments.push({
      kind: "memory_card",
      start: t,
      end: t + timing.memoryCard,
    });
    t += timing.memoryCard;
  }

  segments.push({
    kind: "end_black",
    start: t,
    end: t + timing.endBlack,
  });
  t += timing.endBlack;

  return { segments, durationSec: t };
}

function segmentAt(segments: Segment[], timeSec: number): Segment | null {
  if (!segments.length) return null;
  for (const s of segments) {
    if (timeSec >= s.start && timeSec < s.end) return s;
  }
  return segments[segments.length - 1] ?? null;
}

function segmentKey(seg: Segment | null): string {
  if (!seg) return "";
  if (seg.kind === "clip") return `clip:${seg.clip.id}:${seg.start}`;
  return `${seg.kind}:${seg.start}`;
}

export async function requestNativeFullscreen(
  el: HTMLElement = document.documentElement,
): Promise<void> {
  const node = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
    webkitRequestFullScreen?: () => Promise<void> | void;
  };
  try {
    if (typeof node.requestFullscreen === "function") {
      await node.requestFullscreen();
      return;
    }
    if (typeof node.webkitRequestFullscreen === "function") {
      await node.webkitRequestFullscreen();
      return;
    }
    if (typeof node.webkitRequestFullScreen === "function") {
      await node.webkitRequestFullScreen();
    }
  } catch {
    /* gestes refusés / non supportés */
  }
}

export async function exitNativeFullscreen(): Promise<void> {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
    webkitCancelFullScreen?: () => Promise<void> | void;
  };
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
      return;
    }
    if (typeof doc.webkitExitFullscreen === "function") {
      await doc.webkitExitFullscreen();
      return;
    }
    if (typeof doc.webkitCancelFullScreen === "function") {
      await doc.webkitCancelFullScreen();
    }
  } catch {
    /* */
  }
}

function isNativeFullscreen(): boolean {
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  return Boolean(document.fullscreenElement || doc.webkitFullscreenElement);
}

/** Kodak A24 — pas de sepia (préserve les teintes chair). */
const KODAK_35MM_FILTER = "contrast(1.05) brightness(0.98) saturate(0.92)";

const KODAK_GRAIN_SVG =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E\")";

const CINEMA_STYLE = `
@keyframes ql-kb-push {
  from { transform: scale(1); }
  to { transform: scale(1.04); }
}
@keyframes ql-kb-pull {
  from { transform: scale(1.04); }
  to { transform: scale(1); }
}
@keyframes ql-kb-push-soft {
  from { transform: scale(1); }
  to { transform: scale(1.03); }
}
@keyframes ql-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes ql-fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
@keyframes ql-breath-title {
  0% { opacity: 0; }
  14% { opacity: 1; }
  72% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes ql-portrait-reveal {
  0% { opacity: 0; }
  18% { opacity: 1; }
  100% { opacity: 1; }
}
@keyframes ql-bridge-title {
  0% { opacity: 0; }
  18% { opacity: 1; }
  78% { opacity: 1; }
  100% { opacity: 0; }
}
`;

export function QuietLuxuryPlayer({
  acts,
  openingPortraitUrl = null,
  memoryCard = null,
  salonBadge = null,
  autoPlay = true,
  showControls = true,
  cinema = false,
  primedAudio = null,
  onPlaybackComplete,
  copy,
  className = "",
  emptyLabel,
}: QuietLuxuryPlayerProps) {
  const timing = cinema ? CINEMA_TIMING : TEASER_TIMING;
  const controlsVisible = cinema ? false : showControls;
  const hasClips = acts.some((a) => a.clips.length > 0);

  const { segments, durationSec } = useMemo(
    () =>
      buildTimeline(
        acts,
        Boolean(openingPortraitUrl),
        Boolean(memoryCard?.displayName),
        timing,
        cinema,
      ),
    [acts, openingPortraitUrl, memoryCard?.displayName, timing, cinema],
  );

  const rootRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const loadedVideoUrl = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const playingRef = useRef(false);
  const completedRef = useRef(false);
  const wallOriginRef = useRef(0);
  const pauseAccumRef = useRef(0);
  const pauseStartedRef = useRef<number | null>(null);
  const audioActUrlRef = useRef<string | null>(null);
  const masterTimeRef = useRef(0);
  const lastUiAtRef = useRef(0);
  const lastSegKeyRef = useRef("");
  const cursorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownsAudioRef = useRef(false);

  const firstActAudioUrl = acts[0]?.audioUrl ?? null;
  const openingEndSec = useMemo(() => {
    const firstClip = segments.find((s) => s.kind === "clip");
    return firstClip?.start ?? 0;
  }, [segments]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [masterTime, setMasterTime] = useState(0);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [audioNeedsGesture, setAudioNeedsGesture] = useState(false);
  const [videoLayerOn, setVideoLayerOn] = useState(false);

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

  const targetVolumeForTime = useCallback(
    (timeSec: number): number => {
      const seg = segmentAt(segments, timeSec);
      if (!seg) return 0;
      if (seg.kind === "act_bridge") return 0;
      if (seg.kind === "memory_card" || seg.kind === "end_black") return 0;

      const fade = timing.audioFade;

      // Cinéma : musique dès t=0 dans le noir (fade-in), avant le nom.
      if (
        cinema &&
        firstActAudioUrl &&
        timeSec < openingEndSec &&
        (seg.kind === "breath_title" ||
          seg.kind === "breath_black" ||
          seg.kind === "breath_portrait")
      ) {
        return clamp(timeSec / Math.max(fade, 0.01), 0, 1);
      }

      // Micro-noir entre clips : audio continue (pas de trou musical).
      if (seg.kind === "clip_black" && seg.actAudioUrl) return 1;

      if (seg.kind !== "clip" || !seg.actAudioUrl) return 0;

      const intoClip = timeSec - seg.start;
      const leftInClip = seg.end - timeSec;

      let vol = 1;
      // Fade-in seulement si ce clip démarre vraiment la piste (offset ~0).
      if (seg.actAudioOffsetSec < 0.05 && intoClip < fade) {
        vol = Math.min(vol, intoClip / fade);
      }
      const next = segments.find((s) => s.start >= seg.end - 0.001);
      if (
        next &&
        (next.kind === "act_bridge" ||
          next.kind === "memory_card" ||
          next.kind === "end_black") &&
        leftInClip < fade
      ) {
        vol = Math.min(vol, leftInClip / fade);
      }
      return clamp(vol, 0, 1);
    },
    [cinema, firstActAudioUrl, openingEndSec, segments, timing.audioFade],
  );

  const ensureAudio = useCallback(
    async (url: string | null, seekSec: number, volume: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (!url) {
        audio.pause();
        // Ne jamais destroy l'instance amorcée — juste silence.
        audio.volume = 0;
        return;
      }
      if (!sameMediaUrl(audioActUrlRef.current, url)) {
        audio.src = url;
        audioActUrlRef.current = url;
        try {
          audio.load();
        } catch {
          /* */
        }
      }
      audio.volume = clamp(volume, 0, 1);
      try {
        // Recalage doux uniquement si dérive nette — pas de saut d'horloge.
        if (
          Number.isFinite(audio.currentTime) &&
          Math.abs(audio.currentTime - seekSec) > 0.75
        ) {
          audio.currentTime = Math.max(0, seekSec);
        }
        if (playingRef.current) {
          if (audio.paused) await audio.play();
          setAudioNeedsGesture(false);
        }
      } catch {
        if (playingRef.current) setAudioNeedsGesture(true);
      }
    },
    [],
  );

  const ensureVideo = useCallback(async (url: string, localTimeSec: number) => {
    const el = videoRef.current;
    if (!el) return;
    // Visibilité immédiate (DOM) — indépendante d'un re-render React.
    el.muted = true;
    el.playsInline = true;
    el.loop = false;
    // Ne pas forcer opacity:1 (casse le fondu CSS cinéma).
    el.style.removeProperty("opacity");
    setVideoLayerOn((on) => (on ? on : true));
    if (loadedVideoUrl.current !== url) {
      el.src = url;
      loadedVideoUrl.current = url;
      try {
        el.load();
      } catch {
        /* */
      }
    }
    try {
      if (Math.abs(el.currentTime - localTimeSec) > 0.55) {
        el.currentTime = Math.max(0, localTimeSec);
      }
      if (playingRef.current) await el.play();
    } catch {
      /* */
    }
  }, []);

  const hideVideo = useCallback(() => {
    const el = videoRef.current;
    if (el) {
      el.style.opacity = "0";
      if (!el.paused) el.pause();
    }
    setVideoLayerOn((on) => (on ? false : on));
  }, []);

  const syncMediaToClock = useCallback(
    (timeSec: number) => {
      const seg = segmentAt(segments, timeSec);
      if (!seg) return;
      const volume = targetVolumeForTime(timeSec);

      const isOpening =
        seg.kind === "breath_title" ||
        seg.kind === "breath_black" ||
        seg.kind === "breath_portrait";

      if (cinema && isOpening && firstActAudioUrl) {
        void ensureAudio(firstActAudioUrl, timeSec, volume);
      } else if (seg.kind === "clip" && seg.actAudioUrl) {
        const localAudio = timeSec - seg.start + seg.actAudioOffsetSec;
        void ensureAudio(seg.actAudioUrl, localAudio, volume);
      } else if (seg.kind === "clip_black" && seg.actAudioUrl) {
        const localAudio = timeSec - seg.start + seg.actAudioOffsetSec;
        void ensureAudio(seg.actAudioUrl, localAudio, volume);
      } else if (seg.kind === "act_bridge") {
        if (audioRef.current) audioRef.current.volume = 0;
      } else {
        if (audioRef.current) audioRef.current.volume = 0;
      }

      if (seg.kind === "clip" && seg.clip.kind === "video") {
        void ensureVideo(seg.clip.url, timeSec - seg.start);
      } else {
        hideVideo();
      }
    },
    [
      cinema,
      ensureAudio,
      ensureVideo,
      firstActAudioUrl,
      hideVideo,
      segments,
      targetVolumeForTime,
    ],
  );

  const publishUiTime = useCallback(
    (t: number) => {
      const seg = segmentAt(segments, t);
      const key = segmentKey(seg);
      if (cinema) {
        if (key !== lastSegKeyRef.current) {
          lastSegKeyRef.current = key;
          setMasterTime(t);
        }
        return;
      }
      if (t - lastUiAtRef.current >= 0.1 || key !== lastSegKeyRef.current) {
        lastUiAtRef.current = t;
        lastSegKeyRef.current = key;
        setMasterTime(t);
      }
    },
    [cinema, segments],
  );

  const tick = useCallback(() => {
    if (!playingRef.current) return;
    const t = readMasterTime();
    masterTimeRef.current = t;
    publishUiTime(t);
    void syncMediaToClock(t);

    if (t >= durationSec - 0.02) {
      playingRef.current = false;
      setIsPlaying(false);
      setMasterTime(durationSec);
      cancelRaf();
      audioRef.current?.pause();
      videoRef.current?.pause();
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
    publishUiTime,
    readMasterTime,
    syncMediaToClock,
  ]);

  const startClock = useCallback(() => {
    completedRef.current = false;
    pauseStartedRef.current = null;
    pauseAccumRef.current = 0;
    wallOriginRef.current = performance.now();
    masterTimeRef.current = 0;
    lastSegKeyRef.current = "";
    lastUiAtRef.current = 0;
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
    setMasterTime(masterTimeRef.current);
    cancelRaf();
    audioRef.current?.pause();
    videoRef.current?.pause();
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
    else if (masterTimeRef.current <= 0.05 && !completedRef.current)
      startClock();
    else if (!completedRef.current) resumeClock();
  }, [pauseClock, resumeClock, startClock]);

  const retryAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio?.src) return;
    try {
      await audio.play();
      setAudioNeedsGesture(false);
      if (!playingRef.current && !completedRef.current) resumeClock();
    } catch {
      setAudioNeedsGesture(true);
    }
  }, [resumeClock]);

  const bumpCursor = useCallback(() => {
    if (!cinema) return;
    setCursorHidden(false);
    if (cursorTimer.current) clearTimeout(cursorTimer.current);
    cursorTimer.current = setTimeout(() => setCursorHidden(true), 1500);
  }, [cinema]);

  const toggleBrowserFullscreen = useCallback(async () => {
    if (isNativeFullscreen()) await exitNativeFullscreen();
    else await requestNativeFullscreen(document.documentElement);
  }, []);

  useEffect(() => {
    if (primedAudio) {
      ownsAudioRef.current = false;
      audioRef.current = primedAudio;
      audioActUrlRef.current = primedAudio.src || null;
      return () => {
        playingRef.current = false;
        cancelRaf();
        primedAudio.pause();
        audioRef.current = null;
      };
    }
    ownsAudioRef.current = true;
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
  }, [cancelRaf, primedAudio]);

  useEffect(() => {
    if (autoPlay && hasClips && !completedRef.current) {
      startClock();
    }
    return () => {
      playingRef.current = false;
      cancelRaf();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, hasClips]);

  useEffect(() => {
    if (!cinema) return;
    bumpCursor();
    const onMove = () => bumpCursor();
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        void toggleBrowserFullscreen();
      }
      // Échap : géré nativement par le navigateur pour quitter le Fullscreen API.
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onKey);
      if (cursorTimer.current) clearTimeout(cursorTimer.current);
    };
  }, [bumpCursor, cinema, toggle, toggleBrowserFullscreen]);

  useEffect(() => {
    if (!cinema) return;
    const prev = document.documentElement.style.cursor;
    document.documentElement.style.cursor = cursorHidden ? "none" : "";
    return () => {
      document.documentElement.style.cursor = prev;
    };
  }, [cinema, cursorHidden]);

  if (!hasClips) {
    return (
      <div className={`relative overflow-hidden bg-black ${className}`}>
        <div className="flex aspect-video min-h-[18rem] items-center justify-center px-6 text-center">
          <p className="max-w-md text-sm font-light leading-relaxed text-zinc-400">
            {emptyLabel ?? "—"}
          </p>
        </div>
      </div>
    );
  }

  const seg = current;
  const showPortrait = seg?.kind === "breath_portrait";
  const showTitleCard = seg?.kind === "breath_title";
  const showCard = seg?.kind === "memory_card";
  const showClip = seg?.kind === "clip";
  const showBridge = seg?.kind === "act_bridge";
  const clip = showClip && seg.kind === "clip" ? seg.clip : null;
  const clipDur =
    showClip && seg.kind === "clip" ? Math.max(0.8, seg.end - seg.start) : 4;
  const kenMode: QuietLuxuryKenBurns =
    clip?.kenBurns ??
    (clip?.label?.toLowerCase().includes("portrait") ||
    clip?.label?.toLowerCase().includes("présence") ||
    clip?.label?.toLowerCase().includes("presence")
      ? "push"
      : "pull");

  const mediaFilterStyle: CSSProperties = cinema
    ? { filter: KODAK_35MM_FILTER }
    : {};

  const grainStyle: CSSProperties = cinema
    ? {
        backgroundImage: KODAK_GRAIN_SVG,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }
    : {
        backgroundImage: KODAK_GRAIN_SVG,
        opacity: 0.07,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      };

  const frameClass = cinema
    ? "relative h-full w-full bg-black"
    : "relative aspect-video w-full bg-black";

  return (
    <div
      ref={rootRef}
      className={`relative overflow-hidden bg-[#000000] ${cinema ? "h-full w-full rounded-none" : "rounded-2xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"} ${cursorHidden && cinema ? "cursor-none" : ""} ${className}`}
      onMouseMove={() => {
        bumpCursor();
      }}
      onClick={(e) => {
        if (!cinema) return;
        if ((e.target as HTMLElement).closest("[data-ql-audio-pill]")) return;
        toggle();
      }}
      onDoubleClick={() => {
        if (cinema) void toggleBrowserFullscreen();
      }}
    >
      {cinema ? <style>{CINEMA_STYLE}</style> : null}

      <div className={frameClass}>
        <div className="absolute inset-0">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              ...mediaFilterStyle,
              ...(showClip && clip?.kind === "video" && videoLayerOn
                ? cinema
                  ? {
                      animation: [
                        `ql-fade-in 0.4s ease-out both`,
                        `ql-fade-out 0.4s ease-in ${Math.max(0, clipDur - 0.4)}s forwards`,
                      ].join(", "),
                    }
                  : { opacity: 1 }
                : { opacity: 0 }),
            }}
            muted
            playsInline
            preload="auto"
            loop={false}
            aria-hidden
          />

          {showClip && clip?.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={clip.id}
              src={clip.url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover will-change-transform"
              style={{
                ...mediaFilterStyle,
                objectPosition:
                  clip.objectPosition ??
                  (kenMode === "push" ? "center 22%" : "center center"),
                ...(cinema
                  ? {
                      animation: [
                        `ql-fade-in 0.4s ease-out both`,
                        `${kenMode === "push" ? "ql-kb-push" : "ql-kb-pull"} ${clipDur}s linear forwards`,
                        `ql-fade-out 0.4s ease-in ${Math.max(0, clipDur - 0.4)}s forwards`,
                      ].join(", "),
                    }
                  : {
                      animationName:
                        kenMode === "push" ? "ql-kb-push" : "ql-kb-pull",
                      animationDuration: `${clipDur}s`,
                      animationTimingFunction: "linear",
                      animationFillMode: "forwards",
                    }),
              }}
              draggable={false}
            />
          ) : null}

          {showPortrait && openingPortraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key="opening-portrait"
              src={openingPortraitUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover will-change-transform"
              style={{
                ...mediaFilterStyle,
                objectPosition: "center 18%",
                animationName: "ql-portrait-reveal, ql-kb-push-soft",
                animationDuration: `${Math.max(0.8, (seg?.end ?? 0) - (seg?.start ?? 0))}s`,
                animationTimingFunction: "ease-out, linear",
                animationFillMode: "forwards",
              }}
              draggable={false}
            />
          ) : null}
        </div>

        {/* Kodak A24 — split-toning ivoire / ardoise */}
        {cinema ? (
          <div
            className="pointer-events-none absolute inset-0 z-[3]"
            style={{
              background:
                "linear-gradient(135deg, rgba(232, 220, 196, 0.16) 0%, rgba(20, 30, 36, 0.2) 100%)",
              mixBlendMode: "soft-light",
            }}
            aria-hidden
          />
        ) : null}

        {showTitleCard && memoryCard ? (
          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-black px-8 text-center">
            <div
              style={{
                animation: `ql-breath-title ${Math.max(0.8, (seg?.end ?? 0) - (seg?.start ?? 0))}s ease-in-out both`,
              }}
            >
              <p
                className="font-editorial text-[clamp(1.85rem,4.8vw,3.15rem)] font-medium tracking-[0.04em] text-zinc-100"
              >
                {memoryCard.displayName}
              </p>
              <p className="mt-5 text-[clamp(0.72rem,1.45vw,0.95rem)] font-light tracking-[0.42em] text-zinc-400">
                {memoryCard.yearsLine}
              </p>
            </div>
          </div>
        ) : null}

        {seg?.kind === "breath_black" ||
        seg?.kind === "end_black" ||
        seg?.kind === "clip_black" ? (
          <div className="absolute inset-0 z-[4] bg-black" aria-hidden />
        ) : null}

        {showBridge && seg.kind === "act_bridge" ? (
          <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black px-8 text-center">
            {seg.title ? (
              <p
                className="font-editorial max-w-3xl text-[clamp(1.05rem,2.6vw,1.65rem)] font-medium tracking-[0.18em] text-zinc-200/90"
                style={{
                  animation: `ql-bridge-title ${Math.max(0.8, seg.end - seg.start)}s ease-in-out both`,
                }}
              >
                {seg.title}
              </p>
            ) : null}
          </div>
        ) : null}

        {showCard && memoryCard ? (
          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-black px-6 text-center">
            <p className="font-editorial text-[clamp(1.75rem,4.5vw,3rem)] font-medium tracking-wide text-zinc-200">
              {memoryCard.displayName}
            </p>
            <p className="mt-5 text-[clamp(0.75rem,1.5vw,1rem)] font-light tracking-[0.42em] text-zinc-400">
              {memoryCard.yearsLine}
            </p>
          </div>
        ) : null}

        <div
          className="pointer-events-none absolute inset-0 z-[6]"
          style={grainStyle}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-[7]"
          style={{
            background: cinema
              ? "radial-gradient(ellipse 85% 75% at center, transparent 50%, rgba(0, 0, 0, 0.4) 80%, rgba(2, 2, 2, 0.85) 100%)"
              : "radial-gradient(ellipse 75% 70% at 50% 45%, transparent 40%, rgba(0,0,0,0.55) 100%)",
            pointerEvents: "none",
          }}
          aria-hidden
        />

        {salonBadge ? (
          <div
            className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2 text-center text-[10px] font-light tracking-[0.14em] text-zinc-200 transition-opacity duration-700 ease-in-out md:bottom-7 md:text-[11px]"
            style={{
              // Cinéma : visible uniquement pendant photos/vidéo actives — jamais sur cartons.
              opacity: cinema ? (showClip ? 0.2 : 0) : 0.85,
            }}
            aria-hidden={cinema ? !showClip : undefined}
          >
            {salonBadge}
          </div>
        ) : null}

        {audioNeedsGesture ? (
          <button
            type="button"
            data-ql-audio-pill
            onClick={(e) => {
              e.stopPropagation();
              void retryAudio();
            }}
            className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/20 bg-black/55 px-4 py-2 text-[11px] font-light tracking-wide text-zinc-200 backdrop-blur-md"
          >
            {copy.enableSound ??
              (copy.play === "Play"
                ? "Click to enable sound"
                : "Cliquez pour activer le son")}
          </button>
        ) : null}
      </div>

      {controlsVisible ? (
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

export const QUIET_LUXURY_END_BLACK_SEC = CINEMA_TIMING.endBlack;
export const QUIET_LUXURY_TEASER_END_BLACK_SEC = TEASER_TIMING.endBlack;
