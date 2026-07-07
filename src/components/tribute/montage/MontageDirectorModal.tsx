"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Film,
  Image as ImageIcon,
  Trash2,
  X,
} from "lucide-react";

import { MontageFocalReticle } from "@/src/components/tribute/montage/MontageFocalReticle";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import type { MontageFocalPoint } from "@/src/lib/wizard/wizardState";

export type StoryboardDirectorChapter = {
  id: string;
  label: string;
};

export type MontageDirectorModalCopy = {
  close: string;
  focalHint: string;
  exclude: string;
  include: string;
  remove: string;
  previous: string;
  next: string;
  counter: string;
  chapterTablistAria: string;
};

type Props = {
  item: MontageMediaItem;
  chapters: readonly StoryboardDirectorChapter[];
  /** `null` si le média n'est assigné à aucun chapitre. */
  currentChapterId: string | null;
  excludedIds: readonly string[];
  focalPoints: Readonly<Record<string, MontageFocalPoint>>;
  navigationOrder: string[];
  copy: MontageDirectorModalCopy;
  onClose: () => void;
  onNavigate: (assetId: string) => void;
  onAssignChapter: (assetId: string, chapterId: string) => void;
  onToggleExclude: (assetId: string) => void;
  onSetFocalPoint: (assetId: string, point: MontageFocalPoint) => void;
  onClearFocalPoint: (assetId: string) => void;
  onRemoveMedia: (assetId: string) => void;
};

const EASE_OUT_LUXE = [0.16, 1, 0.3, 1] as const;

function focalFromImageClick(
  e: MouseEvent<HTMLImageElement>,
): MontageFocalPoint {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
  return {
    x: Math.round(x * 1000) / 1000,
    y: Math.round(y * 1000) / 1000,
  };
}

function DockDivider() {
  return <span className="mx-0.5 h-6 w-px shrink-0 bg-white/10" aria-hidden />;
}

/**
 * Modal plein écran « directeur de montage » — référence d'interaction pour
 * `StoryboardMontageStep` (S5). Retypé depuis le modèle 3-actes vers des
 * chapitres dynamiques (`storyboard.chapters`).
 */
export function MontageDirectorModal({
  item,
  chapters,
  currentChapterId,
  excludedIds,
  focalPoints,
  navigationOrder,
  copy,
  onClose,
  onNavigate,
  onAssignChapter,
  onToggleExclude,
  onSetFocalPoint,
  onClearFocalPoint,
  onRemoveMedia,
}: Props) {
  const isExcluded = excludedIds.includes(item.assetId);
  const focalPoint = focalPoints[item.assetId] ?? null;
  const [slideDirection, setSlideDirection] = useState(0);
  const activeChapterRef = useRef<HTMLButtonElement | null>(null);

  const currentIndex = useMemo(
    () => navigationOrder.indexOf(item.assetId),
    [navigationOrder, item.assetId],
  );

  const goPrevious = useCallback(() => {
    if (currentIndex <= 0) return;
    setSlideDirection(-1);
    onNavigate(navigationOrder[currentIndex - 1]);
  }, [currentIndex, navigationOrder, onNavigate]);

  const goNext = useCallback(() => {
    if (currentIndex < 0 || currentIndex >= navigationOrder.length - 1) return;
    setSlideDirection(1);
    onNavigate(navigationOrder[currentIndex + 1]);
  }, [currentIndex, navigationOrder, onNavigate]);

  const hasPrevious = currentIndex > 0;
  const hasNext =
    currentIndex >= 0 && currentIndex < navigationOrder.length - 1;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") goPrevious();
      if (event.key === "ArrowRight") goNext();
    },
    [goNext, goPrevious, onClose],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    activeChapterRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentChapterId]);

  const counterLabel =
    currentIndex >= 0
      ? copy.counter
          .replace("{current}", String(currentIndex + 1))
          .replace("{total}", String(navigationOrder.length))
      : copy.counter
          .replace("{current}", "—")
          .replace("{total}", String(navigationOrder.length));

  const slideOffset = slideDirection === 0 ? 0 : slideDirection * 20;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-[#020202]/98 backdrop-blur-3xl"
      role="dialog"
      aria-modal="true"
      aria-label={item.displayName}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, pointerEvents: "auto" }}
      exit={{ opacity: 0, pointerEvents: "none" }}
      transition={{ duration: 0.25, ease: EASE_OUT_LUXE }}
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute left-1/2 top-1/3 h-[40vh] w-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-[28vh] w-[40vw] rounded-full bg-[#ff00ff]/[0.03] blur-[100px]" />
      </div>

      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-6 py-5 md:px-10"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: EASE_OUT_LUXE }}
      >
        <p className="pointer-events-auto text-[11px] font-medium tabular-nums tracking-[0.2em] text-zinc-500">
          {counterLabel}
        </p>
        <motion.button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
          whileTap={{ scale: 0.95 }}
          className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-zinc-400 backdrop-blur-md"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </motion.button>
      </motion.div>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-28 pt-16 md:px-8">
        <motion.div
          className="relative w-full max-w-[min(96vw,1200px)]"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: EASE_OUT_LUXE }}
        >
          {(item.fullPreviewUrl ?? item.previewUrl) ? (
            <div className="relative mx-auto inline-block max-h-[min(78vh,900px)] max-w-full">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={item.assetId}
                  className="relative"
                  initial={{ opacity: 0, x: slideOffset, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -slideOffset, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: EASE_OUT_LUXE }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <motion.img
                    src={item.fullPreviewUrl ?? item.previewUrl ?? ""}
                    alt={item.displayName}
                    draggable={false}
                    loading="eager"
                    decoding="async"
                    onClick={(e) => {
                      onSetFocalPoint(item.assetId, focalFromImageClick(e));
                    }}
                    className={`block max-h-[min(78vh,900px)] max-w-full cursor-crosshair object-contain ${
                      isExcluded ? "opacity-40 grayscale" : ""
                    }`}
                    layout={false}
                  />
                  <AnimatePresence>
                    {focalPoint ? (
                      <MontageFocalReticle
                        key={`${item.assetId}-focal`}
                        point={focalPoint}
                        onClear={() => onClearFocalPoint(item.assetId)}
                      />
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex aspect-video w-full max-w-2xl items-center justify-center text-zinc-600">
              {item.isVideo ? (
                <Film className="h-14 w-14" strokeWidth={1} />
              ) : (
                <ImageIcon className="h-14 w-14" strokeWidth={1} />
              )}
            </div>
          )}
        </motion.div>

        <motion.p
          className="mt-5 text-center text-[11px] font-light tracking-wide text-zinc-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          {copy.focalHint}
        </motion.p>
      </div>

      <div className="pointer-events-none fixed bottom-8 left-1/2 z-30 -translate-x-1/2 px-4">
        <motion.nav
          aria-label="Montage controls"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.15,
          }}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-[#111111]/80 p-1.5 shadow-[0_0_60px_rgba(45,212,191,0.08),0_24px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
        >
          <motion.button
            type="button"
            disabled={!hasPrevious}
            onClick={goPrevious}
            aria-label={copy.previous}
            whileHover={hasPrevious ? { scale: 1.08 } : undefined}
            whileTap={hasPrevious ? { scale: 0.92 } : undefined}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-teal-300 disabled:opacity-25"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </motion.button>

          <DockDivider />

          <div
            className="relative flex max-w-[min(52vw,28rem)] items-center gap-0.5 overflow-x-auto rounded-full bg-black/20 p-0.5 scrollbar-none"
            role="tablist"
            aria-label={copy.chapterTablistAria}
          >
            {chapters.map((chapter) => {
              const active = currentChapterId === chapter.id;
              return (
                <button
                  key={chapter.id}
                  ref={active ? activeChapterRef : undefined}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => onAssignChapter(item.assetId, chapter.id)}
                  className={`relative shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide transition-colors duration-200 ${
                    active ? "text-teal-400" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="storyboard-chapter-pill"
                      className="absolute inset-0 rounded-full bg-teal-500/10 shadow-[0_0_24px_rgba(45,212,191,0.18)]"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 28,
                      }}
                    />
                  ) : null}
                  <span className="relative z-[1]">{chapter.label}</span>
                </button>
              );
            })}
          </div>

          <DockDivider />

          <motion.button
            type="button"
            onClick={() => onToggleExclude(item.assetId)}
            aria-label={isExcluded ? copy.include : copy.exclude}
            aria-pressed={isExcluded}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
              isExcluded
                ? "bg-[#ff00ff]/10 text-[#ff00ff] shadow-[0_0_20px_rgba(255,0,255,0.15)]"
                : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
            }`}
          >
            <EyeOff className="h-4 w-4" strokeWidth={1.4} />
          </motion.button>

          <motion.button
            type="button"
            onClick={() => onRemoveMedia(item.assetId)}
            aria-label={copy.remove}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-400/60 transition-colors hover:bg-red-500/10 hover:text-red-400/90"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.4} />
          </motion.button>

          <motion.button
            type="button"
            disabled={!hasNext}
            onClick={goNext}
            aria-label={copy.next}
            whileHover={hasNext ? { scale: 1.08 } : undefined}
            whileTap={hasNext ? { scale: 0.92 } : undefined}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-teal-300 disabled:opacity-25"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </motion.button>
        </motion.nav>
      </div>
    </motion.div>
  );
}
