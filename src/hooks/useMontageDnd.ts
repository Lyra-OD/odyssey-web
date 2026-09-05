"use client";

import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useCallback, useRef, useState } from "react";

import { useMontageAutoScroll } from "@/src/hooks/useMontageAutoScroll";
import { useFinePointer } from "@/src/hooks/useFinePointer";
import { reorderStoryboardChapters } from "@/src/lib/wizard/storyboardHelpers";
import {
  STORYBOARD_BANK_DROPPABLE_ID,
  STORYBOARD_CHAPTER_BLOCK_DND_TYPE,
  STORYBOARD_MEDIA_DND_TYPE,
  orderBankSelection,
  orderChapterSelection,
  parseStoryboardChapterSortableId,
  parseStoryboardChapterDroppableId,
  resolveDropTarget,
  resolveInsertIndex,
  type MediaSelectionScope,
  type StoryboardChapterBlockDragData,
  type StoryboardDragSource,
  type StoryboardMediaDragData,
} from "@/src/lib/wizard/storyboardDnd";
import {
  assignManyMediaToChapter,
  reorderChapterMedia,
  unassignManyMediaFromChapters,
} from "@/src/lib/wizard/storyboardMedia";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

type UseMontageDndParams = {
  storyboard: WizardStoryboardState;
  onStoryboardChange: (next: WizardStoryboardState) => void;
  selectedMediaIds: string[];
  selectionScope: MediaSelectionScope | null;
  clearMediaSelection: () => void;
};

/** Orchestration dnd-kit (drag/drop médias + réordonnancement chapitres) pour l'Étape 5. */
export function useMontageDnd({
  storyboard,
  onStoryboardChange,
  selectedMediaIds,
  selectionScope,
  clearMediaSelection,
}: UseMontageDndParams) {
  const [activeDragIds, setActiveDragIds] = useState<string[]>([]);
  const [dropTargetChapterId, setDropTargetChapterId] = useState<
    string | null
  >(null);
  const [dropTargetBank, setDropTargetBank] = useState(false);
  const [dragOverChapterIndex, setDragOverChapterIndex] = useState<
    number | null
  >(null);
  const dragPayloadRef = useRef<{
    mediaIds: string[];
    source: StoryboardDragSource;
  } | null>(null);

  const autoScroll = useMontageAutoScroll();
  const finePointer = useFinePointer();
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 180, tolerance: 8 },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  const sensors = useSensors(
    ...(finePointer ? [pointerSensor] : [touchSensor]),
    keyboardSensor,
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeData = event.active.data.current as
        | StoryboardChapterBlockDragData
        | StoryboardMediaDragData
        | undefined;

      if (activeData?.type === STORYBOARD_CHAPTER_BLOCK_DND_TYPE) {
        dragPayloadRef.current = null;
        setActiveDragIds([]);
        return;
      }

      const activeId = String(event.active.id);
      const source = activeData?.source ?? null;
      if (!source || activeData?.type !== STORYBOARD_MEDIA_DND_TYPE) {
        dragPayloadRef.current = null;
        setActiveDragIds([activeId]);
        return;
      }

      let mediaIds: string[] = [activeId];
      if (source.kind === "bank") {
        const inBankSelection =
          selectionScope?.kind === "bank" &&
          selectedMediaIds.includes(activeId);
        mediaIds = inBankSelection
          ? orderBankSelection(storyboard.unassignedIds, selectedMediaIds)
          : [activeId];
      } else {
        const chapter = storyboard.chapters.find(
          (c) => c.id === source.chapterId,
        );
        const inChapterSelection =
          selectionScope?.kind === "chapter" &&
          selectionScope.chapterId === source.chapterId &&
          selectedMediaIds.includes(activeId);
        mediaIds = inChapterSelection
          ? orderChapterSelection(chapter?.mediaIds ?? [], selectedMediaIds)
          : [activeId];
      }

      dragPayloadRef.current = { mediaIds, source };
      setActiveDragIds(mediaIds);
    },
    [selectedMediaIds, selectionScope, storyboard],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) {
        setDropTargetChapterId(null);
        setDropTargetBank(false);
        setDragOverChapterIndex(null);
        return;
      }

      const target = resolveDropTarget(String(over.id), storyboard);
      if (!target) return;

      if (target.kind === "bank") {
        setDropTargetBank(true);
        setDropTargetChapterId(null);
        setDragOverChapterIndex(null);
        return;
      }

      setDropTargetBank(false);
      setDropTargetChapterId(target.chapterId);
      const index = storyboard.chapters.findIndex(
        (chapter) => chapter.id === target.chapterId,
      );
      setDragOverChapterIndex(index >= 0 ? index : null);
    },
    [storyboard],
  );

  const clearDropTargets = useCallback(() => {
    setDropTargetChapterId(null);
    setDropTargetBank(false);
    setDragOverChapterIndex(null);
    dragPayloadRef.current = null;
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDragIds([]);
    clearDropTargets();
  }, [clearDropTargets]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragIds([]);

      const chapterBlockData = active.data.current as
        | StoryboardChapterBlockDragData
        | undefined;
      if (chapterBlockData?.type === STORYBOARD_CHAPTER_BLOCK_DND_TYPE) {
        if (over) {
          const overChapterId =
            parseStoryboardChapterSortableId(String(over.id)) ??
            parseStoryboardChapterDroppableId(String(over.id));
          if (
            overChapterId &&
            overChapterId !== chapterBlockData.chapterId
          ) {
            onStoryboardChange(
              reorderStoryboardChapters(
                storyboard,
                chapterBlockData.chapterId,
                overChapterId,
              ),
            );
          }
        }
        clearDropTargets();
        return;
      }

      const payload = dragPayloadRef.current;
      if (!payload || payload.mediaIds.length === 0) {
        clearDropTargets();
        return;
      }

      const { mediaIds, source } = payload;

      const resolvedTarget =
        dropTargetBank
          ? ({ kind: "bank" as const })
          : dropTargetChapterId
            ? {
                kind: "chapter" as const,
                chapterId: dropTargetChapterId,
                overMediaId:
                  over &&
                  !String(over.id).startsWith("storyboard-chapter-") &&
                  over.id !== STORYBOARD_BANK_DROPPABLE_ID
                    ? String(over.id)
                    : null,
              }
            : over
              ? resolveDropTarget(String(over.id), storyboard)
              : null;

      if (!resolvedTarget) {
        clearDropTargets();
        return;
      }

      if (resolvedTarget.kind === "bank") {
        if (source.kind === "chapter") {
          onStoryboardChange(
            unassignManyMediaFromChapters(storyboard, mediaIds),
          );
        }
        clearMediaSelection();
        clearDropTargets();
        return;
      }

      const targetChapterId = resolvedTarget.chapterId;
      const targetChapter = storyboard.chapters.find(
        (c) => c.id === targetChapterId,
      );
      if (!targetChapter) {
        clearDropTargets();
        return;
      }

      if (
        source.kind === "chapter" &&
        source.chapterId === targetChapterId &&
        mediaIds.length === 1 &&
        resolvedTarget.overMediaId &&
        targetChapter.mediaIds.includes(resolvedTarget.overMediaId) &&
        resolvedTarget.overMediaId !== mediaIds[0]
      ) {
        onStoryboardChange(
          reorderChapterMedia(
            storyboard,
            targetChapterId,
            mediaIds[0],
            resolvedTarget.overMediaId,
          ),
        );
        clearMediaSelection();
        clearDropTargets();
        return;
      }

      const movingSet = new Set(mediaIds);
      const baseIds = targetChapter.mediaIds.filter((id) => !movingSet.has(id));
      const insertIndex = resolveInsertIndex(
        baseIds,
        resolvedTarget.overMediaId &&
          baseIds.includes(resolvedTarget.overMediaId)
          ? resolvedTarget.overMediaId
          : null,
      );

      onStoryboardChange(
        assignManyMediaToChapter(
          storyboard,
          targetChapterId,
          mediaIds,
          insertIndex,
        ),
      );
      clearMediaSelection();
      clearDropTargets();
    },
    [
      clearDropTargets,
      clearMediaSelection,
      dropTargetBank,
      dropTargetChapterId,
      onStoryboardChange,
      storyboard,
    ],
  );

  return {
    sensors,
    autoScroll,
    activeDragIds,
    dropTargetChapterId,
    dropTargetBank,
    dragOverChapterIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
