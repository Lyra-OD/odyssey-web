"use client";

/**
 * C4 — Lecteur séance Quiet Luxury.
 * MP3 = master clock · dual image crossfade (cinéma) · N actes · noir fin ≥1 s → onPlaybackComplete.
 * Ken Burns photos : alternance pull (pair) / push (impair) · vidéos scale 1 fixe.
 * Variant `cinema` = présentation immersive (lab /stream) — teaser wizard inchangé.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Pause } from "lucide-react";

import {
  QuietLuxuryExitHub,
  type QuietLuxuryExitHubCopy,
  type QuietLuxuryViewerRole,
} from "@/src/components/tribute/QuietLuxuryExitHub";
import { getChapterTheme } from "@/src/lib/wizard/chapterTheme";
import { waitForAudioReady } from "@/src/lib/wizard/musicPreview";
import { VIDEO_TRIM_DURATION_SEC } from "@/src/lib/wizard/storyboardPacing";
import { editorialFont } from "@/src/lib/fonts";
import { cinematicTheme } from "@/src/lib/creatomate/cinematicTheme";

export type QuietLuxuryKenBurns = "push" | "pull";

export type QuietLuxuryClip = {
  id: string;
  kind: "image" | "video";
  url: string;
  durationSec: number;
  label?: string;
  /** Portrait → push (100→104). Paysage → pull (104→100). */
  kenBurns?: QuietLuxuryKenBurns;
  /** Cadrage visage / sujet (ex. "42% 28%"). */
  objectPosition?: string;
  /** Origine du zoom Ken Burns (ex. "42% 28%"). */
  transformOrigin?: string;
  /** Index chapitre — thème couleur crédit musical. */
  chapterIndex?: number;
  /** Début d’extrait vidéo (storyboard.videoTrims.trimStartSec). */
  trimStartSec?: number;
  /**
   * Vidéo avec piste sync pertinente (voix / ambiance) — unmute + duck le bed.
   * Absent / false → muted (comportement historique).
   */
  hasAudio?: boolean;
};

export type QuietLuxuryAct = {
  id: string;
  /** Titre de chapitre (jamais le titre de piste). */
  title?: string;
  /** Crédit musical teinté — sous le titre. */
  musicCredit?: string | null;
  chapterIndex?: number;
  audioUrl: string | null;
  clips: QuietLuxuryClip[];
  /**
   * Chapitre sans médias : durée du carton titre + écoute de la piste
   * (secondes). Absent → pont titre standard.
   */
  holdDurationSec?: number;
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
  /** Noir pur avant la carte mémoire (cinéma). Teaser = 0. */
  preMemoryBlack: number;
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
  preMemoryBlack: 0,
  memoryCard: 5.5,
  endBlack: 1.15,
  audioFade: 0.6,
};

const CINEMA_TIMING: Timing = {
  breathTitle: 1.5,
  breathBlack: 0.35,
  breathPortrait: 3.25,
  interBlack: 0.2,
  /** Carton titre + crédit — musique naît en fade pendant le pont. */
  actBridge: 2.3,
  /** Silence visuel avant la carte mémoire de fin (noir pur post deep-to-black). */
  preMemoryBlack: 0.8,
  memoryCard: 6.5,
  endBlack: 1.55,
  audioFade: 1.5,
};

/** Fade-in de la piste suivante sur le pont (cinéma radio). */
const BRIDGE_AUDIO_FADE_SEC = 1.1;

/**
 * Crossfade image→image (cinéma) — B + C léger.
 * Durée fixe (pas de % clip) ; pas de micro-noir entre deux photos.
 */
const IMAGE_CROSSFADE_SEC = 0.7;

/**
 * One Bed / Smart Ducking — canon `cinematicTheme.music`
 * (duckFromSync 18 % · attack 0.65 s · release 0.85 s).
 */
const DUCK_FLOOR = 0.18;
const DUCK_ATTACK_SEC = 0.65;
const DUCK_RELEASE_SEC = 0.85;

/** Fallbacks uniquement si durationSec manquant (le builder doit toujours poser le pacing). */
const DEFAULT_IMAGE_SEC = 7;
const DEFAULT_VIDEO_SEC = VIDEO_TRIM_DURATION_SEC;

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
      /** Surplus Breath Engine en fin de clip (s) — pilote light leak. */
      breathHoldSec?: number;
      /** Deep-to-black final (s) — après le hold, avant noir pur. */
      deepToBlackSec?: number;
    }
  | {
      kind: "clip_black";
      start: number;
      end: number;
      actAudioUrl: string | null;
      actAudioOffsetSec: number;
    }
  | { kind: "act_bridge"; start: number; end: number; title?: string; musicCredit?: string | null; chapterIndex?: number; actAudioUrl?: string | null }
  | { kind: "pre_memory_black"; start: number; end: number }
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
  /** C8 — hub post-noir (cinéma). Absent = fin → `onPlaybackComplete` only (craft preview). */
  exitHub?: {
    copy: QuietLuxuryExitHubCopy;
    viewerRole?: QuietLuxuryViewerRole;
    masterUnlocked?: boolean;
    onUnlockMaster: () => void | Promise<void>;
    onDownloadMaster?: () => void | Promise<void>;
    onGuestCopy?: () => void | Promise<void>;
    onSocialCut?: () => void | Promise<void>;
    onShareSession?: () => void;
    onUpgradePackage?: () => void;
    onLeaveLueur?: () => void;
    /** Fermer la projection (retour sas étape 6) — en plus de quitter le fullscreen. */
    onDismiss?: () => void;
  } | null;
  copy: QuietLuxuryPlayerCopy;
  className?: string;
  emptyLabel?: string;
};

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Gain bed sous sync vidéo — pure / master-time.
 * `1` = plein lit · `DUCK_FLOOR` = ducké. Attack / release aux bords du clip.
 */
function duckGainForTime(segments: Segment[], timeSec: number): number {
  const seg = segmentAt(segments, timeSec);
  if (!seg || seg.kind !== "clip") return 1;
  if (seg.clip.kind !== "video" || !seg.clip.hasAudio) return 1;

  const dur = Math.max(0, seg.end - seg.start);
  if (dur <= 0) return 1;

  let attack = DUCK_ATTACK_SEC;
  let release = DUCK_RELEASE_SEC;
  if (dur < attack + release) {
    const scale = dur / (attack + release);
    attack *= scale;
    release *= scale;
  }

  const into = timeSec - seg.start;
  const left = seg.end - timeSec;

  if (attack > 0 && into < attack) {
    return lerp(1, DUCK_FLOOR, into / attack);
  }
  if (release > 0 && left < release) {
    return lerp(DUCK_FLOOR, 1, 1 - left / release);
  }
  return DUCK_FLOOR;
}

/**
 * Fenêtre master-time d’un light leak (null = off).
 * Portrait d’ouverture entier · ou hold Breath (hors deep-to-black).
 */
function lightLeakWindow(
  seg: Segment | null,
): { start: number; end: number } | null {
  if (!seg) return null;
  if (seg.kind === "breath_portrait") {
    return { start: seg.start, end: seg.end };
  }
  if (seg.kind === "clip" && seg.clip.kind === "image" && seg.breathHoldSec) {
    const deep = Math.max(0, seg.deepToBlackSec ?? 0);
    const hold = Math.min(
      seg.breathHoldSec,
      Math.max(0, seg.end - seg.start - deep),
    );
    if (hold <= 0) return null;
    const end = seg.end - deep;
    return { start: end - hold, end };
  }
  return null;
}

/** Fenêtre deep-to-black (queue finale du dernier clip image). */
function deepToBlackWindow(
  seg: Segment | null,
): { start: number; end: number } | null {
  if (!seg || seg.kind !== "clip" || !seg.deepToBlackSec) return null;
  const deep = Math.min(seg.deepToBlackSec, Math.max(0, seg.end - seg.start));
  if (deep <= 0) return null;
  return { start: seg.end - deep, end: seg.end };
}

/**
 * Opacité média pendant deep-to-black (1 → 0, ease cosine).
 * Hors fenêtre : 1.
 */
function deepToBlackMediaOpacity(
  seg: Segment | null,
  timeSec: number,
): number {
  const win = deepToBlackWindow(seg);
  if (!win) return 1;
  if (timeSec <= win.start) return 1;
  if (timeSec >= win.end) return 0;
  const u = (timeSec - win.start) / (win.end - win.start);
  return 1 - (0.5 - 0.5 * Math.cos(Math.PI * clamp(u, 0, 1)));
}

/** Enveloppe attack → peak → release (déterministe / master-time). */
function lightLeakOpacityAt(
  seg: Segment | null,
  timeSec: number,
): number {
  const win = lightLeakWindow(seg);
  if (!win) return 0;
  const leak = cinematicTheme.lightLeak;
  const dur = win.end - win.start;
  if (dur <= 0 || timeSec < win.start || timeSec > win.end) return 0;

  let attack = leak.fadeInSec;
  let release = leak.fadeOutSec;
  if (dur < attack + release) {
    const scale = dur / (attack + release);
    attack *= scale;
    release *= scale;
  }

  const into = timeSec - win.start;
  const left = win.end - timeSec;
  let gain = 1;
  if (attack > 0 && into < attack) gain = into / attack;
  else if (release > 0 && left < release) gain = left / release;
  return leak.peakOpacity * clamp(gain, 0, 1);
}

/** Prochain clip média après `from` (ignore clip_black). Pont / fin → null. */
function nextClipAfter(
  segments: Segment[],
  from: Extract<Segment, { kind: "clip" }>,
): Extract<Segment, { kind: "clip" }> | null {
  let seen = false;
  for (const s of segments) {
    if (
      s.kind === "clip" &&
      s.actIndex === from.actIndex &&
      s.clipIndex === from.clipIndex
    ) {
      seen = true;
      continue;
    }
    if (!seen) continue;
    if (
      s.kind === "act_bridge" ||
      s.kind === "pre_memory_black" ||
      s.kind === "memory_card" ||
      s.kind === "end_black"
    ) {
      return null;
    }
    if (s.kind === "clip") return s;
  }
  return null;
}

type ImageLayerSnap = {
  clipId: string;
  url: string;
  fit: "cover" | "contain";
  objectPosition: string;
  transformOrigin: string;
};

type OutgoingImageLayer = ImageLayerSnap & {
  token: number;
  /** Master time when crossfade began (incoming clip start). */
  fadeStartMaster: number;
};

function sameMediaUrl(a: string | null, b: string | null): boolean {
  if (!a || !b) return a === b;
  if (a === b) return true;
  try {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://local";
    const ua = new URL(a, origin);
    const ub = new URL(b, origin);
    // Proxy Stingray : même pathname, le trackId est dans la query.
    if (
      ua.pathname === ub.pathname &&
      ua.pathname.includes("/api/music/preview")
    ) {
      return ua.searchParams.get("trackId") === ub.searchParams.get("trackId");
    }
    // Signed storage : le token change, le pathname suffit.
    return ua.pathname === ub.pathname;
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
  const breath = cinematicTheme.breath;
  /** Ouverture portrait = hold #1 (cinéma). */
  let breathsUsed = cinema && hasPortrait ? 1 : 0;

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
  const lastActIndex = acts.length - 1;

  acts.forEach((act, actIndex) => {
    // Cinéma : carton titre avant CHAQUE chapitre (y compris le 1er).
    // Teaser non-cinéma : pont seulement entre chapitres (comportement historique).
    const showActTitle = cinema || actIndex > 0;
    const emptyHoldSec =
      act.clips.length === 0
        ? Math.min(
            12,
            Math.max(timing.actBridge, act.holdDurationSec ?? 8),
          )
        : timing.actBridge;
    // Chapitre sans médias : toujours un carton (+ musique) ; sinon pont titre classique.
    const bridgeDur =
      act.clips.length === 0
        ? emptyHoldSec
        : showActTitle
          ? timing.actBridge
          : 0;

    if (bridgeDur > 0) {
      segments.push({
        kind: "act_bridge",
        start: t,
        end: t + bridgeDur,
        title: act.title,
        musicCredit: act.musicCredit,
        chapterIndex: act.chapterIndex ?? actIndex,
        actAudioUrl: act.audioUrl,
      });
      t += bridgeDur;
    }

    // Cinéma : piste 1 dès t=0 (offset = ouverture [+ pont titre chap. 1]).
    // Chapitres suivants : la piste a déjà couru pendant le pont → offset = durée du pont.
    let audioCursor =
      actIndex === 0 && cinema
        ? openingDur + bridgeDur
        : bridgeDur;
    /** Dernière image du chapitre (ignore les vidéos en queue) — cible Breath. */
    let lastImageIndex = -1;
    for (let i = act.clips.length - 1; i >= 0; i--) {
      if (act.clips[i]?.kind === "image") {
        lastImageIndex = i;
        break;
      }
    }
    act.clips.forEach((clip, clipIndex) => {
      const prevClip = clipIndex > 0 ? act.clips[clipIndex - 1] : null;
      /** Image→image : crossfade (pas de flash noir). */
      const skipInterBlack =
        prevClip?.kind === "image" && clip.kind === "image";
      if (clipIndex > 0 && timing.interBlack > 0 && !skipInterBlack) {
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
      let dur = Math.max(
        0.8,
        clip.durationSec ||
          (clip.kind === "video" ? DEFAULT_VIDEO_SEC : DEFAULT_IMAGE_SEC),
      );
      /** Surplus Breath posé sur ce clip (pilote light leak). */
      let breathHoldSec: number | undefined;
      /** Deep-to-black finale (après hold, film only). */
      let deepToBlackSec: number | undefined;
      /**
       * Breath Engine — allonge la dernière *image* du chapitre / du film
       * (même si une vidéo suit). Skip pur-vidéo · max holds · cinéma.
       */
      if (
        cinema &&
        clip.kind === "image" &&
        clipIndex === lastImageIndex &&
        breathsUsed < breath.maxMajorBreathsPerFilm
      ) {
        const isLastAct = actIndex === lastActIndex;
        const holdSec = isLastAct
          ? breath.finaleHoldSec
          : breath.chapterEndHoldSec;
        if (holdSec > 0) {
          dur += holdSec;
          breathHoldSec = holdSec;
          breathsUsed += 1;
        }
        if (isLastAct && breath.finaleDeepToBlackSec > 0) {
          dur += breath.finaleDeepToBlackSec;
          deepToBlackSec = breath.finaleDeepToBlackSec;
        }
      }
      segments.push({
        kind: "clip",
        start: t,
        end: t + dur,
        actIndex,
        clipIndex,
        clip,
        actAudioUrl: act.audioUrl,
        actAudioOffsetSec: audioCursor,
        ...(breathHoldSec != null ? { breathHoldSec } : {}),
        ...(deepToBlackSec != null ? { deepToBlackSec } : {}),
      });
      t += dur;
      audioCursor += dur;
    });
  });

  if (hasMemoryCard) {
    if (timing.preMemoryBlack > 0) {
      segments.push({
        kind: "pre_memory_black",
        start: t,
        end: t + timing.preMemoryBlack,
      });
      t += timing.preMemoryBlack;
    }
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

export function isNativeFullscreen(): boolean {
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
  to { transform: scale(1.09); }
}
@keyframes ql-kb-pull {
  from { transform: scale(1.09); }
  to { transform: scale(1); }
}
@keyframes ql-kb-push-soft {
  from { transform: scale(1); }
  to { transform: scale(1.06); }
}
@keyframes ql-kb-pull-soft {
  from { transform: scale(1.06); }
  to { transform: scale(1); }
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
@keyframes ql-leak-drift {
  0% { transform: translate3d(0, 0, 0) scale(1); }
  100% { transform: translate3d(-2.5%, 1.5%, 0) scale(1.04); }
}
/** Carte mémoire de fin — naît du silence, hold long, fade-out lent. */
@keyframes ql-memory-card-out {
  0% { opacity: 0; }
  18% { opacity: 1; }
  62% { opacity: 1; }
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
@keyframes ql-pause-flash {
  0% { opacity: 0; transform: scale(0.92); }
  18% { opacity: 0.9; transform: scale(1); }
  100% { opacity: 0; transform: scale(1); }
}
`;

/** Alternance cinématographique : pair = pull-out, impair = push-in (photos only). */
function kenBurnsForImageIndex(imageIndex: number): QuietLuxuryKenBurns {
  return imageIndex % 2 === 0 ? "pull" : "push";
}

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
  exitHub = null,
  copy,
  className = "",
  emptyLabel,
}: QuietLuxuryPlayerProps) {
  const timing = cinema ? CINEMA_TIMING : TEASER_TIMING;
  const controlsVisible = cinema ? false : showControls;
  /** Médias ou chapitre musique-seule (carton + piste). */
  const hasClips = acts.some(
    (a) =>
      a.clips.length > 0 ||
      Boolean(a.audioUrl) ||
      (a.holdDurationSec != null && a.holdDurationSec > 0),
  );

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

  /** Index photo global dans le flux (vidéos exclues) → Push/Pull. */
  const kenBurnsByClipId = useMemo(() => {
    const map = new Map<string, QuietLuxuryKenBurns>();
    let imageIndex = 0;
    for (const act of acts) {
      for (const c of act.clips) {
        if (c.kind !== "image") continue;
        map.set(
          c.id,
          c.kenBurns ?? kenBurnsForImageIndex(imageIndex),
        );
        imageIndex += 1;
      }
    }
    return map;
  }, [acts]);

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
  /** Invalide les ensureAudio async en cours (switch chapitre / unmount). */
  const audioGenRef = useRef(0);
  const masterTimeRef = useRef(0);
  const lastUiAtRef = useRef(0);
  const lastSegKeyRef = useRef("");
  const cursorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ownsAudioRef = useRef(false);

  const firstActAudioUrl = acts[0]?.audioUrl ?? null;
  /** Fin de l’ouverture (breaths) — avant le 1er carton / clip. */
  const openingDurSec = useMemo(() => {
    let end = 0;
    for (const s of segments) {
      if (
        s.kind === "breath_title" ||
        s.kind === "breath_black" ||
        s.kind === "breath_portrait"
      ) {
        end = Math.max(end, s.end);
        continue;
      }
      break;
    }
    return end;
  }, [segments]);
  /** Début du 1er clip (ouverture + éventuel carton chap.1). */
  const openingEndSec = useMemo(() => {
    const firstClip = segments.find((s) => s.kind === "clip");
    return firstClip?.start ?? 0;
  }, [segments]);
  const firstBridgeSeg = useMemo(
    () => segments.find((s) => s.kind === "act_bridge") ?? null,
    [segments],
  );

  const [isPlaying, setIsPlaying] = useState(false);
  const [masterTime, setMasterTime] = useState(0);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [audioNeedsGesture, setAudioNeedsGesture] = useState(false);
  const [videoLayerOn, setVideoLayerOn] = useState(false);
  const [showExitHub, setShowExitHub] = useState(false);
  const [pauseFlashKey, setPauseFlashKey] = useState(0);
  /** Portrait → contain (pillarbox). Paysage → cover. */
  const [fitByClipId, setFitByClipId] = useState<
    Record<string, "cover" | "contain">
  >({});
  const [openingPortraitFit, setOpeningPortraitFit] = useState<
    "cover" | "contain"
  >("contain");
  /** Couche sortante — crossfade image→image cinéma. */
  const [outgoingImage, setOutgoingImage] = useState<OutgoingImageLayer | null>(
    null,
  );
  const heldImageRef = useRef<ImageLayerSnap | null>(null);
  const outgoingTokenRef = useRef(0);
  const outgoingImageRef = useRef<OutgoingImageLayer | null>(null);
  const kenImgRef = useRef<HTMLImageElement | null>(null);
  outgoingImageRef.current = outgoingImage;

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
      if (
        seg.kind === "memory_card" ||
        seg.kind === "pre_memory_black" ||
        seg.kind === "end_black"
      ) {
        return 0;
      }

      const fade = timing.audioFade;

      // Pont : nouvelle piste en fade-in (plus de silence mort).
      // Cinéma carton chap.1 : même piste que l’ouverture → pas de re-fade / seek 0.
      if (seg.kind === "act_bridge") {
        if (!seg.actAudioUrl) return 0;
        if (cinema && firstBridgeSeg && seg.start === firstBridgeSeg.start) {
          return 1 * duckGainForTime(segments, timeSec);
        }
        const intoBridge = timeSec - seg.start;
        const bridgeFade = Math.min(
          BRIDGE_AUDIO_FADE_SEC,
          Math.max(0.4, timing.actBridge * 0.5),
        );
        return (
          clamp(intoBridge / bridgeFade, 0, 1) *
          duckGainForTime(segments, timeSec)
        );
      }

      // Cinéma : musique dès t=0 dans le noir (fade-in), avant le nom.
      if (
        cinema &&
        firstActAudioUrl &&
        timeSec < openingEndSec &&
        (seg.kind === "breath_title" ||
          seg.kind === "breath_black" ||
          seg.kind === "breath_portrait")
      ) {
        return (
          clamp(timeSec / Math.max(fade, 0.01), 0, 1) *
          duckGainForTime(segments, timeSec)
        );
      }

      // Micro-noir entre clips : audio continue (pas de trou musical).
      if (seg.kind === "clip_black" && seg.actAudioUrl) {
        return 1 * duckGainForTime(segments, timeSec);
      }

      if (seg.kind !== "clip" || !seg.actAudioUrl) return 0;

      const intoClip = timeSec - seg.start;
      const leftInClip = seg.end - timeSec;

      let vol = 1;
      // Fade-in entrée de piste uniquement si offset ~0 (pas après un pont déjà fondu).
      if (seg.actAudioOffsetSec < 0.05 && intoClip < fade) {
        vol = Math.min(vol, intoClip / fade);
      }
      const next = segments.find((s) => s.start >= seg.end - 0.001);
      if (
        next &&
        (next.kind === "act_bridge" ||
          next.kind === "pre_memory_black" ||
          next.kind === "memory_card" ||
          next.kind === "end_black") &&
        leftInClip < fade
      ) {
        vol = Math.min(vol, leftInClip / fade);
      }
      return clamp(vol, 0, 1) * duckGainForTime(segments, timeSec);
    },
    [
      cinema,
      firstActAudioUrl,
      firstBridgeSeg,
      openingEndSec,
      segments,
      timing.actBridge,
      timing.audioFade,
    ],
  );

  const ensureAudio = useCallback(
    async (url: string | null, seekSec: number, volume: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      if (!url) {
        audioGenRef.current += 1;
        try {
          audio.pause();
        } catch {
          /* */
        }
        audio.volume = 0;
        return;
      }
      const switched = !sameMediaUrl(audioActUrlRef.current, url);
      const gen = switched ? ++audioGenRef.current : audioGenRef.current;
      if (switched) {
        if (process.env.NODE_ENV === "development") {
          console.info("[ql-audio] src switch", {
            from: audioActUrlRef.current,
            to: url,
            seekSec,
          });
        }
        // Coupe l’ancien flux avant de changer de src (évite double piste).
        try {
          audio.pause();
        } catch {
          /* */
        }
        audio.volume = 0;
        audio.src = url;
        audioActUrlRef.current = url;
        try {
          audio.load();
        } catch (err) {
          console.warn("[ql-audio] load() failed", { url, err });
        }
        audio.addEventListener(
          "error",
          () => {
            console.warn("[ql-audio] media error after src change", {
              url,
              code: audio.error?.code,
              message: audio.error?.message,
            });
          },
          { once: true },
        );
        try {
          await Promise.race([
            waitForAudioReady(audio),
            new Promise<never>((_, reject) => {
              window.setTimeout(
                () => reject(new Error("audio_ready_timeout")),
                8000,
              );
            }),
          ]);
        } catch (err) {
          console.warn("[ql-audio] waitForAudioReady failed", { url, err });
          if (gen !== audioGenRef.current) return;
          if (playingRef.current) setAudioNeedsGesture(true);
          return;
        }
        if (gen !== audioGenRef.current) return;
      }
      if (switched && gen !== audioGenRef.current) return;
      audio.volume = clamp(volume, 0, 1);
      try {
        if (
          Number.isFinite(audio.currentTime) &&
          Math.abs(audio.currentTime - seekSec) > 0.75
        ) {
          audio.currentTime = Math.max(0, seekSec);
        }
        if (playingRef.current) {
          if (audio.paused) {
            await audio.play();
            if (switched && gen !== audioGenRef.current) {
              try {
                audio.pause();
              } catch {
                /* */
              }
              audio.volume = 0;
              return;
            }
            if (process.env.NODE_ENV === "development" && switched) {
              console.info("[ql-audio] play() ok after switch", { url });
            }
          }
          setAudioNeedsGesture(false);
        }
      } catch (err) {
        if (switched && gen !== audioGenRef.current) return;
        console.warn("[ql-audio] play() rejected", { url, err });
        if (playingRef.current) setAudioNeedsGesture(true);
      }
    },
    [],
  );

  const ensureVideo = useCallback(
    async (
      url: string,
      localTimeSec: number,
      trimStartSec = 0,
      hasAudio = false,
    ) => {
      const el = videoRef.current;
      if (!el) return;
      // Visibilité immédiate (DOM) — indépendante d'un re-render React.
      el.muted = !hasAudio;
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
      const target = Math.max(0, trimStartSec + localTimeSec);
      try {
        if (Math.abs(el.currentTime - target) > 0.55) {
          el.currentTime = target;
        }
        if (playingRef.current) await el.play();
      } catch {
        /* */
      }
    },
    [],
  );

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
        if (seg.actAudioUrl) {
          const intoBridge = timeSec - seg.start;
          // Carton chap.1 cinéma : continuité t=0 (ouverture déjà jouée).
          const isCinemaFirstBridge =
            cinema &&
            firstBridgeSeg != null &&
            seg.start === firstBridgeSeg.start;
          const localAudio = isCinemaFirstBridge
            ? openingDurSec + intoBridge
            : intoBridge;
          void ensureAudio(seg.actAudioUrl, localAudio, volume);
        } else if (audioRef.current) {
          audioRef.current.volume = 0;
          if (process.env.NODE_ENV === "development") {
            console.warn("[ql-audio] act_bridge sans actAudioUrl", {
              title: seg.title,
              chapterIndex: seg.chapterIndex,
            });
          }
        }
      } else {
        if (audioRef.current) audioRef.current.volume = 0;
      }

      if (seg.kind === "clip" && seg.clip.kind === "video") {
        void ensureVideo(
          seg.clip.url,
          timeSec - seg.start,
          seg.clip.trimStartSec ?? 0,
          Boolean(seg.clip.hasAudio),
        );
      } else {
        hideVideo();
      }
    },
    [
      cinema,
      ensureAudio,
      ensureVideo,
      firstActAudioUrl,
      firstBridgeSeg,
      hideVideo,
      openingDurSec,
      segments,
      targetVolumeForTime,
    ],
  );

  const publishUiTime = useCallback(
    (t: number) => {
      const seg = segmentAt(segments, t);
      const key = segmentKey(seg);
      if (cinema) {
        /**
         * 30 fps pendant fades image **ou** fenêtres light leak
         * (enveloppe attack/peak/release). Hors : update au changement de segment.
         */
        const outgoingActive = outgoingImageRef.current != null;
        const inImageFade =
          outgoingActive ||
          (seg?.kind === "clip" &&
            seg.clip.kind === "image" &&
            (t - seg.start <= IMAGE_CROSSFADE_SEC + 0.05 ||
              seg.end - t <= 0.45));
        const leakWin = lightLeakWindow(seg);
        const inLeak =
          leakWin != null &&
          t >= leakWin.start - 0.02 &&
          t <= leakWin.end + 0.02;
        const deepWin = deepToBlackWindow(seg);
        const inDeep =
          deepWin != null &&
          t >= deepWin.start - 0.02 &&
          t <= deepWin.end + 0.02;
        if (inImageFade || inLeak || inDeep) {
          if (
            t - lastUiAtRef.current >= 1 / 30 ||
            key !== lastSegKeyRef.current
          ) {
            lastUiAtRef.current = t;
            lastSegKeyRef.current = key;
            setMasterTime(t);
          }
        } else if (key !== lastSegKeyRef.current) {
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
        // Hub C8 seulement si fourni ; sinon le parent ferme via onPlaybackComplete
        // (craft preview étape 5 — éviter un noir mort sans CTA).
        if (cinema && exitHub) setShowExitHub(true);
        onPlaybackComplete?.();
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [
    cancelRaf,
    cinema,
    durationSec,
    exitHub,
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
    setPauseFlashKey((k) => k + 1);
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

  const replaySession = useCallback(() => {
    // Remet t=0, relance l'horloge MP3, masque le hub — fullscreen inchangé.
    setShowExitHub(false);
    setAudioNeedsGesture(false);
    hideVideo();
    completedRef.current = false;
    pauseAccumRef.current = 0;
    pauseStartedRef.current = null;
    masterTimeRef.current = 0;
    setMasterTime(0);
    lastSegKeyRef.current = "";
    lastUiAtRef.current = 0;
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 0;
      } catch {
        /* */
      }
    }
    startClock();
  }, [hideVideo, startClock]);

  useEffect(() => {
    audioGenRef.current += 1;
    if (primedAudio) {
      ownsAudioRef.current = false;
      // Singleton wizard : pause jusqu’à ce que le clock appelle ensureAudio.
      try {
        primedAudio.pause();
      } catch {
        /* */
      }
      primedAudio.volume = 0;
      audioRef.current = primedAudio;
      audioActUrlRef.current = primedAudio.src || null;
      return () => {
        audioGenRef.current += 1;
        playingRef.current = false;
        cancelRaf();
        try {
          primedAudio.pause();
        } catch {
          /* */
        }
        primedAudio.volume = 0;
        audioRef.current = null;
      };
    }
    ownsAudioRef.current = true;
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    audioActUrlRef.current = null;
    return () => {
      audioGenRef.current += 1;
      playingRef.current = false;
      cancelRaf();
      try {
        audio.pause();
      } catch {
        /* */
      }
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
      if (showExitHub) {
        if (e.key === "f" || e.key === "F") {
          e.preventDefault();
          void toggleBrowserFullscreen();
        }
        return;
      }
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
  }, [bumpCursor, cinema, showExitHub, toggle, toggleBrowserFullscreen]);

  useEffect(() => {
    if (!cinema) return;
    const prev = document.documentElement.style.cursor;
    document.documentElement.style.cursor =
      cursorHidden && !showExitHub ? "none" : "";
    return () => {
      document.documentElement.style.cursor = prev;
    };
  }, [cinema, cursorHidden, showExitHub]);

  /** Clip image courant (hooks avant early return). */
  const liveImageClip =
    current?.kind === "clip" && current.clip.kind === "image"
      ? current.clip
      : null;
  const liveImageFit: "cover" | "contain" = liveImageClip
    ? (fitByClipId[liveImageClip.id] ?? "contain")
    : "contain";
  const liveImageContain = liveImageFit === "contain";
  const liveImageSnap: ImageLayerSnap | null =
    cinema && liveImageClip
      ? {
          clipId: liveImageClip.id,
          url: liveImageClip.url,
          fit: liveImageFit,
          objectPosition: liveImageContain
            ? "center center"
            : liveImageClip.objectPosition ??
              "center center",
          transformOrigin: liveImageContain
            ? "center center"
            : liveImageClip.transformOrigin ??
              liveImageClip.objectPosition ??
              "center center",
        }
      : null;

  useLayoutEffect(() => {
    if (!liveImageSnap) {
      heldImageRef.current = null;
      setOutgoingImage(null);
      return;
    }
    const held = heldImageRef.current;
    if (held && held.clipId !== liveImageSnap.clipId) {
      const token = ++outgoingTokenRef.current;
      setOutgoingImage({
        ...held,
        token,
        fadeStartMaster: masterTimeRef.current,
      });
      heldImageRef.current = liveImageSnap;
      const clearAt = window.setTimeout(() => {
        setOutgoingImage((cur) => (cur?.token === token ? null : cur));
      }, IMAGE_CROSSFADE_SEC * 1000 + 120);
      return () => clearTimeout(clearAt);
    }
    heldImageRef.current = liveImageSnap;
  }, [liveImageSnap?.clipId, liveImageSnap?.url]);

  /** Précharge toutes les photos — évite trou noir si decode tardif au crossfade. */
  useEffect(() => {
    if (!cinema) return;
    const urls: string[] = [];
    for (const act of acts) {
      for (const c of act.clips) {
        if (c.kind === "image" && c.url) urls.push(c.url);
      }
    }
    const loaders = urls.map((url) => {
      const img = new window.Image();
      img.decoding = "async";
      img.src = url;
      return img;
    });
    return () => {
      for (const img of loaders) {
        img.src = "";
      }
    };
  }, [acts, cinema]);

  /**
   * KB posé une fois par clip via DOM — les re-renders fade (30 fps) ne doivent
   * PAS réécrire style.animation (sinon le zoom repart de zéro).
   * Soft si pas de focale (micro-respiration) ou portrait contain.
   */
  const liveKenFit = liveImageClip
    ? (fitByClipId[liveImageClip.id] ?? "contain")
    : "contain";
  const liveHasFocal = Boolean(
    liveImageClip?.objectPosition?.trim() ||
      liveImageClip?.transformOrigin?.trim(),
  );
  useLayoutEffect(() => {
    const el = kenImgRef.current;
    if (!el || !cinema || !liveImageClip) return;
    const contain = liveKenFit === "contain";
    const mode =
      kenBurnsByClipId.get(liveImageClip.id) ?? kenBurnsForImageIndex(0);
    const useSoftKen = !liveHasFocal || contain;
    const name = useSoftKen
      ? mode === "push"
        ? "ql-kb-push-soft"
        : "ql-kb-pull-soft"
      : mode === "push"
        ? "ql-kb-push"
        : "ql-kb-pull";
    const dur = Math.max(
      0.8,
      liveImageClip.durationSec || DEFAULT_IMAGE_SEC,
    );
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = `${name} ${dur}s linear forwards`;
    el.style.animationPlayState = playingRef.current ? "running" : "paused";
  }, [
    cinema,
    liveImageClip?.id,
    liveImageClip?.durationSec,
    liveKenFit,
    liveHasFocal,
    kenBurnsByClipId,
  ]);

  useEffect(() => {
    const el = kenImgRef.current;
    if (!el) return;
    el.style.animationPlayState = isPlaying ? "running" : "paused";
  }, [isPlaying]);

  // Garde le snap à jour (fit onLoad) sans retrigger le crossfade.
  if (
    liveImageSnap &&
    heldImageRef.current &&
    heldImageRef.current.clipId === liveImageSnap.clipId
  ) {
    heldImageRef.current = liveImageSnap;
  }

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
  const clipFit: "cover" | "contain" =
    clip != null ? (fitByClipId[clip.id] ?? "contain") : "contain";
  /** Portrait contain : cadre centré + KB doux. Paysage cover : focale + KB plein. */
  const containSafe = clipFit === "contain";
  const kenMode: QuietLuxuryKenBurns | null =
    clip?.kind === "image"
      ? (kenBurnsByClipId.get(clip.id) ??
        kenBurnsForImageIndex(0))
      : null;
  /** V1.5 Smart KB : focale = objectPosition ou transformOrigin non vide. */
  const hasFocal = Boolean(
    clip?.objectPosition?.trim() || clip?.transformOrigin?.trim(),
  );
  const focalAnchor =
    clip?.objectPosition?.trim() ||
    clip?.transformOrigin?.trim() ||
    "center center";
  /** Soft sans focale (micro-respiration cover) OU portrait contain. */
  const useSoftKen = !hasFocal || containSafe;
  const kenAnimName =
    kenMode == null
      ? null
      : useSoftKen
        ? kenMode === "push"
          ? "ql-kb-push-soft"
          : "ql-kb-pull-soft"
        : kenMode === "push"
          ? "ql-kb-push"
          : "ql-kb-pull";
  /**
   * Portrait contain : toujours centré (la focale C5 ne doit pas décadrer
   * un `object-contain`). Focale = cover paysage seulement.
   */
  const clipObjectPosition = containSafe
    ? "center center"
    : hasFocal
      ? focalAnchor
      : "center center";
  const clipTransformOrigin = containSafe
    ? "center center"
    : hasFocal
      ? clip?.transformOrigin?.trim() ||
        clip?.objectPosition?.trim() ||
        "center center"
      : "center center";

  const crossfadeToNextImage =
    cinema &&
    showClip &&
    seg?.kind === "clip" &&
    clip?.kind === "image" &&
    nextClipAfter(segments, seg)?.clip.kind === "image";

  /** Opacité pilotée par l’horloge master — pas de CSS fade (reset onLoad). */
  const imageFadeProgress =
    cinema && showClip && seg?.kind === "clip" && clip?.kind === "image"
      ? clamp(
          (masterTime - seg.start) / IMAGE_CROSSFADE_SEC,
          0,
          1,
        )
      : 1;
  const imageEndFade =
    cinema &&
    showClip &&
    seg?.kind === "clip" &&
    clip?.kind === "image" &&
    !crossfadeToNextImage
      ? clamp((seg.end - masterTime) / 0.4, 0, 1)
      : 1;
  const incomingImageOpacity = imageFadeProgress * imageEndFade;
  const outgoingImageOpacity =
    outgoingImage != null
      ? clamp(
          1 -
            (masterTime - outgoingImage.fadeStartMaster) /
              IMAGE_CROSSFADE_SEC,
          0,
          1,
        )
      : 0;

  const animPlayState: CSSProperties["animationPlayState"] = isPlaying
    ? "running"
    : "paused";

  const lightLeakWin = cinema ? lightLeakWindow(seg) : null;
  const lightLeakOpacity = cinema
    ? lightLeakOpacityAt(seg, masterTime)
    : 0;
  const lightLeakDriftSec = lightLeakWin
    ? Math.max(2.4, lightLeakWin.end - lightLeakWin.start)
    : 2.4;
  const deepMediaOpacity = cinema
    ? deepToBlackMediaOpacity(seg, masterTime)
    : 1;

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

  const bridgeTheme =
    showBridge && seg?.kind === "act_bridge"
      ? getChapterTheme(seg.chapterIndex ?? 0)
      : null;
  const clipAct =
    showClip && seg?.kind === "clip" ? acts[seg.actIndex] : null;
  const liveCreditTheme = clipAct
    ? getChapterTheme(
        clipAct.chapterIndex ??
          (seg?.kind === "clip" ? seg.actIndex : 0),
      )
    : null;
  const themedCreditColor = (theme: ReturnType<typeof getChapterTheme> | null) =>
    theme ? `rgba(${theme.glowRgb}, 0.92)` : null;
  const bridgeCreditColor = themedCreditColor(bridgeTheme);
  const liveCreditColor = themedCreditColor(liveCreditTheme);

  return (
    <div
      ref={rootRef}
      className={`relative overflow-hidden bg-[#000000] ${cinema ? "h-full w-full rounded-none" : "rounded-2xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"} ${cursorHidden && cinema && !showExitHub ? "cursor-none" : ""} ${className}`}
      onMouseMove={() => {
        bumpCursor();
      }}
      onClick={(e) => {
        if (!cinema) return;
        if (showExitHub) return;
        if ((e.target as HTMLElement).closest("[data-ql-audio-pill]")) return;
        toggle();
      }}
      onDoubleClick={() => {
        if (cinema) void toggleBrowserFullscreen();
      }}
    >
      {/* Keyframes KB / fades — cinéma et teaser. */}
      <style>{CINEMA_STYLE}</style>

      <div className={frameClass}>
        <div
          className="absolute inset-0 bg-[#000000]"
          style={
            cinema && deepMediaOpacity < 0.999
              ? { opacity: deepMediaOpacity }
              : undefined
          }
        >
          <video
            ref={videoRef}
            className={`absolute inset-0 h-full w-full will-change-transform ${
              clipFit === "contain" ? "object-contain" : "object-cover"
            }`}
              style={{
                ...mediaFilterStyle,
                objectPosition:
                  clip?.kind === "video" ? clipObjectPosition : undefined,
                transformOrigin:
                  clip?.kind === "video" ? clipTransformOrigin : undefined,
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
                animationPlayState: animPlayState,
              }}
            muted={!clip?.hasAudio}
            playsInline
            preload="auto"
            loop={false}
            aria-hidden
            onLoadedMetadata={(e) => {
              if (!clip || clip.kind !== "video") return;
              const v = e.currentTarget;
              const nextFit =
                v.videoHeight > v.videoWidth ? "contain" : "cover";
              setFitByClipId((prev) =>
                prev[clip.id] === nextFit
                  ? prev
                  : { ...prev, [clip.id]: nextFit },
              );
            }}
          />

          {cinema && outgoingImage && outgoingImageOpacity > 0.001 ? (
            <div
              key={`out-${outgoingImage.token}`}
              className="absolute inset-0 z-[1]"
              style={{ opacity: outgoingImageOpacity }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={outgoingImage.url}
                alt=""
                className={`absolute inset-0 h-full w-full ${
                  outgoingImage.fit === "contain"
                    ? "object-contain"
                    : "object-cover"
                }`}
                style={{
                  ...mediaFilterStyle,
                  objectPosition: outgoingImage.objectPosition,
                  transformOrigin: outgoingImage.transformOrigin,
                }}
                draggable={false}
              />
            </div>
          ) : null}

          {showClip && clip?.kind === "image" && kenMode && kenAnimName ? (
            cinema ? (
              <div
                key={`in-wrap-${clip.id}:${clip.url.slice(-48)}`}
                className="absolute inset-0 z-[2]"
                style={{ opacity: incomingImageOpacity }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={kenImgRef}
                  src={clip.url}
                  alt=""
                  className={`absolute inset-0 h-full w-full will-change-transform ${
                    clipFit === "contain" ? "object-contain" : "object-cover"
                  }`}
                  style={{
                    ...mediaFilterStyle,
                    objectPosition: clipObjectPosition,
                    transformOrigin: clipTransformOrigin,
                  }}
                  draggable={false}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    const nextFit =
                      img.naturalHeight > img.naturalWidth
                        ? "contain"
                        : "cover";
                    setFitByClipId((prev) =>
                      prev[clip.id] === nextFit
                        ? prev
                        : { ...prev, [clip.id]: nextFit },
                    );
                  }}
                />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`${clip.id}:${clip.objectPosition ?? "c"}:${clip.url.slice(-48)}`}
                src={clip.url}
                alt=""
                className={`absolute inset-0 h-full w-full will-change-transform ${
                  clipFit === "contain" ? "object-contain" : "object-cover"
                }`}
                style={{
                  ...mediaFilterStyle,
                  objectPosition: clipObjectPosition,
                  transformOrigin: clipTransformOrigin,
                  animationName: kenAnimName,
                  animationDuration: `${clipDur}s`,
                  animationTimingFunction: "linear",
                  animationFillMode: "forwards",
                  animationPlayState: animPlayState,
                }}
                draggable={false}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  const nextFit =
                    img.naturalHeight > img.naturalWidth ? "contain" : "cover";
                  setFitByClipId((prev) =>
                    prev[clip.id] === nextFit
                      ? prev
                      : { ...prev, [clip.id]: nextFit },
                  );
                }}
              />
            )
          ) : null}

          {showPortrait && openingPortraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key="opening-portrait"
              src={openingPortraitUrl}
              alt=""
              className={`absolute inset-0 h-full w-full will-change-transform ${
                openingPortraitFit === "contain"
                  ? "object-contain"
                  : "object-cover"
              }`}
              style={{
                ...mediaFilterStyle,
                objectPosition: "center center",
                transformOrigin: "center center",
                animationName: "ql-portrait-reveal, ql-kb-push-soft",
                animationDuration: `${Math.max(0.8, (seg?.end ?? 0) - (seg?.start ?? 0))}s`,
                animationTimingFunction: "ease-out, linear",
                animationFillMode: "forwards",
                animationPlayState: animPlayState,
              }}
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                setOpeningPortraitFit(
                  img.naturalHeight > img.naturalWidth ? "contain" : "cover",
                );
              }}
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
              opacity: deepMediaOpacity,
            }}
            aria-hidden
          />
        ) : null}

        {/* Light leak dosé — holds Breath + breath_portrait seulement */}
        {cinema && lightLeakOpacity > 0.001 ? (
          <div
            className="pointer-events-none absolute inset-0 z-[5]"
            style={{
              opacity: lightLeakOpacity,
              background: `radial-gradient(ellipse 85% 70% at 90% 8%, ${cinematicTheme.lightLeak.warm} 0%, transparent 68%)`,
              mixBlendMode: cinematicTheme.lightLeak.blend,
              animation: `ql-leak-drift ${lightLeakDriftSec}s ease-in-out both`,
              animationPlayState: animPlayState,
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
                className={`${editorialFont.className} text-[clamp(1.85rem,4.8vw,3.15rem)] font-medium tracking-[0.04em] text-zinc-100`}
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
        seg?.kind === "pre_memory_black" ||
        seg?.kind === "end_black" ||
        seg?.kind === "clip_black" ? (
          <div className="absolute inset-0 z-[4] bg-black" aria-hidden />
        ) : null}

        {showBridge && seg.kind === "act_bridge" ? (
          <div className="absolute inset-0 z-[12] flex items-center justify-center bg-black px-8 text-center">
            <div
              className="max-w-3xl"
              style={{
                animation: `ql-bridge-title ${Math.max(0.8, seg.end - seg.start)}s ease-in-out both`,
                animationPlayState: animPlayState,
              }}
            >
              {seg.title ? (
                <p
                  className={`${editorialFont.className} text-[clamp(1.05rem,2.6vw,1.65rem)] font-medium tracking-[0.18em] text-zinc-100`}
                >
                  {seg.title}
                </p>
              ) : null}
              {seg.musicCredit && bridgeCreditColor ? (
                <p
                  className="mt-4 text-[clamp(0.78rem,1.4vw,1rem)] font-light italic tracking-[0.1em]"
                  style={{
                    color: bridgeCreditColor,
                    textShadow: bridgeTheme
                      ? `0 0 24px rgba(${bridgeTheme.glowRgb}, 0.35)`
                      : undefined,
                  }}
                >
                  {seg.musicCredit}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {pauseFlashKey > 0 && cinema && !showExitHub ? (
          <div
            key={pauseFlashKey}
            className="pointer-events-none absolute inset-0 z-[25] flex items-center justify-center"
            aria-hidden
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/45 text-zinc-100 backdrop-blur-sm"
              style={{ animation: "ql-pause-flash 0.7s ease-out both" }}
            >
              <Pause className="h-5 w-5" strokeWidth={1.25} fill="currentColor" />
            </div>
          </div>
        ) : null}

        {showCard && memoryCard ? (
          <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-black px-6 text-center">
            <div
              style={{
                animation: `ql-memory-card-out ${Math.max(0.8, (seg?.end ?? 0) - (seg?.start ?? 0))}s ease-in-out both`,
                animationPlayState: animPlayState,
              }}
            >
              <p
                className={`${editorialFont.className} text-[clamp(1.75rem,4.5vw,3rem)] font-medium tracking-wide text-zinc-200`}
              >
                {memoryCard.displayName}
              </p>
              <p className="mt-5 text-[clamp(0.75rem,1.5vw,1rem)] font-light tracking-[0.42em] text-zinc-400">
                {memoryCard.yearsLine}
              </p>
            </div>
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

        {salonBadge && !(cinema && showClip && clipAct?.musicCredit) ? (
          <div
            className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2 text-center text-[10px] font-light tracking-[0.14em] text-zinc-200 transition-opacity duration-700 ease-in-out md:bottom-7 md:text-[11px]"
            style={{
              opacity: cinema ? (showClip ? 0.2 : 0) : 0.85,
            }}
            aria-hidden={cinema ? !showClip : undefined}
          >
            {salonBadge}
          </div>
        ) : null}

        {cinema &&
        showClip &&
        clipAct?.musicCredit &&
        liveCreditColor &&
        liveCreditTheme ? (
          <div
            className="pointer-events-none absolute bottom-8 left-1/2 z-[12] w-[min(92%,36rem)] -translate-x-1/2 px-4 text-center md:bottom-10"
            aria-hidden
          >
            <p
              className="text-[clamp(0.7rem,1.2vw,0.88rem)] font-light italic tracking-[0.12em]"
              style={{
                color: liveCreditColor,
                textShadow: `0 0 20px rgba(${liveCreditTheme.glowRgb}, 0.4)`,
              }}
            >
              {clipAct.musicCredit}
            </p>
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

      {showExitHub && exitHub && cinema ? (
        <QuietLuxuryExitHub
          copy={exitHub.copy}
          displayName={memoryCard?.displayName ?? ""}
          viewerRole={exitHub.viewerRole ?? "organizer"}
          masterUnlocked={exitHub.masterUnlocked === true}
          onReplaySession={replaySession}
          onUnlockMaster={exitHub.onUnlockMaster}
          onDownloadMaster={exitHub.onDownloadMaster}
          onGuestCopy={exitHub.onGuestCopy}
          onSocialCut={exitHub.onSocialCut}
          onShareSession={exitHub.onShareSession}
          onUpgradePackage={exitHub.onUpgradePackage}
          onLeaveLueur={exitHub.onLeaveLueur}
          onCloseFullscreen={() => {
            void exitNativeFullscreen();
            exitHub.onDismiss?.();
          }}
        />
      ) : null}

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
export const QUIET_LUXURY_PRE_MEMORY_BLACK_SEC = CINEMA_TIMING.preMemoryBlack;
export const QUIET_LUXURY_TEASER_END_BLACK_SEC = TEASER_TIMING.endBlack;
export const QUIET_LUXURY_IMAGE_CROSSFADE_SEC = IMAGE_CROSSFADE_SEC;
