"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import type { AutosaveStatus } from "@/src/hooks/useWizardAutosave";

export type AutosaveIndicatorCopy = {
  saving: string;
  saved: string;
  error: string;
};

type AutosaveIndicatorProps = {
  status: AutosaveStatus;
  copy: AutosaveIndicatorCopy;
  className?: string;
};

/**
 * Quiet Luxury autosave feedback — floats top-right, never blocks the wizard.
 */
export function AutosaveIndicator({
  status,
  copy,
  className = "",
}: AutosaveIndicatorProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === "idle") {
      setVisible(false);
      return;
    }

    setVisible(true);

    if (status !== "saved") return;

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [status]);

  if (status === "idle" && !visible) return null;

  const isSaving = status === "saving";
  const isSaved = status === "saved";
  const isError = status === "error";

  return (
    <div
      className={`pointer-events-none absolute right-0 top-0 z-20 transition-opacity duration-700 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      } ${className}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-[#020202]/70 px-3 py-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.45)] backdrop-blur-md">
        {isSaving ? (
          <>
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500/90 motion-safe:animate-pulse"
              aria-hidden
            />
            <span className="font-[family-name:var(--font-label)] text-[10px] font-normal tracking-[0.22em] text-zinc-500 uppercase">
              {copy.saving}
            </span>
          </>
        ) : null}

        {isSaved ? (
          <>
            <Check
              className="h-3 w-3 shrink-0 text-teal-400/90"
              strokeWidth={2}
              aria-hidden
            />
            <span className="font-[family-name:var(--font-label)] text-[10px] font-normal tracking-[0.18em] text-teal-400/80 uppercase">
              {copy.saved}
            </span>
          </>
        ) : null}

        {isError ? (
          <>
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/75"
              aria-hidden
            />
            <span className="font-[family-name:var(--font-label)] text-[10px] font-normal tracking-[0.18em] text-amber-500/75 uppercase">
              {copy.error}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
