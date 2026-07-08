"use client";

import { useState } from "react";

export type ChapterActionClusterCopy = {
  autoFill: string;
  clear: string;
  manage: string;
  clearConfirmTitle: string;
  clearConfirmCancel: string;
  clearConfirmAction: string;
};

type Props = {
  hasMedia: boolean;
  hasUnassigned: boolean;
  copy: ChapterActionClusterCopy;
  onAutoFill: () => void;
  onClear: () => void;
  onManage: () => void;
};

export function ChapterActionCluster({
  hasMedia,
  hasUnassigned,
  copy,
  onAutoFill,
  onClear,
  onManage,
}: Props) {
  const [confirmClear, setConfirmClear] = useState(false);

  const buttonClass =
    "inline-flex min-h-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-light text-zinc-300 transition-colors duration-200 hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40";

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    onClear();
    setConfirmClear(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          disabled={!hasUnassigned}
          onClick={onAutoFill}
        >
          {copy.autoFill}
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={!hasMedia}
          onClick={handleClear}
        >
          {copy.clear}
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={!hasMedia}
          onClick={onManage}
        >
          {copy.manage}
        </button>
      </div>

      {confirmClear ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <p className="text-sm font-light text-zinc-400">
            {copy.clearConfirmTitle}
          </p>
          <button
            type="button"
            className="text-xs font-light text-zinc-500 underline decoration-white/15 underline-offset-4 hover:text-zinc-300"
            onClick={() => setConfirmClear(false)}
          >
            {copy.clearConfirmCancel}
          </button>
          <button
            type="button"
            className="text-xs font-medium text-amber-300/90 hover:text-amber-200"
            onClick={handleClear}
          >
            {copy.clearConfirmAction}
          </button>
        </div>
      ) : null}
    </div>
  );
}
