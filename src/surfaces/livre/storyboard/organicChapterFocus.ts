/** S5-K — Mode Focus organique (constants + helpers purs). */

/** Survol prolongé avant activation (ms). */
export const ORGANIC_FOCUS_DWELL_MS = 500;

/** Sortie au scroll : cumul de déplacement (px). */
export const ORGANIC_FOCUS_SCROLL_EXIT_PX = 48;

/** Atténuation des chapitres non focusés (~40 %). */
export const ORGANIC_FOCUS_DIM_OPACITY = 0.6;

/** Flou décoratif (couche derrière le contenu, pas sur les vignettes). */
export const ORGANIC_FOCUS_BLUR_PX = 2;

/** Attribut DOM sur le shell chapitre (détection clic extérieur). */
export const ORGANIC_FOCUS_SHELL_ATTR = "data-organic-focus-shell";

/** Conteneur de scroll Studio (TributeWizard). */
export const ORGANIC_FOCUS_SCROLL_ROOT_SELECTOR = ".parcours-monolith-scroll";

export type ChapterFocusPresentation = "idle" | "focused" | "dimmed";

export function resolveChapterFocusPresentation(
  focusChapterId: string | null,
  chapterId: string,
): ChapterFocusPresentation {
  if (!focusChapterId) return "idle";
  if (focusChapterId === chapterId) return "focused";
  return "dimmed";
}

/**
 * Cumul scroll pour sortie du focus. Remet le cumul à 0 quand le seuil est atteint.
 */
export function accumulateScrollExit(
  cumulativePx: number,
  deltaPx: number,
  thresholdPx: number = ORGANIC_FOCUS_SCROLL_EXIT_PX,
): { cumulativePx: number; shouldExit: boolean } {
  const next = cumulativePx + Math.abs(deltaPx);
  if (next >= thresholdPx) {
    return { cumulativePx: 0, shouldExit: true };
  }
  return { cumulativePx: next, shouldExit: false };
}

/** Magic running force toujours l’absence de focus. */
export function focusChapterIdForMagicGate(
  isMagicRunning: boolean,
  focusChapterId: string | null,
): string | null {
  return isMagicRunning ? null : focusChapterId;
}

/** Pendant un drag DnD (autoScroll), le scroll ne doit pas fermer le focus. */
export function shouldIgnoreScrollExitDuringDnd(isDndActive: boolean): boolean {
  return isDndActive;
}

/**
 * Scroll parent Studio : `.parcours-monolith-scroll` (overflow-y auto, max 90dvh),
 * sinon `window`.
 */
export function resolveOrganicFocusScrollRoot(
  from: Element | null,
): HTMLElement | Window {
  if (!from || typeof document === "undefined") return window;
  const monolith = from.closest(ORGANIC_FOCUS_SCROLL_ROOT_SELECTOR);
  if (monolith instanceof HTMLElement) return monolith;
  return window;
}

export function readScrollOffset(root: HTMLElement | Window): number {
  if (root === window) return window.scrollY;
  return (root as HTMLElement).scrollTop;
}

type DwellSchedulerOptions = {
  dwellMs?: number;
  getIsMagicRunning: () => boolean;
  onActivate: (chapterId: string) => void;
};

/**
 * Timer dwell testable (fake timers) : cancel au re-start, Magic gate dans le callback.
 */
export function createOrganicFocusDwellScheduler(
  options: DwellSchedulerOptions,
) {
  const dwellMs = options.dwellMs ?? ORGANIC_FOCUS_DWELL_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    start(chapterId: string) {
      cancel();
      if (options.getIsMagicRunning()) return;
      timer = setTimeout(() => {
        timer = null;
        if (options.getIsMagicRunning()) return;
        options.onActivate(chapterId);
      }, dwellMs);
    },
    cancel,
    isPending() {
      return timer !== null;
    },
  };
}
