"use client";

import { createPortal } from "react-dom";

import { getChapterCardTheme } from "@/src/lib/wizard/chapterTheme";
import type { GridInsertLine } from "@/src/lib/wizard/storyboardDnd";

type Props = {
  chapterIndex: number;
  line: GridInsertLine;
};

/** Barre d'insertion viewport — entre deux souvenirs, au-dessus de Composer. */
export function CanvasInsertLine({ chapterIndex, line }: Props) {
  const theme = getChapterCardTheme(chapterIndex);
  const node = (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[90]"
      style={{
        left: line.left,
        top: line.top,
        width: 4,
        height: line.height,
      }}
    >
      <span
        className={`block h-full w-full rounded-full ${theme.focalBg} shadow-[0_0_16px_currentColor]`}
      />
    </div>
  );

  if (typeof document === "undefined") return node;
  return createPortal(node, document.body);
}
