"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  uploadMediaBatch,
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

type UseMassMediaUploadOptions = {
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
  enqueue: (files: FileList | File[]) => void;
  start: (options: StartOptions) => Promise<void>;
  retryFailed: () => Promise<void>;
  retryItem: (id: string) => Promise<void>;
  removeItem: (id: string) => void;
  cancel: () => void;
  clearCompleted: () => void;
  clearAll: () => void;
};

function computeTotals(items: UploadQueueItem[]): Totals {
  return {
    total: items.length,
    queued: items.filter((i) => i.status === "queued").length,
    uploading: items.filter((i) => i.status === "uploading").length,
    uploaded: items.filter((i) => i.status === "uploaded").length,
    failed: items.filter((i) => i.status === "failed").length,
    cancelled: items.filter((i) => i.status === "cancelled").length,
  };
}

function isTerminalStatus(status: MediaUploadStatus): boolean {
  return status === "uploaded" || status === "failed" || status === "cancelled";
}

export function useMassMediaUpload(
  options?: UseMassMediaUploadOptions,
): UseMassMediaUploadReturn {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const lastStartRef = useRef<StartOptions | null>(null);

  const enqueue = useCallback((files: FileList | File[]) => {
    const list = Array.isArray(files) ? files : Array.from(files);
    if (!list.length) return;

    setItems((prev) => {
      const baseOrder = prev.length;
      const next = list.map(
        (file, idx): UploadQueueItem => ({
          id: crypto.randomUUID(),
          file,
          status: "queued",
          attempts: 0,
          error: null,
          storagePath: null,
          orderIndex: baseOrder + idx,
        }),
      );
      return [...prev, ...next];
    });
  }, []);

  const start = useCallback(
    async (startOptions: StartOptions) => {
      if (isRunning) return;
      lastStartRef.current = startOptions;

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
              prev.map((item) =>
                item.id === updatedItem.id ? updatedItem : item,
              ),
            );
          },
        });
      } finally {
        setIsRunning(false);
        abortRef.current = null;
      }
    },
    [isRunning, items, options?.bucket, options?.maxConcurrency, options?.maxRetries],
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

    // Laisse React appliquer l'état avant de relancer.
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
          if (item.status !== "failed" && item.status !== "cancelled") return item;
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

  const removeItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const target = prev.find((item) => item.id === id);
        if (!target) return prev;
        if (target.status === "uploading") return prev;
        return prev.filter((item) => item.id !== id);
      });
    },
    [],
  );

  // Auto-relance d'un batch quand de nouveaux fichiers sont enqueued
  // PENDANT qu'un batch précédent tournait : start() refuse les appels
  // concurrents (early-return sur isRunning) — sans cet effet, ces
  // fichiers resteraient bloqués en statut "queued".
  useEffect(() => {
    if (isRunning) return;
    if (!lastStartRef.current) return;
    const hasQueued = items.some((item) => item.status === "queued");
    if (!hasQueued) return;
    void start(lastStartRef.current);
  }, [isRunning, items, start]);

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
      prev.filter((item) => !isTerminalStatus(item.status)),
    );
  }, [isRunning]);

  const clearAll = useCallback(() => {
    if (isRunning) return;
    setItems([]);
  }, [isRunning]);

  const totals = useMemo(() => computeTotals(items), [items]);
  const globalProgress = useMemo(() => {
    if (!totals.total) return 0;
    return Math.round((totals.uploaded / totals.total) * 100);
  }, [totals.total, totals.uploaded]);

  return {
    items,
    totals,
    globalProgress,
    isRunning,
    enqueue,
    start,
    retryFailed,
    retryItem,
    removeItem,
    cancel,
    clearCompleted,
    clearAll,
  };
}
