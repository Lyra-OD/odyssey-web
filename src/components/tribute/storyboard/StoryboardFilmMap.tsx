"use client";

import { memo, useCallback } from "react";

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

export const StoryboardFilmMap = memo(function StoryboardFilmMap({
  segments,
  copy,
}: Props) {
  const scrollToChapter = useCallback((chapterId: string) => {
    document
      .getElementById(storyboardChapterDomId(chapterId))
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (segments.length === 0) return null;

  return (
    <nav
      className="sticky top-0 z-20 -mx-1 rounded-xl border border-white/[0.06] bg-[#020202]/90 px-3 py-3 backdrop-blur-md"
      aria-label={copy.ariaLabel}
    >
      <div className="flex h-9 gap-1 overflow-hidden rounded-lg bg-white/[0.03] p-1">
        {segments.map((segment) => {
          const theme = getChapterTheme(segment.index);
          const capacity = segment.recommendedCapacity;
          const assigned = segment.assignedCount;
          const flexGrow = Math.max(capacity ?? 1, 1);

          const inCapacityPct =
            capacity === null || capacity <= 0
              ? assigned > 0
                ? 100
                : 0
              : Math.min((assigned / capacity) * 100, 100);
          const overflowPct =
            capacity !== null && capacity > 0 && assigned > capacity
              ? Math.min(((assigned - capacity) / capacity) * 100, 35)
              : 0;

          return (
            <button
              key={segment.chapterId}
              type="button"
              onClick={() => scrollToChapter(segment.chapterId)}
              className="group/segment relative min-w-[2.5rem] overflow-hidden rounded-md transition-opacity duration-200 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
              style={{ flex: `${flexGrow} 1 0%` }}
              aria-label={copy.segmentAria
                .replace("{label}", segment.label)
                .replace("{assigned}", String(assigned))
                .replace(
                  "{capacity}",
                  capacity === null ? "—" : String(capacity),
                )}
            >
              <span
                className="absolute inset-0 bg-white/[0.04]"
                aria-hidden
              />

              <span
                className={`absolute inset-y-0 left-0 ${theme.dot} opacity-70 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`}
                style={{ width: `${inCapacityPct}%` }}
                aria-hidden
              />

              {overflowPct > 0 ? (
                <span
                  className={`absolute inset-y-0 ${theme.dot} opacity-20 transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`}
                  style={{
                    left: `${inCapacityPct}%`,
                    width: `${overflowPct}%`,
                  }}
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
});
