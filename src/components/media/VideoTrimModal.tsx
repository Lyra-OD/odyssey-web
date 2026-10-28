"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { VIDEO_TRIM_DURATION_SEC } from "@/src/lib/wizard/storyboardPacing";

export type VideoTrimSelection = {
  trimStartSec: number;
  durationSec: number;
};

export type VideoTrimModalCopy = {
  title: string;
  hint: string;
  windowLabel: string;
  confirm: string;
  cancel: string;
  closeAria: string;
};

type Props = {
  file: Blob;
  sourceDurationSec: number;
  open: boolean;
  copy: VideoTrimModalCopy;
  onConfirm: (selection: VideoTrimSelection) => void;
  onCancel: () => void;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function formatClock(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  const whole = Math.floor(r);
  const frac = Math.round((r - whole) * 10);
  if (frac === 0) {
    return `${m}:${String(whole).padStart(2, "0")}`;
  }
  return `${m}:${String(whole).padStart(2, "0")}.${frac}`;
}

/**
 * Commit 8 S7 — modale « Choisis tes 10 secondes ».
 * Isolée : pas de Coffre / upload. Émet seulement trimStartSec + durationSec.
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
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  const windowSec = useMemo(() => {
    if (
      !Number.isFinite(sourceDurationSec) ||
      sourceDurationSec <= 0
    ) {
      return VIDEO_TRIM_DURATION_SEC;
    }
    return Math.min(VIDEO_TRIM_DURATION_SEC, sourceDurationSec);
  }, [sourceDurationSec]);

  const maxStart = useMemo(
    () => Math.max(0, sourceDurationSec - windowSec),
    [sourceDurationSec, windowSec],
  );

  const [trimStartSec, setTrimStartSec] = useState(0);

  useEffect(() => {
    if (!open) return;
    setTrimStartSec(0);
  }, [open, file, sourceDurationSec]);

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
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !open) return;
    const target = clamp(trimStartSec, 0, maxStart);
    const onSeeked = () => {
      void video.play().catch(() => undefined);
    };
    video.addEventListener("seeked", onSeeked, { once: true });
    try {
      video.currentTime = target;
    } catch {
      // ignore
    }
    return () => {
      video.removeEventListener("seeked", onSeeked);
    };
  }, [trimStartSec, maxStart, open, objectUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !open) return;

    const onTimeUpdate = () => {
      const end = trimStartSec + windowSec;
      if (video.currentTime >= end - 0.05) {
        try {
          video.currentTime = trimStartSec;
        } catch {
          // ignore
        }
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, [open, trimStartSec, windowSec]);

  if (!open) return null;

  const endSec = trimStartSec + windowSec;
  const windowLabel = copy.windowLabel
    .replace("{start}", formatClock(trimStartSec))
    .replace("{end}", formatClock(endSec));

  const sliderMax = Math.max(maxStart, 0.001);
  const sliderDisabled = maxStart <= 0.001;

  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col bg-[#020202]/98 backdrop-blur-3xl"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pb-8 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-medium tracking-wide text-zinc-100">
              {copy.title}
            </h2>
            <p className="mt-2 max-w-xl text-sm font-light leading-relaxed text-zinc-400">
              {copy.hint}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-light text-zinc-300"
            aria-label={copy.closeAria}
          >
            {copy.cancel}
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-black">
          {objectUrl ? (
            <video
              ref={videoRef}
              src={objectUrl}
              className="max-h-[50vh] w-full object-contain"
              playsInline
              muted
              controls={false}
            />
          ) : null}
        </div>

        <p className="mt-4 text-sm font-light text-teal-300/90">{windowLabel}</p>

        <label className="mt-3 block">
          <span className="sr-only">{copy.title}</span>
          <input
            type="range"
            min={0}
            max={sliderMax}
            step={0.1}
            value={clamp(trimStartSec, 0, maxStart)}
            disabled={sliderDisabled}
            onChange={(e) => {
              setTrimStartSec(clamp(Number(e.target.value), 0, maxStart));
            }}
            className="w-full accent-teal-400 disabled:opacity-40"
          />
        </label>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              onConfirm({
                trimStartSec: clamp(trimStartSec, 0, maxStart),
                durationSec: windowSec,
              })
            }
            className="rounded-lg border border-teal-400/40 bg-teal-400/10 px-4 py-2 text-sm font-light text-teal-200"
          >
            {copy.confirm}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-light text-zinc-300"
          >
            {copy.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
