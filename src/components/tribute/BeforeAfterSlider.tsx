"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  beforeLabel: string;
  afterLabel: string;
  /** Photo réelle. Sans `src` : démo gradient (carte add-on checkout). */
  src?: string | null;
  canFullPreview?: boolean;
  watermark?: string;
};

/**
 * Slider Avant / Après.
 * Aperçu Scanner : même photo, filtres CSS — pas un job IA serveur.
 */
export function BeforeAfterSlider({
  beforeLabel,
  afterLabel,
  src,
  canFullPreview = true,
  watermark,
}: Props) {
  const [position, setPosition] = useState(52);
  const [lockedBlur, setLockedBlur] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (canFullPreview || !src) {
      setLockedBlur(false);
      return;
    }
    const timer = window.setTimeout(() => setLockedBlur(true), 3000);
    return () => window.clearTimeout(timer);
  }, [canFullPreview, src]);

  const updateFromClientX = useCallback((clientX: number) => {
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    setPosition(Math.min(96, Math.max(4, ratio * 100)));
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      updateFromClientX(event.clientX);
    },
    [updateFromClientX],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      updateFromClientX(event.clientX);
    },
    [updateFromClientX],
  );

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const afterFilter = lockedBlur
    ? "contrast(1.14) saturate(1.18) brightness(1.08) blur(10px)"
    : "contrast(1.14) saturate(1.18) brightness(1.08)";

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/3] w-full cursor-ew-resize select-none overflow-hidden rounded-2xl ring-1 ring-white/10 touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="img"
      aria-label={`${beforeLabel} / ${afterLabel}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: afterFilter }}
        />
      ) : (
        <>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(145deg, #134e4a 0%, #312e81 55%, #0f172a 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(circle at 35% 40%, rgba(254,243,199,0.55) 0%, transparent 42%), radial-gradient(circle at 68% 62%, rgba(45,212,191,0.35) 0%, transparent 48%)",
            }}
          />
        </>
      )}

      {!canFullPreview && src && watermark ? (
        <span className="pointer-events-none absolute bottom-10 right-3 z-[5] rotate-[-18deg] text-lg font-medium uppercase tracking-[0.28em] text-white/35">
          {watermark}
        </span>
      ) : null}

      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          clipPath: `inset(0 ${100 - position}% 0 0)`,
        }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <>
            <div
              className="absolute inset-0 h-full"
              style={{
                filter: "sepia(0.5) contrast(0.8) brightness(0.72) grayscale(0.35)",
                background:
                  "linear-gradient(160deg, #3f3f46 0%, #27272a 50%, #18181b 100%)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 3px)",
              }}
            />
          </>
        )}
      </div>

      <div
        className="pointer-events-none absolute inset-y-0 z-10 w-px bg-white/90 shadow-[0_0_14px_rgba(255,255,255,0.4)]"
        style={{ left: `${position}%` }}
      />

      <div
        className="pointer-events-none absolute top-1/2 z-20 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/55 shadow-lg backdrop-blur-md"
        style={{ left: `${position}%` }}
        aria-hidden
      >
        <span className="text-[10px] font-bold text-white/90">↔</span>
      </div>

      <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-300 backdrop-blur-sm">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-md bg-teal-400/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#020202]">
        {afterLabel}
      </span>
    </div>
  );
}
