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
  const showCreditId = useId();
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
        <div className="space-y-3 pl-4 md:pl-12">
          {isEditingCredit && onCreditLabelChange && creditCopy ? (
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <label
                htmlFor={creditFieldId}
                className="block text-sm font-medium text-neutral-200"
              >
                {creditCopy.displayedTitleLabel}
              </label>
              <input
                ref={creditInputRef}
                id={creditFieldId}
                type="text"
                value={creditDraft}
                maxLength={80}
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
                className={`min-h-11 w-full rounded-lg border border-white/15 bg-black/40 px-3 text-base font-light text-zinc-100 outline-none placeholder:text-zinc-500 ${sanctuaryFocusRing}`}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveCredit}
                  className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 bg-white/[0.08] px-4 text-sm font-medium text-zinc-100 transition-colors hover:border-white/30 hover:bg-white/[0.12] ${sanctuaryFocusRing}`}
                >
                  {creditCopy.save}
                </button>
                <button
                  type="button"
                  onClick={cancelCredit}
                  className={`inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 bg-transparent px-4 text-sm font-medium text-neutral-300 transition-colors hover:border-white/20 hover:text-zinc-100 ${sanctuaryFocusRing}`}
                >
                  {creditCopy.cancel}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <p
                className={`min-w-0 flex-1 truncate text-sm font-light italic tracking-[0.04em] md:text-base ${
                  creditVisible ? "" : "opacity-50"
                }`}
                style={{
                  color: creditVisible
                    ? `rgba(${theme.glowRgb}, 0.85)`
                    : `rgba(${theme.glowRgb}, 0.45)`,
                }}
              >
                {songLine || "—"}
              </p>
              {onCreditLabelChange && creditCopy ? (
                <button
                  type="button"
                  onClick={() => setIsEditingCredit(true)}
                  className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-4 text-sm font-medium text-neutral-200 transition-colors hover:border-white/25 hover:bg-white/[0.08] hover:text-zinc-50 ${sanctuaryFocusRing}`}
                >
                  {creditCopy.modify}
                </button>
              ) : null}
            </div>
          )}

          {onShowCreditInSessionChange && creditCopy ? (
            <label
              htmlFor={showCreditId}
              className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-snug text-neutral-300"
            >
              <input
                id={showCreditId}
                type="checkbox"
                checked={creditVisible}
                onChange={(event) =>
                  onShowCreditInSessionChange(event.target.checked)
                }
                className={`mt-1 h-5 w-5 shrink-0 rounded border-white/25 bg-black/40 text-teal-400 focus:ring-offset-0 ${sanctuaryFocusRing}`}
              />
              <span className="pt-0.5">{creditCopy.showInSession}</span>
            </label>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
