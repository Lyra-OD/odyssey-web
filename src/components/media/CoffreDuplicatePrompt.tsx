"use client";

import { createPortal } from "react-dom";

export type CoffreDuplicatePromptCopy = {
  video: string;
  photo: string;
  unknown: string;
  skip: string;
  keep: string;
};

type Props = {
  open: boolean;
  kind: "video" | "photo";
  reason: "duplicate" | "unknown";
  copy: CoffreDuplicatePromptCopy;
  onSkip: () => void;
  onKeep: () => void;
};

export function CoffreDuplicatePrompt({
  open,
  kind,
  reason,
  copy,
  onSkip,
  onKeep,
}: Props) {
  if (!open || typeof document === "undefined") return null;

  const message =
    reason === "unknown" ? copy.unknown : kind === "video" ? copy.video : copy.photo;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[#020202]/80 px-5"
      role="dialog"
      aria-modal="true"
      aria-label={message}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#020202] p-6 shadow-[0_24px_64px_rgba(0,0,0,0.45)]">
        <p className="font-serif text-lg font-medium leading-relaxed text-zinc-100">
          {message}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="min-h-11 flex-1 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm font-light text-zinc-300"
          >
            {copy.skip}
          </button>
          <button
            type="button"
            onClick={onKeep}
            className="min-h-11 flex-[1.4] rounded-lg border border-teal-400/40 bg-teal-400/10 px-4 py-2.5 text-sm font-light text-teal-200"
          >
            {copy.keep}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
