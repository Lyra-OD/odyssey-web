"use client";

import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";

export type MontageSelectionBarCopy = {
  selectAll: string;
  clearSelection: string;
  selectionCount: string;
  allSelected: string;
  selectionHint: string;
  shortcutEscape: string;
};

type Props = {
  totalCount: number;
  selectedCount: number;
  copy: MontageSelectionBarCopy;
  onSelectAll: () => void;
  onClearSelection: () => void;
};

type CheckboxState = "none" | "partial" | "all";

function resolveCheckboxState(
  totalCount: number,
  selectedCount: number,
): CheckboxState {
  if (selectedCount <= 0 || totalCount <= 0) return "none";
  if (selectedCount >= totalCount) return "all";
  return "partial";
}

export function MontageSelectionBar({
  totalCount,
  selectedCount,
  copy,
  onSelectAll,
  onClearSelection,
}: Props) {
  const checkboxState = resolveCheckboxState(totalCount, selectedCount);
  const hasSelection = selectedCount > 0;

  const statusLabel =
    checkboxState === "all"
      ? copy.allSelected.replace("{total}", String(totalCount))
      : checkboxState === "partial"
        ? copy.selectionCount
            .replace("{selected}", String(selectedCount))
            .replace("{total}", String(totalCount))
        : copy.selectAll;

  const handleToggle = () => {
    if (checkboxState === "all") onClearSelection();
    else onSelectAll();
  };

  return (
    <motion.div
      layout
      className={`mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 transition-colors duration-300 ${
        hasSelection
          ? "border-teal-400/20 bg-teal-400/[0.05]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={
            checkboxState === "all"
              ? true
              : checkboxState === "partial"
                ? "mixed"
                : false
          }
          aria-label={copy.selectAll}
          onClick={handleToggle}
          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020202] ${
            checkboxState === "all"
              ? "border-teal-400 bg-teal-400 text-[#020202] shadow-[0_0_12px_rgba(45,212,191,0.35)]"
              : checkboxState === "partial"
                ? "border-teal-400/70 bg-teal-400/15 text-teal-300"
                : "border-zinc-600 bg-zinc-900/80 hover:border-zinc-500"
          }`}
        >
          {checkboxState === "all" ? (
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
          ) : checkboxState === "partial" ? (
            <Minus className="h-3 w-3" strokeWidth={3} aria-hidden />
          ) : null}
        </button>

        <motion.p
          key={statusLabel}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`truncate text-xs ${
            hasSelection
              ? "font-medium text-teal-200/95"
              : "font-light text-zinc-400"
          }`}
        >
          {statusLabel}
        </motion.p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {checkboxState === "partial" ? (
          <button
            type="button"
            onClick={onSelectAll}
            className="text-xs text-teal-400/90 transition-colors hover:text-teal-300"
          >
            {copy.selectAll}
          </button>
        ) : null}

        {hasSelection ? (
          <>
            <p className="hidden text-xs text-zinc-500 sm:block">
              {copy.selectionHint}
            </p>
            <span className="hidden text-zinc-700 sm:inline" aria-hidden>
              ·
            </span>
            <p className="hidden text-xs text-zinc-500 md:block">
              {copy.shortcutEscape}
            </p>
            <button
              type="button"
              onClick={onClearSelection}
              className="text-xs text-zinc-500 underline decoration-zinc-600 underline-offset-4 transition-colors hover:text-zinc-300"
            >
              {copy.clearSelection}
            </button>
          </>
        ) : null}
      </div>
    </motion.div>
  );
}
