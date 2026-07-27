"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { isStoryboardMontageVirgin } from "@/src/lib/wizard/storyboardAutoFill";
import {
  playMagicTimeline,
  type MagicCinematicPhase,
} from "@/src/lib/wizard/magicTimelinePlayer";
import { buildMagicTimeline } from "@/src/lib/wizard/storyboardMagicTimeline";
import { assignManyMediaToChapter } from "@/src/lib/wizard/storyboardMedia";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

type UseMagicCompositionParams = {
  storyboard: WizardStoryboardState;
  onStoryboardChange: (next: WizardStoryboardState) => void;
  chapterCapacities: readonly (number | null)[];
  clearMediaSelection: () => void;
  isLoadingMedia: boolean;
  onMagicPerformingChange?: (performing: boolean) => void;
  onMagicSequenceComplete?: () => void;
};

/** Onboarding gate + orchestration de la Composition Magique (Étape 5). */
export function useMagicComposition({
  storyboard,
  onStoryboardChange,
  chapterCapacities,
  clearMediaSelection,
  isLoadingMedia,
  onMagicPerformingChange,
  onMagicSequenceComplete,
}: UseMagicCompositionParams) {
  const [gateAcknowledged, setGateAcknowledged] = useState(false);
  const [isMagicRunning, setIsMagicRunning] = useState(false);
  const [magicPhase, setMagicPhase] = useState<MagicCinematicPhase>("idle");
  const [magicHighlightChapterId, setMagicHighlightChapterId] = useState<
    string | null
  >(null);
  const storyboardRef = useRef(storyboard);
  const magicRunIdRef = useRef(0);
  const isMagicRunningRef = useRef(false);
  const magicEntranceMediaIdsRef = useRef<Set<string>>(new Set());
  const magicEntranceStaggerRef = useRef<Map<string, number>>(new Map());
  const wasVirginRef = useRef(isStoryboardMontageVirgin(storyboard));
  storyboardRef.current = storyboard;

  useEffect(
    () => () => {
      magicRunIdRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    const isVirgin = isStoryboardMontageVirgin(storyboard);
    const wasVirgin = wasVirginRef.current;

    if (!isVirgin) {
      setGateAcknowledged(false);
    } else if (!wasVirgin && isVirgin) {
      setGateAcknowledged(false);
    }

    wasVirginRef.current = isVirgin;
  }, [storyboard]);

  const showOnboardingGate =
    isStoryboardMontageVirgin(storyboard) &&
    !isLoadingMedia &&
    !isMagicRunning &&
    !gateAcknowledged;

  const runMagicComposition = useCallback(async () => {
    if (isMagicRunningRef.current) return;
    if (storyboardRef.current.unassignedIds.length === 0) return;

    const runId = magicRunIdRef.current + 1;
    magicRunIdRef.current = runId;

    setGateAcknowledged(true);
    isMagicRunningRef.current = true;
    setIsMagicRunning(true);
    magicEntranceMediaIdsRef.current = new Set();
    magicEntranceStaggerRef.current = new Map();
    onMagicPerformingChange?.(true);
    clearMediaSelection();

    const events = buildMagicTimeline(
      storyboardRef.current,
      chapterCapacities,
    );

    await playMagicTimeline(events, {
      shouldAbort: () => magicRunIdRef.current !== runId,
      setPhase: setMagicPhase,
      setHighlightChapterId: setMagicHighlightChapterId,
      assignChapterBatch: (chapterId, mediaIds) => {
        mediaIds.forEach((mediaId, index) => {
          magicEntranceMediaIdsRef.current.add(mediaId);
          magicEntranceStaggerRef.current.set(mediaId, index);
        });
        const next = assignManyMediaToChapter(
          storyboardRef.current,
          chapterId,
          mediaIds,
        );
        storyboardRef.current = next;
        onStoryboardChange(next);
      },
    });

    if (magicRunIdRef.current !== runId) {
      flushSync(() => {
        setMagicPhase("idle");
        isMagicRunningRef.current = false;
        setIsMagicRunning(false);
        setMagicHighlightChapterId(null);
      });
      return;
    }

    flushSync(() => {
      isMagicRunningRef.current = false;
      setIsMagicRunning(false);
      setMagicHighlightChapterId(null);
    });
    onMagicPerformingChange?.(false);
    onMagicSequenceComplete?.();
  }, [
    chapterCapacities,
    clearMediaSelection,
    onMagicPerformingChange,
    onMagicSequenceComplete,
    onStoryboardChange,
  ]);

  const handleChooseMagic = useCallback(() => {
    void runMagicComposition();
  }, [runMagicComposition]);

  const handleChooseManual = useCallback(() => {
    setGateAcknowledged(true);
  }, []);

  return {
    gateAcknowledged,
    isMagicRunning,
    magicPhase,
    magicHighlightChapterId,
    storyboardRef,
    magicRunIdRef,
    isMagicRunningRef,
    magicEntranceMediaIdsRef,
    magicEntranceStaggerRef,
    showOnboardingGate,
    runMagicComposition,
    handleChooseMagic,
    handleChooseManual,
  };
}
