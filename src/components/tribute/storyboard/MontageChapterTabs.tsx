"use client";

import { getChapterTheme } from "@/src/lib/wizard/chapterTheme";
import type { WizardStoryboardChapter } from "@/src/lib/wizard/wizardState";

export type MontageChapterTabsCopy = {
  ariaLabel: string;
  /** Libellés legacy DA pour les 3 premiers chapitres (Spark / Epic / Legacy). */
  tabSpark: string;
  tabEpic: string;
  tabLegacy: string;
  /** Doit contenir `{index}`. */
  tabFallback: string;
};

type Props = {
  chapters: readonly WizardStoryboardChapter[];
  activeChapterId: string;
  onSelect: (chapterId: string) => void;
  copy: MontageChapterTabsCopy;
};

function tabLabel(
  index: number,
  copy: MontageChapterTabsCopy,
): string {
  if (index === 0) return copy.tabSpark;
  if (index === 1) return copy.tabEpic;
  if (index === 2) return copy.tabLegacy;
  return copy.tabFallback.replace("{index}", String(index + 1));
}

/** Libellé d'onglet chapitre — partagé Étape 5 (tabs + banque batch). */
export function resolveMontageChapterTabLabel(
  index: number,
  copy: MontageChapterTabsCopy,
): string {
  return tabLabel(index, copy);
}

/**
 * Navigation par onglets horizontaux — un seul chapitre visible à la fois (DA).
 */
export function MontageChapterTabs({
  chapters,
  activeChapterId,
  onSelect,
  copy,
}: Props) {
  return (
    <div
      className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto border-b border-white/[0.08] px-1 pb-px"
      role="tablist"
      aria-label={copy.ariaLabel}
    >
      {chapters.map((chapter, index) => {
        const theme = getChapterTheme(index);
        const isActive = chapter.id === activeChapterId;
        const label = tabLabel(index, copy);

        return (
          <button
            key={chapter.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(chapter.id)}
            className={`relative shrink-0 px-4 py-3 text-sm font-medium tracking-wide transition-colors duration-200 ${
              isActive ? theme.text : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <span
                className={`h-1.5 w-1.5 rounded-full transition-opacity duration-200 ${
                  isActive ? theme.dot : "bg-zinc-600 opacity-60"
                }`}
                aria-hidden
              />
              {label}
            </span>
            {isActive ? (
              <span
                className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full ${theme.dot}`}
                aria-hidden
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
