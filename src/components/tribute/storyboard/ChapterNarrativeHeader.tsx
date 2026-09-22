"use client";

import { Eye, EyeOff, GripVertical, Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

import { StoryboardCapacityBadge } from "@/src/components/tribute/storyboard/StoryboardCapacityBadge";
import { getChapterTheme } from "@/src/lib/wizard/chapterTheme";

type ChapterDragHandle = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};

export type ChapterNarrativeHeaderCreditCopy = {
  editCreditAria: string;
  showCreditAria: string;
  hideCreditAria: string;
};

type Props = {
  chapterIndex: number;
  title: string;
  songTitle?: string | null;
  songArtist?: string | null;
  creditLabel?: string | null;
  showCreditInSession?: boolean;
  capacity: number | null;
  assignedCount: number;
  titleEditAria: string;
  chapterReorderAria: string;
  creditCopy?: ChapterNarrativeHeaderCreditCopy;
  chapterDragHandle?: ChapterDragHandle;
  capacityCopy: {
    recommended: string;
    pending: string;
  };
  onTitleChange: (nextTitle: string) => void;
  onCreditLabelChange?: (nextLabel: string) => void;
  onShowCreditInSessionChange?: (show: boolean) => void;
};

export function ChapterNarrativeHeader({
  chapterIndex,
  title,
  songTitle,
  songArtist,
  creditLabel,
  showCreditInSession = true,
  capacity,
  assignedCount,
  titleEditAria,
  chapterReorderAria,
  creditCopy,
  chapterDragHandle,
  capacityCopy,
  onTitleChange,
  onCreditLabelChange,
  onShowCreditInSessionChange,
}: Props) {
  const theme = getChapterTheme(chapterIndex);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [isEditingCredit, setIsEditingCredit] = useState(false);
  const [creditDraft, setCreditDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const creditInputRef = useRef<HTMLInputElement>(null);

  const displayCredit = (creditLabel?.trim() || songTitle?.trim() || "") ?? "";
  const songLineParts = [displayCredit, songArtist?.trim()].filter(Boolean);
  const songLine = songLineParts.join(" · ");
  const creditVisible = showCreditInSession !== false;

  useEffect(() => {
    if (!isEditing) setDraft(title);
  }, [title, isEditing]);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  useEffect(() => {
    if (isEditingCredit) {
      setCreditDraft(displayCredit);
      creditInputRef.current?.focus();
    }
  }, [isEditingCredit, displayCredit]);

  const commitTitle = useCallback(() => {
    setIsEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== title) onTitleChange(trimmed);
  }, [draft, onTitleChange, title]);

  const commitCredit = useCallback(() => {
    setIsEditingCredit(false);
    onCreditLabelChange?.(creditDraft.trim());
  }, [creditDraft, onCreditLabelChange]);

  const handleListeners = chapterDragHandle?.listeners;
  const {
    onPointerDown: dndPointerDown,
    ...restHandleListeners
  } = handleListeners ?? {};

  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3 gap-y-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {chapterDragHandle ? (
            <button
              type="button"
              className={`mt-0.5 flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-300 active:cursor-grabbing ${theme.text}`}
              aria-label={chapterReorderAria}
              {...chapterDragHandle.attributes}
              {...restHandleListeners}
              onPointerDown={(event) => {
                dndPointerDown?.(event);
                event.stopPropagation();
              }}
            >
              <GripVertical className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </button>
          ) : null}

          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${theme.dot}`}
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
          toneClassName={theme.text}
          copy={capacityCopy}
          className="shrink-0"
        />
      </div>

      {songTitle || songArtist || creditLabel ? (
        <div className="flex min-w-0 items-center gap-2 pl-4 md:pl-12">
          {isEditingCredit && onCreditLabelChange ? (
            <input
              ref={creditInputRef}
              type="text"
              value={creditDraft}
              maxLength={80}
              aria-label={creditCopy?.editCreditAria ?? titleEditAria}
              onChange={(event) => setCreditDraft(event.target.value)}
              onBlur={commitCredit}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitCredit();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setIsEditingCredit(false);
                }
              }}
              className="min-w-0 flex-1 border-b border-current/25 bg-transparent pb-0.5 text-sm font-light italic outline-none"
              style={{ color: `rgba(${theme.glowRgb}, 0.85)` }}
            />
          ) : (
            <p
              className={`min-w-0 flex-1 truncate text-sm font-light italic tracking-[0.04em] ${
                creditVisible ? "" : "opacity-40 line-through"
              }`}
              style={{
                color: creditVisible
                  ? `rgba(${theme.glowRgb}, 0.85)`
                  : `rgba(${theme.glowRgb}, 0.45)`,
              }}
            >
              {songLine || "—"}
            </p>
          )}

          {onCreditLabelChange && creditCopy ? (
            <button
              type="button"
              onClick={() => setIsEditingCredit(true)}
              aria-label={creditCopy.editCreditAria}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
            >
              <Pencil className="h-3 w-3" strokeWidth={1.5} aria-hidden />
            </button>
          ) : null}

          {onShowCreditInSessionChange && creditCopy ? (
            <button
              type="button"
              onClick={() => onShowCreditInSessionChange(!creditVisible)}
              aria-label={
                creditVisible
                  ? creditCopy.hideCreditAria
                  : creditCopy.showCreditAria
              }
              aria-pressed={creditVisible}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
            >
              {creditVisible ? (
                <Eye className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              ) : (
                <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
