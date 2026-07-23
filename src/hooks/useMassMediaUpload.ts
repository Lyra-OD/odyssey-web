"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  hydratedApiItemToGridItem,
  type HydratedMediaApiItem,
  isRemoteMediaItem,
} from "@/src/lib/media/mediaTypes";
import {
  fetchProjectMediaCached,
  invalidateProjectMediaCache,
} from "@/src/lib/media/projectMediaCache";
import {
  uploadMediaBatch,
  createLocalQueueItem,
  computeUploadProgress,
  type MediaUploadSource,
  type MediaUploadStatus,
  type UploadProgress,
  type UploadQueueItem,
} from "@/src/lib/uploads/mediaUploadService";

type StartOptions = {
  projectId: string;
  userId?: string;
  tenantId?: string;
  source?: MediaUploadSource;
};

type MoveDirection = "left" | "right";

type UseMassMediaUploadOptions = {
  projectId?: string | null;
  maxConcurrency?: number;
  maxRetries?: number;
  bucket?: string;
};

type Totals = UploadProgress;

export type UseMassMediaUploadReturn = {
  items: UploadQueueItem[];
  totals: Totals;
  globalProgress: number;
  isRunning: boolean;
  isHydrating: boolean;
  isPersistingOrder: boolean;
  deletingId: string | null;
  enqueue: (files: FileList | File[]) => void;
  start: (options: StartOptions) => Promise<void>;
  retryFailed: () => Promise<void>;
  retryItem: (id: string) => Promise<void>;
  removeItem: (id: string) => void;
  hydrateFromServer: (items: HydratedMediaApiItem[]) => void;
  moveItem: (id: string, direction: MoveDirection) => void;
  persistOrder: () => Promise<void>;
  deleteRemoteItem: (id: string) => Promise<void>;
  loadProjectMedia: (projectId: string) => Promise<void>;
  cancel: () => void;
  clearCompleted: () => void;
  clearAll: () => void;
};

const REORDER_DEBOUNCE_MS = 300;

function isTerminalStatus(status: MediaUploadStatus): boolean {
  return status === "uploaded" || status === "failed" || status === "cancelled";
}

function normalizeOrder(items: UploadQueueItem[]): UploadQueueItem[] {
  return [...items]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((item, index) => ({ ...item, orderIndex: index }));
}

function mergeHydratedItems(
  prev: UploadQueueItem[],
  apiItems: HydratedMediaApiItem[],
): UploadQueueItem[] {
  const remoteItems = apiItems.map(hydratedApiItemToGridItem);
  const remotePaths = new Set(
    remoteItems.map((item) => item.storagePath).filter(Boolean),
  );
  const remoteIds = new Set(remoteItems.map((item) => item.assetId ?? item.id));

  const localItems = prev.filter((item) => {
    if (item.origin !== "local") return false;
    if (item.storagePath && remotePaths.has(item.storagePath)) return false;
    if (item.assetId && remoteIds.has(item.assetId)) return false;
    return true;
  });

  return normalizeOrder([...remoteItems, ...localItems]);
}

export function useMassMediaUpload(
  options?: UseMassMediaUploadOptions,
): UseMassMediaUploadReturn {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [isPersistingOrder, setIsPersistingOrder] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const lastStartRef = useRef<StartOptions | null>(null);
  const projectIdRef = useRef<string | null>(options?.projectId ?? null);
  const itemsRef = useRef<UploadQueueItem[]>([]);
  const reorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistOrderRef = useRef<() => Promise<void>>(async () => {});

  projectIdRef.current = options?.projectId ?? null;
  itemsRef.current = items;

  const removeItemLocal = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (!target) return prev;
      if (target.status === "uploading") return prev;
      return normalizeOrder(prev.filter((item) => item.id !== id));
    });
  }, []);

  const enqueue = useCallback((files: FileList | File[]) => {
    const list = Array.isArray(files) ? files : Array.from(files);
    if (!list.length) return;

    setItems((prev) => {
      const baseOrder = prev.length;
      const next = list.map((file, idx) =>
        createLocalQueueItem(file, baseOrder + idx),
      );
      return normalizeOrder([...prev, ...next]);
    });
  }, []);

  const start = useCallback(
    async (startOptions: StartOptions) => {
      if (isRunning) return;
      lastStartRef.current = startOptions;
      projectIdRef.current = startOptions.projectId;

      const queued = items.filter((item) => item.status === "queued");
      if (!queued.length) return;

      const controller = new AbortController();
      abortRef.current = controller;
      setIsRunning(true);

      try {
        await uploadMediaBatch({
          projectId: startOptions.projectId,
          userId: startOptions.userId,
          tenantId: startOptions.tenantId,
          source: startOptions.source ?? "local",
          bucket: options?.bucket ?? "user-assets",
          maxConcurrency: options?.maxConcurrency ?? 4,
          maxRetries: options?.maxRetries ?? 2,
          signal: controller.signal,
          items: queued,
          onItemUpdate: (updatedItem) => {
            setItems((prev) =>
              normalizeOrder(
                prev.map((item) => {
                  if (item.id === updatedItem.id) return updatedItem;
                  // Filet si id a été muté en assetId (anciens clients / race)
                  if (
                    updatedItem.assetId &&
                    (item.assetId === updatedItem.assetId ||
                      (item.assetId == null &&
                        item.status === "uploading" &&
                        updatedItem.status === "uploaded" &&
                        item.orderIndex === updatedItem.orderIndex))
                  ) {
                    return updatedItem;
                  }
                  return item;
                }),
              ),
            );
          },
        });
        invalidateProjectMediaCache(startOptions.projectId);
      } finally {
        setIsRunning(false);
        abortRef.current = null;
      }
    },
    [isRunning, items, options?.bucket, options?.maxConcurrency, options?.maxRetries],
  );

  const persistOrder = useCallback(async () => {
    const projectId = projectIdRef.current;
    if (!projectId) return;

    const snapshot = normalizeOrder(itemsRef.current);
    const payload = snapshot
      .map((item, index) => ({ item, index }))
      .filter(
        ({ item }) => item.assetId && item.status === "uploaded",
      )
      .map(({ item, index }) => ({
        id: item.assetId as string,
        order_index: index,
      }));

    if (!payload.length) return;

    setIsPersistingOrder(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/media/reorder`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string; error?: string }
          | null;
        throw new Error(body?.message ?? body?.error ?? `HTTP ${res.status}`);
      }

      setItems((prev) =>
        normalizeOrder(
          prev.map((item) => {
            const idx = payload.findIndex((entry) => entry.id === item.assetId);
            if (idx === -1) return item;
            return { ...item, orderIndex: idx };
          }),
        ),
      );
    } finally {
      setIsPersistingOrder(false);
    }
  }, []);

  persistOrderRef.current = persistOrder;

  const schedulePersistOrder = useCallback(() => {
    if (reorderTimerRef.current) {
      clearTimeout(reorderTimerRef.current);
    }
    reorderTimerRef.current = setTimeout(() => {
      reorderTimerRef.current = null;
      void persistOrderRef.current();
    }, REORDER_DEBOUNCE_MS);
  }, []);

  const hydrateFromServer = useCallback((apiItems: HydratedMediaApiItem[]) => {
    setItems((prev) => mergeHydratedItems(prev, apiItems));
  }, []);

  const moveItem = useCallback(
    (id: string, direction: MoveDirection) => {
      setItems((prev) => {
        const sorted = normalizeOrder(prev);
        const index = sorted.findIndex((item) => item.id === id);
        if (index === -1) return prev;

        const swapIndex = direction === "left" ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= sorted.length) return prev;

        const next = [...sorted];
        [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
        const reordered = normalizeOrder(next);
        schedulePersistOrder();
        return reordered;
      });
    },
    [schedulePersistOrder],
  );

  const deleteRemoteItem = useCallback(
    async (id: string) => {
      const projectId = projectIdRef.current;
      if (!projectId) return;

      const target = itemsRef.current.find((item) => item.id === id);
      if (!target) return;

      const assetId =
        target.assetId ?? (isRemoteMediaItem(target) ? target.id : null);
      if (!assetId) {
        removeItemLocal(id);
        return;
      }

      const backup = target;
      setDeletingId(id);
      const nextItems = normalizeOrder(
        itemsRef.current.filter((item) => item.id !== id),
      );
      itemsRef.current = nextItems;
      setItems(nextItems);

      try {
        const res = await fetch(
          `/api/projects/${projectId}/media/${assetId}`,
          { method: "DELETE" },
        );

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { message?: string; error?: string }
            | null;
          throw new Error(body?.message ?? body?.error ?? `HTTP ${res.status}`);
        }

        invalidateProjectMediaCache(projectId);

        const remaining = itemsRef.current;
        if (remaining.some((item) => item.assetId)) {
          await persistOrderRef.current();
        }
      } catch {
        itemsRef.current = normalizeOrder([...itemsRef.current, backup]);
        setItems((prev) => {
          const exists = prev.some((item) => item.id === backup.id);
          if (exists) return prev;
          return itemsRef.current;
        });
      } finally {
        setDeletingId(null);
      }
    },
    [removeItemLocal],
  );

  const removeItem = useCallback(
    (id: string) => {
      removeItemLocal(id);
    },
    [removeItemLocal],
  );

  const loadProjectMedia = useCallback(
    async (projectId: string) => {
      setIsHydrating(true);
      projectIdRef.current = projectId;
      try {
        const apiItems = await fetchProjectMediaCached(projectId);
        hydrateFromServer(apiItems);
      } finally {
        setIsHydrating(false);
      }
    },
    [hydrateFromServer],
  );

  const retryFailed = useCallback(async () => {
    if (isRunning) return;
    const latestStart = lastStartRef.current;
    if (!latestStart) return;

    setItems((prev) =>
      prev.map((item) =>
        item.status === "failed"
          ? { ...item, status: "queued", error: null }
          : item,
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    await start(latestStart);
  }, [isRunning, start]);

  const retryItem = useCallback(
    async (id: string) => {
      if (isRunning) return;
      const latestStart = lastStartRef.current;
      if (!latestStart) return;
      let found = false;
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          if (item.status !== "failed" && item.status !== "cancelled") {
            return item;
          }
          found = true;
          return { ...item, status: "queued", error: null };
        }),
      );
      if (!found) return;
      await new Promise((resolve) => setTimeout(resolve, 0));
      await start(latestStart);
    },
    [isRunning, start],
  );

  useEffect(() => {
    if (isRunning) return;
    if (!lastStartRef.current) return;
    const hasQueued = items.some((item) => item.status === "queued");
    if (!hasQueued) return;
    void start(lastStartRef.current);
  }, [isRunning, items, start]);

  useEffect(() => {
    return () => {
      if (reorderTimerRef.current) {
        clearTimeout(reorderTimerRef.current);
      }
    };
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setItems((prev) =>
      prev.map((item) =>
        item.status === "queued" || item.status === "uploading"
          ? { ...item, status: "cancelled", error: "Upload cancelled by user" }
          : item,
      ),
    );
  }, []);

  const clearCompleted = useCallback(() => {
    if (isRunning) return;
    setItems((prev) =>
      normalizeOrder(prev.filter((item) => !isTerminalStatus(item.status))),
    );
  }, [isRunning]);

  const clearAll = useCallback(() => {
    if (isRunning) return;
    setItems([]);
  }, [isRunning]);

  const totals = useMemo(() => computeUploadProgress(items), [items]);
  const globalProgress = useMemo(() => {
    if (!totals.total) return 0;
    return Math.round((totals.uploaded / totals.total) * 100);
  }, [totals.total, totals.uploaded]);

  return {
    items,
    totals,
    globalProgress,
    isRunning,
    isHydrating,
    isPersistingOrder,
    deletingId,
    enqueue,
    start,
    retryFailed,
    retryItem,
    removeItem,
    hydrateFromServer,
    moveItem,
    persistOrder,
    deleteRemoteItem,
    loadProjectMedia,
    cancel,
    clearCompleted,
    clearAll,
  };
}

/** Fetches project media from API (session cache). Prefer this over a raw fetch. */
export async function fetchProjectMedia(
  projectId: string,
  options?: { force?: boolean },
): Promise<HydratedMediaApiItem[]> {
  return fetchProjectMediaCached(projectId, options);
}

export { invalidateProjectMediaCache } from "@/src/lib/media/projectMediaCache";
