/**
 * Lecteur de la partition Composition Magique — lots chapitre + cascade CSS.
 */

import { flushSync } from "react-dom";

import { storyboardChapterDomId } from "@/src/components/tribute/storyboard/StoryboardChapterBlock";
import type { MagicTimelineEvent } from "@/src/lib/wizard/storyboardMagicTimeline";
import {
  MAGIC_BATCH_INTER_CHAPTER_MS,
  MAGIC_OVERLAY_EXIT_MS,
  computeBatchCascadeMs,
} from "@/src/lib/wizard/storyboardMagicTimeline";

/** Marge sticky : en-tête wizard + mini-carte FilmMap (scrollMarginTop des chapitres). */
export const MAGIC_SCROLL_MARGIN_TOP_PX = 132;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Double rAF — scroll et reflow (changement de chapitre). */
export function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function scrollChapterIntoView(chapterId: string): void {
  const target = document.getElementById(storyboardChapterDomId(chapterId));
  if (!target) return;

  target.scrollIntoView({
    behavior: "instant",
    block: "start",
  });
}

export type MagicCinematicPhase = "idle" | "performing" | "exiting";

export type MagicTimelinePlayerDeps = {
  shouldAbort: () => boolean;
  setPhase: (phase: MagicCinematicPhase) => void;
  setHighlightChapterId: (chapterId: string | null) => void;
  assignChapterBatch: (chapterId: string, mediaIds: readonly string[]) => void;
};

function resolveBatchDwellMs(
  mediaCount: number,
  nextEvent: MagicTimelineEvent | undefined,
): number {
  if (nextEvent?.kind === "complete") {
    return computeBatchCascadeMs(mediaCount);
  }
  return MAGIC_BATCH_INTER_CHAPTER_MS;
}

export async function playMagicTimeline(
  events: readonly MagicTimelineEvent[],
  deps: MagicTimelinePlayerDeps,
): Promise<void> {
  deps.setPhase("performing");
  deps.setHighlightChapterId(null);

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (deps.shouldAbort()) {
      deps.setPhase("idle");
      return;
    }

    const nextEvent = events[index + 1];

    switch (event.kind) {
      case "scrollToChapter":
        deps.setHighlightChapterId(event.chapterId);
        scrollChapterIntoView(event.chapterId);
        await waitForPaint();
        break;

      case "assignChapterBatch":
        flushSync(() => {
          deps.assignChapterBatch(event.chapterId, event.mediaIds);
        });
        await sleep(resolveBatchDwellMs(event.mediaIds.length, nextEvent));
        break;

      case "complete":
        deps.setHighlightChapterId(null);
        deps.setPhase("exiting");
        await sleep(MAGIC_OVERLAY_EXIT_MS);
        deps.setPhase("idle");
        break;

      default:
        break;
    }
  }
}
