"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { StoryboardCapacityBadge } from "@/src/components/tribute/storyboard/StoryboardCapacityBadge";
import { getChapterTheme } from "@/src/lib/wizard/chapterTheme";

type Props = {
  chapterIndex: number;
  title: string;
  songTitle?: string | null;
  songArtist?: string | null;
  capacity: number | null;
  assignedCount: number;
  titleEditAria: string;
  capacityCopy: {
    recommended: string;
    pending: string;
  };
  onTitleChange: (nextTitle: string) => void;
};

export function ChapterNarrativeHeader({
  chapterIndex,
  title,
  songTitle,
  songArtist,
  capacity,
  assignedCount,
  titleEditAria,
  capacityCopy,
  onTitleChange,
}: Props) {
  const theme = getChapterTheme(chapterIndex);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setDraft(title);
  }, [title, isEditing]);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const commitTitle = useCallback(() => {
    setIsEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== title) onTitleChange(trimmed);
  }, [draft, onTitleChange, title]);

  const songLine = [songTitle, songArtist].filter(Boolean).join(" — ");

  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3 gap-y-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${theme.dot}`}
            aria-hidden
          />

          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={draft}
              maxLength={40}
              aria-label={titleEditAria}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commitTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitTitle();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setDraft(title);
                  setIsEditing(false);
                }
              }}
              className={`min-w-0 flex-1 border-b bg-transparent pb-0.5 font-[family-name:var(--font-label)] text-lg font-semibold tracking-tight text-white outline-none md:text-xl ${theme.text} border-current/30 focus:border-current/60`}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className={`min-w-0 text-left font-[family-name:var(--font-label)] text-lg font-semibold tracking-tight transition-colors duration-200 hover:opacity-90 md:text-xl ${theme.text}`}
              aria-label={titleEditAria}
            >
              <span className="truncate">{title}</span>
            </button>
          )}
        </div>

        <StoryboardCapacityBadge
          capacity={capacity}
          assignedCount={assignedCount}
          showAssigned
          copy={capacityCopy}
          className="shrink-0"
        />
      </div>

      {songLine ? (
        <p className="truncate pl-4 text-sm font-light text-zinc-500">{songLine}</p>
      ) : null}
    </header>
  );
}
