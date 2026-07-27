"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getBankSelectionRangeIds,
  getChapterSelectionRangeIds,
  orderBankSelection,
  orderChapterSelection,
  type MediaSelectionScope,
} from "@/src/lib/wizard/storyboardDnd";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

type UseMontageMediaSelectionParams = {
  storyboard: WizardStoryboardState;
};

/** Sélection multi-média (banque + chapitres) pour l'Étape 5 — Livre Ouvert. */
export function useMontageMediaSelection({
  storyboard,
}: UseMontageMediaSelectionParams) {
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [selectionScope, setSelectionScope] =
    useState<MediaSelectionScope | null>(null);
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(
    null,
  );

  const clearMediaSelection = useCallback(() => {
    setSelectedMediaIds([]);
    setSelectionScope(null);
    setSelectionAnchorId(null);
  }, []);

  const pruneInvalidSelection = useCallback(() => {
    setSelectedMediaIds((prev) => {
      if (prev.length === 0) return prev;

      let validIds: readonly string[];
      if (selectionScope?.kind === "bank") {
        validIds = storyboard.unassignedIds;
      } else if (selectionScope?.kind === "chapter") {
        const chapter = storyboard.chapters.find(
          (c) => c.id === selectionScope.chapterId,
        );
        validIds = chapter?.mediaIds ?? [];
      } else {
        return [];
      }

      const validSet = new Set(validIds);
      const pruned = prev.filter((id) => validSet.has(id));
      return pruned.length === prev.length ? prev : pruned;
    });
  }, [selectionScope, storyboard.chapters, storyboard.unassignedIds]);

  useEffect(() => {
    pruneInvalidSelection();
  }, [pruneInvalidSelection]);

  const handleToggleMediaSelect = useCallback(
    (assetId: string, chapterId?: string) => {
      const nextScope: MediaSelectionScope = chapterId
        ? { kind: "chapter", chapterId }
        : { kind: "bank" };

      setSelectionScope((prevScope) => {
        const scopeChanged =
          !prevScope ||
          prevScope.kind !== nextScope.kind ||
          (nextScope.kind === "chapter" &&
            prevScope.kind === "chapter" &&
            prevScope.chapterId !== nextScope.chapterId);

        if (scopeChanged) {
          setSelectedMediaIds([assetId]);
          setSelectionAnchorId(assetId);
          return nextScope;
        }

        setSelectedMediaIds((prev) => {
          const next = new Set(prev);
          if (next.has(assetId)) next.delete(assetId);
          else next.add(assetId);
          return [...next];
        });
        setSelectionAnchorId(assetId);
        return prevScope;
      });
    },
    [],
  );

  const handleShiftMediaSelect = useCallback(
    (assetId: string, chapterId?: string) => {
      const nextScope: MediaSelectionScope = chapterId
        ? { kind: "chapter", chapterId }
        : { kind: "bank" };

      setSelectionScope((prevScope) => {
        const scopeChanged =
          !prevScope ||
          prevScope.kind !== nextScope.kind ||
          (nextScope.kind === "chapter" &&
            prevScope.kind === "chapter" &&
            prevScope.chapterId !== nextScope.chapterId);

        const anchor =
          !scopeChanged && selectionAnchorId ? selectionAnchorId : assetId;

        if (chapterId) {
          const chapter = storyboard.chapters.find((c) => c.id === chapterId);
          setSelectedMediaIds(
            getChapterSelectionRangeIds(
              chapter?.mediaIds ?? [],
              anchor,
              assetId,
            ),
          );
        } else {
          setSelectedMediaIds(
            getBankSelectionRangeIds(
              storyboard.unassignedIds,
              anchor,
              assetId,
            ),
          );
        }

        setSelectionAnchorId(anchor);
        return nextScope;
      });
    },
    [selectionAnchorId, storyboard.chapters, storyboard.unassignedIds],
  );

  const handleSelectAllBank = useCallback(() => {
    setSelectionScope({ kind: "bank" });
    setSelectedMediaIds([...storyboard.unassignedIds]);
    setSelectionAnchorId(storyboard.unassignedIds[0] ?? null);
  }, [storyboard.unassignedIds]);

  const handleDeselectAll = useCallback(() => {
    setSelectedMediaIds([]);
    setSelectionScope(null);
    setSelectionAnchorId(null);
  }, []);

  const resolveBankDragMediaIds = useCallback(
    (assetId: string) => {
      if (
        selectionScope?.kind === "bank" &&
        selectedMediaIds.includes(assetId)
      ) {
        return orderBankSelection(storyboard.unassignedIds, selectedMediaIds);
      }
      return [assetId];
    },
    [selectedMediaIds, selectionScope, storyboard.unassignedIds],
  );

  const resolveChapterDragMediaIds = useCallback(
    (assetId: string, chapterId: string) => {
      if (
        selectionScope?.kind === "chapter" &&
        selectionScope.chapterId === chapterId &&
        selectedMediaIds.includes(assetId)
      ) {
        const chapter = storyboard.chapters.find((c) => c.id === chapterId);
        return orderChapterSelection(chapter?.mediaIds ?? [], selectedMediaIds);
      }
      return [assetId];
    },
    [selectedMediaIds, selectionScope, storyboard.chapters],
  );

  const visibleBankSelection =
    selectionScope?.kind === "bank" ? selectedMediaIds : [];

  return {
    selectedMediaIds,
    selectionScope,
    selectionAnchorId,
    clearMediaSelection,
    pruneInvalidSelection,
    handleToggleMediaSelect,
    handleShiftMediaSelect,
    handleSelectAllBank,
    handleDeselectAll,
    resolveBankDragMediaIds,
    resolveChapterDragMediaIds,
    visibleBankSelection,
  };
}
