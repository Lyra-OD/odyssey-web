"use client";

import { getChapterTheme } from "@/src/lib/wizard/chapterTheme";

import { storyboardChapterDomId } from "@/src/components/tribute/storyboard/StoryboardChapterBlock";

export type StoryboardFilmMapSegment = {
  chapterId: string;
  index: number;
  label: string;
  assignedCount: number;
  recommendedCapacity: number | null;
};

export type StoryboardFilmMapCopy = {
  ariaLabel: string;
  segmentAria: string;
};

type Props = {
  segments: readonly StoryboardFilmMapSegment[];
  copy: StoryboardFilmMapCopy;
};

function segmentFillRatio(
  assignedCount: number,
  recommendedCapacity: number | null,
): number {
  if (recommendedCapacity === null || recommendedCapacity <= 0) {
    return assignedCount > 0 ? 1 : 0;
  }
  return Math.min(1, assignedCount / recommendedCapacity);
}

export function StoryboardFilmMap({ segments, copy }: Props) {
  if (segments.length === 0) return null;

  const scrollToChapter = (chapterId: string) => {
    document
      .getElementById(storyboardChapterDomId(chapterId))
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      className="sticky top-0 z-20 -mx-1 rounded-xl border border-white/[0.06] bg-[#020202]/90 px-3 py-3 backdrop-blur-md"
      aria-label={copy.ariaLabel}
    >
      <div className="flex h-9 gap-1 overflow-hidden rounded-lg bg-white/[0.03] p-1">
        {segments.map((segment) => {
          const theme = getChapterTheme(segment.index);
          const fill = segmentFillRatio(
            segment.assignedCount,
            segment.recommendedCapacity,
          );
          const flexGrow = Math.max(
            segment.recommendedCapacity ?? 1,
            1,
          );
          const isBeyond =
            segment.recommendedCapacity !== null &&
            segment.assignedCount > segment.recommendedCapacity;

          return (
            <button
              key={segment.chapterId}
              type="button"
              onClick={() => scrollToChapter(segment.chapterId)}
              className="group/segment relative min-w-[2.5rem] overflow-hidden rounded-md transition-opacity duration-200 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
              style={{ flex: `${flexGrow} 1 0%` }}
              aria-label={copy.segmentAria
                .replace("{label}", segment.label)
                .replace("{assigned}", String(segment.assignedCount))
                .replace(
                  "{capacity}",
                  segment.recommendedCapacity === null
                    ? "—"
                    : String(segment.recommendedCapacity),
                )}
            >
              <span
                className="absolute inset-0 bg-white/[0.04]"
                aria-hidden
              />
              <span
                className={`absolute inset-y-0 left-0 ${theme.dot} opacity-60 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`}
                style={{ width: `${fill * 100}%` }}
                aria-hidden
              />
              {isBeyond ? (
                <span
                  className="absolute inset-y-0 right-0 w-0.5 bg-amber-400/70"
                  aria-hidden
                />
              ) : null}
              <span className="relative z-[1] block truncate px-2 py-1.5 text-[10px] font-medium tracking-wide text-zinc-500 opacity-0 transition-opacity duration-200 group-hover/segment:opacity-100 md:text-[11px]">
                {segment.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
