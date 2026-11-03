"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import {
  ORGANIC_FOCUS_SHELL_ATTR,
  accumulateScrollExit,
  createOrganicFocusDwellScheduler,
  readScrollOffset,
  resolveOrganicFocusScrollRoot,
  shouldIgnoreScrollExitDuringDnd,
} from "@/src/surfaces/livre/storyboard/organicChapterFocus";

type Options = {
  isMagicRunning: boolean;
  /** `activeDragIds.length > 0` — suspend la sortie scroll (autoScroll DnD). */
  isDndActive: boolean;
  /** Racine Livre pour résoudre `.parcours-monolith-scroll`. */
  surfaceRef: RefObject<HTMLElement | null>;
};

/**
 * S5-K — Focus organique sur le chapitre actif.
 * État local uniquement (pas de persistance storyboard).
 */
export function useOrganicChapterFocus({
  isMagicRunning,
  isDndActive,
  surfaceRef,
}: Options) {
  const [focusChapterId, setFocusChapterId] = useState<string | null>(null);
  const scrollCumulativeRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const isMagicRunningRef = useRef(isMagicRunning);
  isMagicRunningRef.current = isMagicRunning;

  const dwellSchedulerRef = useRef(
    createOrganicFocusDwellScheduler({
      getIsMagicRunning: () => isMagicRunningRef.current,
      onActivate: (chapterId) => {
        scrollCumulativeRef.current = 0;
        setFocusChapterId(chapterId);
      },
    }),
  );

  const cancelDwell = useCallback(() => {
    dwellSchedulerRef.current.cancel();
  }, []);

  const clearFocus = useCallback(() => {
    cancelDwell();
    scrollCumulativeRef.current = 0;
    setFocusChapterId(null);
  }, [cancelDwell]);

  const activateFocus = useCallback(
    (chapterId: string) => {
      if (isMagicRunningRef.current) return;
      cancelDwell();
      scrollCumulativeRef.current = 0;
      setFocusChapterId(chapterId);
    },
    [cancelDwell],
  );

  const startDwell = useCallback(
    (chapterId: string) => {
      dwellSchedulerRef.current.start(chapterId);
    },
    [],
  );

  useEffect(() => {
    if (!isMagicRunning) return;
    cancelDwell();
    scrollCumulativeRef.current = 0;
    setFocusChapterId(null);
  }, [cancelDwell, isMagicRunning]);

  useEffect(() => {
    if (!focusChapterId || isMagicRunning) return;
    if (shouldIgnoreScrollExitDuringDnd(isDndActive)) return;

    const root = resolveOrganicFocusScrollRoot(surfaceRef.current);
    lastScrollYRef.current = readScrollOffset(root);
    scrollCumulativeRef.current = 0;

    const onScroll = () => {
      if (shouldIgnoreScrollExitDuringDnd(isDndActive)) return;
      const y = readScrollOffset(root);
      const delta = y - lastScrollYRef.current;
      lastScrollYRef.current = y;
      const result = accumulateScrollExit(
        scrollCumulativeRef.current,
        delta,
      );
      scrollCumulativeRef.current = result.cumulativePx;
      if (result.shouldExit) {
        cancelDwell();
        setFocusChapterId(null);
      }
    };

    const target: HTMLElement | Window = root;
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      target.removeEventListener("scroll", onScroll);
    };
  }, [
    cancelDwell,
    focusChapterId,
    isDndActive,
    isMagicRunning,
    surfaceRef,
  ]);

  useEffect(() => {
    if (!focusChapterId || isMagicRunning) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const shell = target.closest(`[${ORGANIC_FOCUS_SHELL_ATTR}]`);
      const shellId = shell?.getAttribute(ORGANIC_FOCUS_SHELL_ATTR);
      if (shellId === focusChapterId) return;
      clearFocus();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [clearFocus, focusChapterId, isMagicRunning]);

  useEffect(() => () => cancelDwell(), [cancelDwell]);

  return {
    focusChapterId,
    activateFocus,
    clearFocus,
    startDwell,
    cancelDwell,
  };
}
