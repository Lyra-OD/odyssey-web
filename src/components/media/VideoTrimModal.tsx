"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  clampTrimStartSec,
  computeFrameWidthRatio,
  computeMaxTrimStartSec,
  computeTrimWindowSec,
  frameLeftRatioFromTrimStart,
  playheadRatioInWindow,
  trimStartFromPointerX,
} from "@/src/lib/media/videoTrimMath";

export type VideoTrimSelection = {
  trimStartSec: number;
  durationSec: number;
};

export type VideoTrimModalCopy = {
  title: string;
  hint: string;
  previewHint: string;
  filmstripLabel: string;
  startLabel: string;
  endLabel: string;
  fixedDurationLabel: string;
  confirm: string;
  cancel: string;
  closeAria: string;
  filmstripAria: string;
  play: string;
  pause: string;
  playAria: string;
  pauseAria: string;
};

type Props = {
  file: Blob;
  sourceDurationSec: number;
  open: boolean;
  copy: VideoTrimModalCopy;
  onConfirm: (selection: VideoTrimSelection) => void;
  onCancel: () => void;
};

const THUMB_COUNT = 10;

function formatClock(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  const whole = Math.floor(r);
  const tenths = Math.round((r - whole) * 10);
  if (tenths === 0) {
    return `${m}:${String(whole).padStart(2, "0")}`;
  }
  if (tenths === 10) {
    return `${m}:${String(whole + 1).padStart(2, "0")}`;
  }
  return `${m}:${String(whole).padStart(2, "0")}.${tenths}`;
}

function pauseVideo(video: HTMLVideoElement | null) {
  if (!video) return;
  try {
    video.pause();
  } catch {
    // ignore
  }
}

function seekVideo(video: HTMLVideoElement | null, timeSec: number) {
  if (!video) return;
  try {
    video.currentTime = Math.max(0, timeSec);
  } catch {
    // ignore
  }
}

async function extractFilmstripThumbs(
  file: Blob,
  durationSec: number,
  count: number,
  signal?: AbortSignal,
): Promise<string[]> {
  if (typeof document === "undefined" || !(durationSec > 0) || count < 1) {
    return [];
  }

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    URL.revokeObjectURL(url);
    return [];
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("thumb_load_timeout")),
        15_000,
      );
      video.onloadeddata = () => {
        clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timer);
        reject(new Error("thumb_load_failed"));
      };
    });

    const w = Math.max(2, video.videoWidth || 160);
    const h = Math.max(2, video.videoHeight || 90);
    const targetW = 96;
    const targetH = Math.max(54, Math.round((targetW * h) / w));
    canvas.width = targetW;
    canvas.height = targetH;

    const thumbs: string[] = [];
    for (let i = 0; i < count; i += 1) {
      if (signal?.aborted) break;
      const t =
        count === 1
          ? 0
          : (i / (count - 1)) * Math.max(0, durationSec - 0.05);
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          resolve();
        };
        video.addEventListener("seeked", onSeeked);
        try {
          video.currentTime = t;
        } catch {
          video.removeEventListener("seeked", onSeeked);
          resolve();
        }
      });
      ctx.drawImage(video, 0, 0, targetW, targetH);
      thumbs.push(canvas.toDataURL("image/jpeg", 0.7));
    }
    return thumbs;
  } catch {
    return [];
  } finally {
    pauseVideo(video);
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

/**
 * Commit 8 S7 v3 — filmstrip + cadre teal fixe + Play/Pause.
 * Drag = scrub sans autoplay. Boucle uniquement si lecture active.
 */
export function VideoTrimModal({
  file,
  sourceDurationSec,
  open,
  copy,
  onConfirm,
  onCancel,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    grabOffsetRatioInFrame: number;
    lastTrimStartSec: number;
  }>({ active: false, grabOffsetRatioInFrame: 0, lastTrimStartSec: 0 });
  const isPlayingRef = useRef(false);

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [trimStartSec, setTrimStartSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadSec, setPlayheadSec] = useState(0);

  const windowSec = useMemo(
    () => computeTrimWindowSec(sourceDurationSec),
    [sourceDurationSec],
  );
  const maxStart = useMemo(
    () => computeMaxTrimStartSec(sourceDurationSec, windowSec),
    [sourceDurationSec, windowSec],
  );
  const frameWidthRatio = useMemo(
    () => computeFrameWidthRatio(sourceDurationSec, windowSec),
    [sourceDurationSec, windowSec],
  );
  const frameLeftRatio = useMemo(
    () =>
      frameLeftRatioFromTrimStart(trimStartSec, sourceDurationSec, windowSec),
    [trimStartSec, sourceDurationSec, windowSec],
  );

  const canDrag = maxStart > 0.001;
  const playheadRatio = playheadRatioInWindow(
    playheadSec,
    trimStartSec,
    windowSec,
  );

  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    pauseVideo(videoRef.current);
  }, []);

  const scrubToTrimStart = useCallback(
    (startSec: number) => {
      const next = clampTrimStartSec(startSec, maxStart);
      stopPlayback();
      seekVideo(videoRef.current, next);
      setPlayheadSec(next);
    },
    [maxStart, stopPlayback],
  );

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!open) {
      stopPlayback();
      return;
    }
    setTrimStartSec(0);
    setPlayheadSec(0);
    stopPlayback();
  }, [open, file, sourceDurationSec, stopPlayback]);

  useEffect(() => {
    if (!open) return;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [open, file]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      pauseVideo(videoRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        stopPlayback();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, stopPlayback]);

  useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    setThumbs([]);
    void extractFilmstripThumbs(
      file,
      sourceDurationSec,
      THUMB_COUNT,
      ac.signal,
    ).then((next) => {
      if (!ac.signal.aborted) setThumbs(next);
    });
    return () => ac.abort();
  }, [open, file, sourceDurationSec]);

  // Seek scrub quand le début change (drag / flèches) — jamais play().
  useEffect(() => {
    if (!open || !objectUrl) return;
    if (dragRef.current.active) return;
    const target = clampTrimStartSec(trimStartSec, maxStart);
    seekVideo(videoRef.current, target);
    setPlayheadSec(target);
  }, [trimStartSec, maxStart, open, objectUrl]);

  // Lecture bornée : boucle uniquement si Play actif.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !open) return;

    const onTimeUpdate = () => {
      const start = clampTrimStartSec(trimStartSec, maxStart);
      const end = start + windowSec;
      const t = video.currentTime;
      setPlayheadSec(t);

      if (t >= end - 0.05) {
        if (isPlayingRef.current) {
          seekVideo(video, start);
          setPlayheadSec(start);
          void video.play().catch(() => {
            stopPlayback();
          });
        } else {
          seekVideo(video, start);
          setPlayheadSec(start);
          pauseVideo(video);
        }
      }
    };

    const onEnded = () => {
      if (!isPlayingRef.current) return;
      const start = clampTrimStartSec(trimStartSec, maxStart);
      seekVideo(video, start);
      void video.play().catch(() => stopPlayback());
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, [open, trimStartSec, windowSec, maxStart, stopPlayback]);

  const applyPointer = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || !canDrag) return;
      const rect = track.getBoundingClientRect();
      const next = trimStartFromPointerX(
        clientX,
        rect.left,
        rect.width,
        sourceDurationSec,
        windowSec,
        dragRef.current.grabOffsetRatioInFrame,
      );
      dragRef.current.lastTrimStartSec = next;
      setTrimStartSec(next);
      // Scrub immédiat pendant le drag (sans play).
      seekVideo(videoRef.current, next);
      setPlayheadSec(next);
    },
    [canDrag, sourceDurationSec, windowSec],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canDrag) return;
    const track = trackRef.current;
    if (!track) return;
    stopPlayback();
    const rect = track.getBoundingClientRect();
    const xRatio = (event.clientX - rect.left) / rect.width;
    const left = frameLeftRatio;
    const right = left + frameWidthRatio;
    const inside = xRatio >= left && xRatio <= right;
    dragRef.current = {
      active: true,
      grabOffsetRatioInFrame: inside ? xRatio - left : frameWidthRatio / 2,
      lastTrimStartSec: trimStartSec,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    applyPointer(event.clientX);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    applyPointer(event.clientX);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    // Fin de drag : image figée au début de fenêtre, pas d'autoplay.
    scrubToTrimStart(dragRef.current.lastTrimStartSec);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      stopPlayback();
      // Remute au pause : évite un autoplay sonore au prochain seek.
      video.muted = true;
      return;
    }
    const start = clampTrimStartSec(trimStartSec, maxStart);
    const end = start + windowSec;
    if (video.currentTime < start || video.currentTime >= end - 0.05) {
      seekVideo(video, start);
      setPlayheadSec(start);
    }
    // Geste utilisateur : démute (Safari iOS ignore souvent le prop React seul).
    video.muted = false;
    video.volume = 1;
    isPlayingRef.current = true;
    setIsPlaying(true);
    void video.play().catch(() => {
      stopPlayback();
      video.muted = true;
    });
  };

  const handleCancel = () => {
    stopPlayback();
    onCancel();
  };

  const handleConfirm = () => {
    stopPlayback();
    onConfirm({
      trimStartSec: clampTrimStartSec(trimStartSec, maxStart),
      durationSec: windowSec,
    });
  };

  if (!open) return null;

  const endSec = trimStartSec + windowSec;
  const startText = copy.startLabel.replace(
    "{time}",
    formatClock(trimStartSec),
  );
  const endText = copy.endLabel.replace("{time}", formatClock(endSec));
  const playheadLeftRatio =
    frameLeftRatio + playheadRatio * frameWidthRatio;

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-[#020202]/98 backdrop-blur-3xl"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-5">
        <div className="flex shrink-0 items-start justify-between gap-4 pt-2">
          <div className="min-w-0">
            <h2 className="font-serif text-xl font-medium tracking-wide text-zinc-100 sm:text-2xl">
              {copy.title}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm font-light leading-relaxed text-zinc-400">
              {copy.hint}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-light text-zinc-300"
            aria-label={copy.closeAria}
          >
            {copy.cancel}
          </button>
        </div>

        {/* Corps scrollable : sur iPhone le CTA reste dans le footer sticky. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-4">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
            {objectUrl ? (
              <video
                ref={videoRef}
                src={objectUrl}
                className="max-h-[28vh] w-full object-contain sm:max-h-[42vh]"
                playsInline
                // muted au montage (scrub sans son) ; Play démute via togglePlay.
                muted
                controls={false}
              />
            ) : null}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="rounded-lg border border-teal-400/40 bg-teal-400/10 px-4 py-2 text-sm font-light text-teal-200"
              aria-label={isPlaying ? copy.pauseAria : copy.playAria}
            >
              {isPlaying ? copy.pause : copy.play}
            </button>
            <p className="text-xs font-light text-zinc-500">
              {copy.previewHint}
            </p>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="text-[10px] font-light uppercase tracking-[0.2em] text-zinc-500">
                {copy.filmstripLabel}
              </p>
              <p className="text-xs font-light text-zinc-400">
                {sourceDurationSec.toFixed(1).replace(".", ",")} s
              </p>
            </div>

            <div
              ref={trackRef}
              role="slider"
              aria-label={copy.filmstripAria}
              aria-valuemin={0}
              aria-valuemax={maxStart}
              aria-valuenow={trimStartSec}
              tabIndex={0}
              onKeyDown={(e) => {
                if (!canDrag) return;
                const step = 0.5;
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  stopPlayback();
                  setTrimStartSec((s) =>
                    clampTrimStartSec(s - step, maxStart),
                  );
                }
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  stopPlayback();
                  setTrimStartSec((s) =>
                    clampTrimStartSec(s + step, maxStart),
                  );
                }
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className={`relative h-16 touch-none overflow-hidden rounded-lg border border-white/10 bg-zinc-900 ${
                canDrag
                  ? "cursor-grab active:cursor-grabbing"
                  : "cursor-default"
              }`}
            >
              <div className="absolute inset-0 flex">
                {(thumbs.length > 0
                  ? thumbs
                  : Array.from({ length: THUMB_COUNT }, () => null)
                ).map((src, i) => (
                  <div
                    key={i}
                    className="h-full flex-1 border-r border-black/40 bg-zinc-800 last:border-r-0"
                  >
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover opacity-90"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">
                        ·
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div
                className="pointer-events-none absolute inset-y-0 left-0 bg-black/55"
                style={{ width: `${frameLeftRatio * 100}%` }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-y-0 right-0 bg-black/55"
                style={{
                  width: `${Math.max(0, 1 - frameLeftRatio - frameWidthRatio) * 100}%`,
                }}
                aria-hidden
              />

              <div
                className="pointer-events-none absolute inset-y-0 rounded-md border-2 border-teal-400 shadow-[0_0_0_1px_rgba(45,212,191,0.25)]"
                style={{
                  left: `${frameLeftRatio * 100}%`,
                  width: `${frameWidthRatio * 100}%`,
                }}
                aria-hidden
              >
                <span className="absolute left-0 top-1/2 h-8 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400" />
                <span className="absolute right-0 top-1/2 h-8 w-1.5 translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-400" />
              </div>

              {isPlaying ? (
                <div
                  className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-teal-200/90"
                  style={{ left: `${playheadLeftRatio * 100}%` }}
                  aria-hidden
                />
              ) : null}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 text-xs font-light text-zinc-400">
              <span>{startText}</span>
              <span className="rounded-full border border-teal-400/40 bg-teal-400/10 px-2.5 py-0.5 text-teal-200">
                {copy.fixedDurationLabel}
              </span>
              <span>{endText}</span>
            </div>
          </div>
        </div>

        {/* Footer toujours visible sur petit écran (home indicator inclus). */}
        <div className="shrink-0 border-t border-white/10 bg-[#020202]/95 pb-4 pt-3">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="min-h-11 flex-1 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm font-light text-zinc-300"
            >
              {copy.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="min-h-11 flex-[1.4] rounded-lg border border-teal-400/40 bg-teal-400/10 px-4 py-2.5 text-sm font-light text-teal-200"
            >
              {copy.confirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
