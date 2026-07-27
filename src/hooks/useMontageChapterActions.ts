"use client";

import { useCallback } from "react";

import {
  autoFillChapter,
  clearChapterMedia,
} from "@/src/lib/wizard/storyboardAutoFill";
import { setChapterLabel } from "@/src/lib/wizard/storyboardHelpers";
import {
  chapterRecommendedCapacity,
  resolveTargetSecondsPerMedia,
} from "@/src/lib/wizard/storyboardPacing";
import type { PackageId } from "@/src/lib/wizard/wizardDeliverables";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

type UseMontageChapterActionsParams = {
  storyboard: WizardStoryboardState;
  onStoryboardChange: (next: WizardStoryboardState) => void;
  packageId: PackageId;
  setRefinementChapterId: (chapterId: string | null) => void;
};

/** Actions par chapitre (titre, auto-remplissage, vidage, panneau de gestion). */
export function useMontageChapterActions({
  storyboard,
  onStoryboardChange,
  packageId,
  setRefinementChapterId,
}: UseMontageChapterActionsParams) {
  const handleTitleChange = useCallback(
    (chapterId: string, nextTitle: string) => {
      onStoryboardChange(setChapterLabel(storyboard, chapterId, nextTitle));
    },
    [onStoryboardChange, storyboard],
  );

  const handleAutoFill = useCallback(
    (chapterId: string) => {
      const chapter = storyboard.chapters.find((c) => c.id === chapterId);
      if (!chapter) return;
      const capacity = chapterRecommendedCapacity(
        chapter.song?.durationSec,
        resolveTargetSecondsPerMedia(packageId, chapter.mood),
      );
      const next = autoFillChapter(storyboard, chapterId, capacity);
      onStoryboardChange(next);
    },
    [onStoryboardChange, packageId, storyboard],
  );

  const handleClear = useCallback(
    (chapterId: string) => {
      onStoryboardChange(clearChapterMedia(storyboard, chapterId));
    },
    [onStoryboardChange, storyboard],
  );

  const handleManage = useCallback(
    (chapterId: string) => {
      setRefinementChapterId(chapterId);
    },
    [setRefinementChapterId],
  );

  return {
    handleTitleChange,
    handleAutoFill,
    handleClear,
    handleManage,
  };
}
