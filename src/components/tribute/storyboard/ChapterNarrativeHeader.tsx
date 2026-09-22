"use client";

import { GripVertical } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

import { StoryboardCapacityBadge } from "@/src/components/tribute/storyboard/StoryboardCapacityBadge";
import { sanctuaryFocusRing } from "@/src/lib/contribute/sanctuaryChrome";
import { getChapterTheme } from "@/src/lib/wizard/chapterTheme";

type ChapterDragHandle = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};

export type ChapterNarrativeHeaderCreditCopy = {
  modify: string;
  displayedTitleLabel: string;
  displayedTitlePlaceholder: string;
  save: string;
  cancel: string;
  showInSession: string;
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
  const creditFieldId = useId();
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
  const hasSong = Boolean(songTitle || songArtist || creditLabel);

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

  const saveCredit = useCallback(() => {
    setIsEditingCredit(false);
    onCreditLabelChange?.(creditDraft.trim());
  }, [creditDraft, onCreditLabelChange]);

  const cancelCredit = useCallback(() => {
    setIsEditingCredit(false);
    setCreditDraft(displayCredit);
  }, [displayCredit]);

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

      {hasSong ? (
        <div className="pl-4 md:pl-12">
          {isEditingCredit && onCreditLabelChange && creditCopy ? (
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <input
                ref={creditInputRef}
                id={creditFieldId}
                type="text"
                value={creditDraft}
                maxLength={80}
                aria-label={creditCopy.displayedTitleLabel}
                placeholder={creditCopy.displayedTitlePlaceholder}
                onChange={(event) => setCreditDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    saveCredit();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelCredit();
                  }
                }}
                className={`min-w-0 flex-1 rounded-md border border-white/20 bg-black/40 px-2 py-1 text-xs font-light text-white outline-none placeholder:text-zinc-500 ${sanctuaryFocusRing}`}
              />
              <button
                type="button"
                onClick={saveCredit}
                className={`text-xs font-medium tracking-wide text-neutral-200 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white hover:decoration-white/40 ${sanctuaryFocusRing} rounded-sm`}
              >
                {creditCopy.save}
              </button>
              <button
                type="button"
                onClick={cancelCredit}
                className={`text-xs font-medium tracking-wide text-neutral-500 transition-colors hover:text-neutral-300 ${sanctuaryFocusRing} rounded-sm`}
              >
                {creditCopy.cancel}
              </button>
            </div>
          ) : (
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2">
              <p
                className={`min-w-0 max-w-[min(100%,28rem)] truncate text-xs font-light italic tracking-[0.04em] sm:text-sm ${
                  creditVisible ? "" : "opacity-45"
                }`}
                style={{
                  color: creditVisible
                    ? `rgba(${theme.glowRgb}, 0.85)`
                    : `rgba(${theme.glowRgb}, 0.4)`,
                }}
              >
                {songLine || "—"}
              </p>

              {onCreditLabelChange && creditCopy ? (
                <button
                  type="button"
                  onClick={() => setIsEditingCredit(true)}
                  className={`inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-neutral-300 transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-neutral-100 ${sanctuaryFocusRing}`}
                >
                  {creditCopy.modify}
                </button>
              ) : null}

              {onShowCreditInSessionChange && creditCopy ? (
                <>
                  <span
                    className="hidden text-neutral-600 sm:inline"
                    aria-hidden
                  >
                    ·
                  </span>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={creditVisible}
                    aria-label={creditCopy.showInSession}
                    onClick={() =>
                      onShowCreditInSessionChange(!creditVisible)
                    }
                    className={`group inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md px-1 text-xs text-neutral-400 transition-colors hover:text-neutral-200 ${sanctuaryFocusRing}`}
                  >
                    <span
                      className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-white/20 bg-white/[0.05] transition-colors group-hover:border-white/30"
                      aria-hidden
                    >
                      {creditVisible ? (
                        <span
                          className="h-2 w-2 rounded-[2px]"
                          style={{ backgroundColor: `rgb(${theme.glowRgb})` }}
                        />
                      ) : null}
                    </span>
                    <span>{creditCopy.showInSession}</span>
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </header>
  );
}
