"use client";

import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
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
  pointerFromDndDelta,
  measureChapterGridInsert,
  resolveDropTarget,
  type MediaSelectionScope,
  type StoryboardChapterBlockDragData,
  type StoryboardDragSource,
  type StoryboardInsertPreview,
  type StoryboardMediaDragData,
} from "@/src/lib/wizard/storyboardDnd";
import {
  assignManyMediaToChapter,
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
  const dropTargetChapterIdRef = useRef<string | null>(null);
  const writeDropTargetChapterId = useCallback((next: string | null) => {
    dropTargetChapterIdRef.current = next;
    setDropTargetChapterId(next);
  }, []);
  const [dropTargetBank, setDropTargetBank] = useState(false);
  const [dragOverChapterIndex, setDragOverChapterIndex] = useState<
    number | null
  >(null);
  const [insertPreview, setInsertPreview] =
    useState<StoryboardInsertPreview | null>(null);
  const dragPayloadRef = useRef<{
    mediaIds: string[];
    source: StoryboardDragSource;
  } | null>(null);
  const insertPreviewRef = useRef<StoryboardInsertPreview | null>(null);

  const writeInsertPreview = useCallback(
    (next: StoryboardInsertPreview | null) => {
      insertPreviewRef.current = next;
      setInsertPreview(next);
    },
    [],
  );

  const autoScroll = useMontageAutoScroll();
  const finePointer = useFinePointer();
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 10 },
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
        writeDropTargetChapterId(null);
        setDropTargetBank(false);
        setDragOverChapterIndex(null);
        writeInsertPreview(null);
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
      writeInsertPreview(null);
    },
    [selectedMediaIds, selectionScope, storyboard, writeDropTargetChapterId, writeInsertPreview],
  );

  const syncChapterHover = useCallback(
    (event: DragOverEvent | DragMoveEvent) => {
      const { over, active } = event;
      const activeType = (active.data.current as { type?: string } | undefined)
        ?.type;
      const isChapterBlockDrag =
        activeType === STORYBOARD_CHAPTER_BLOCK_DND_TYPE;

      if (!over) {
        writeDropTargetChapterId(null);
        setDropTargetBank(false);
        setDragOverChapterIndex(null);
        writeInsertPreview(null);
        return;
      }

      const target = resolveDropTarget(String(over.id), storyboard);
      if (!target) return;

      if (target.kind === "bank") {
        setDropTargetBank(true);
        writeDropTargetChapterId(null);
        setDragOverChapterIndex(null);
        writeInsertPreview(null);
        return;
      }

      setDropTargetBank(false);
      writeDropTargetChapterId(target.chapterId);
      const chapterIndex = storyboard.chapters.findIndex(
        (chapter) => chapter.id === target.chapterId,
      );
      setDragOverChapterIndex(chapterIndex >= 0 ? chapterIndex : null);

      if (isChapterBlockDrag) {
        writeInsertPreview(null);
        return;
      }

      const pointer = pointerFromDndDelta(event.activatorEvent, event.delta);
      if (!pointer) {
        writeInsertPreview({ chapterId: target.chapterId, index: 0, line: null });
        return;
      }

      const moving = new Set(dragPayloadRef.current?.mediaIds ?? []);
      const measured = measureChapterGridInsert(
        target.chapterId,
        pointer,
        moving,
      );
      const nextPreview = {
        chapterId: target.chapterId,
        index: measured.index,
        line: measured.line,
      };
      const prev = insertPreviewRef.current;
      if (
        prev?.chapterId !== nextPreview.chapterId ||
        prev?.index !== nextPreview.index ||
        prev?.line?.left !== nextPreview.line?.left ||
        prev?.line?.top !== nextPreview.line?.top
      ) {
        writeInsertPreview(nextPreview);
      }
    },
    [storyboard, writeDropTargetChapterId, writeInsertPreview],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      syncChapterHover(event);
    },
    [syncChapterHover],
  );

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      if (!dropTargetChapterId && !event.over) return;
      syncChapterHover(event);
    },
    [dropTargetChapterId, syncChapterHover],
  );

  const clearDropTargets = useCallback(() => {
    writeDropTargetChapterId(null);
    setDropTargetBank(false);
    setDragOverChapterIndex(null);
    writeInsertPreview(null);
    dragPayloadRef.current = null;
  }, [writeDropTargetChapterId, writeInsertPreview]);

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
        const fromOver = over
          ? resolveDropTarget(String(over.id), storyboard)
          : null;
        const hoverChapterId = dropTargetChapterIdRef.current;
        const overChapterId =
          fromOver?.kind === "chapter" &&
          fromOver.chapterId !== chapterBlockData.chapterId
            ? fromOver.chapterId
            : hoverChapterId &&
                hoverChapterId !== chapterBlockData.chapterId
              ? hoverChapterId
              : null;

        if (overChapterId) {
          onStoryboardChange(
            reorderStoryboardChapters(
              storyboard,
              chapterBlockData.chapterId,
              overChapterId,
            ),
          );
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

      const movingSet = new Set(mediaIds);
      const baseIds = targetChapter.mediaIds.filter((id) => !movingSet.has(id));
      const preview = insertPreviewRef.current;
      const insertIndex =
        preview && preview.chapterId === targetChapterId
          ? Math.max(0, Math.min(preview.index, baseIds.length))
          : baseIds.length;

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
    insertPreview,
    handleDragStart,
    handleDragOver,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  };
}
