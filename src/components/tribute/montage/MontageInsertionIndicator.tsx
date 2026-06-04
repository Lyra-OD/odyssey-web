"use client";

import { getMontageActTheme } from "@/src/lib/wizard/montageActTheme";
import type { MontageActId } from "@/src/lib/wizard/wizardState";

type Props = {
  actId?: MontageActId;
  variant?: "act" | "unassigned";
  spanClassName?: string;
};

const UNASSIGNED_LINE =
  "bg-zinc-400 shadow-[0_0_14px_rgba(161,161,170,0.45)]";

export function MontageInsertionIndicator({
  actId = "spark",
  variant = "act",
  spanClassName = "col-span-2",
}: Props) {
  const lineClass =
    variant === "unassigned"
      ? UNASSIGNED_LINE
      : `${getMontageActTheme(actId).insertionLine} ${getMontageActTheme(actId).insertionGlow}`;

  return (
    <div
      className={`${spanClassName} pointer-events-none flex items-center py-0.5`}
      aria-hidden
    >
      <div className={`h-0.5 w-full rounded-full ${lineClass}`} />
    </div>
  );
}
