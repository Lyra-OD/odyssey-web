"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useDropzone,
  type Accept,
  type DropzoneInputProps,
  type DropzoneRootProps,
  type FileRejection,
} from "react-dropzone";
import {
  useMassMediaUpload,
  type UseMassMediaUploadReturn,
} from "@/src/hooks/useMassMediaUpload";
import { isRemoteMediaItem } from "@/src/lib/media/mediaTypes";
import type { MediaUploadSource } from "@/src/lib/uploads/mediaUploadService";

const DEFAULT_MAX_FILES = 150;
const DEFAULT_MAX_FILE_SIZE = 300 * 1024 * 1024; // 300 MB

const DEFAULT_ACCEPT: Accept = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/heic": [".heic"],
  "image/heif": [".heif"],
  "video/mp4": [".mp4"],
  "video/quicktime": [".mov"],
};

/**
 * Extensions tolérées même quand le navigateur renvoie un MIME vide.
 * Chrome / Firefox / Edge ne reconnaissent pas HEIC/HEIF nativement et
 * renvoient `file.type = ""` pour ces fichiers — sans ce validator,
 * react-dropzone les rejette silencieusement comme `file-invalid-type`.
 */
const EXTENSION_FALLBACK = /\.(heic|heif)$/i;

const customFileValidator = (file: File): { code: string; message: string } | null => {
  // Si le navigateur a fourni un MIME, on laisse react-dropzone décider via `accept`.
  if (file.type) return null;
  // MIME vide : accepter si l'extension est dans la liste de fallback.
  if (EXTENSION_FALLBACK.test(file.name)) return null;
  return {
    code: "file-invalid-type",
    message: "Format non supporté (extension ou type MIME).",
  };
};

type AdapterCode =
  | "file-invalid-type"
  | "file-too-large"
  | "too-many-files"
  | "too-many-files-cumulative"
  | "unknown";

export type MediaDropzoneRejection = {
  fileName: string;
  fileSize: number;
  fileType: string;
  code: AdapterCode;
  message: string;
};

export type MediaDropzoneSummary = {
  total: number;
  uploaded: number;
  failed: number;
  cancelled: number;
};

export type MediaDropzoneAdapterRenderContext = {
  // Bindings Dropzone à brancher sur la future UI (root + input invisibles).
  getRootProps: <T extends DropzoneRootProps>(props?: T) => T;
  getInputProps: <T extends DropzoneInputProps>(props?: T) => T;
  open: () => void;

  // Etats drag/drop pour animer l'UI "Dark Studio".
  isDragActive: boolean;
  isDragAccept: boolean;
  isDragReject: boolean;
  isFileDialogActive: boolean;

  // Etat upload (provenant du hook headless existant).
  items: UseMassMediaUploadReturn["items"];
  totals: UseMassMediaUploadReturn["totals"];
  globalProgress: number;
  isRunning: boolean;
  isHydrating: boolean;
  isPersistingOrder: boolean;
  deletingId: string | null;

  // Rejets normalisés (pour surface UI dédiée aux erreurs).
  rejections: MediaDropzoneRejection[];
  clearRejections: () => void;

  // Métadonnées utiles d'intégration.
  remainingSlots: number;
  maxFiles: number;
  maxFileSizeBytes: number;

  // Actions exposées à l'interface.
  start: () => Promise<void>;
  cancel: () => void;
  retryFailed: () => Promise<void>;
  retryItem: (id: string) => Promise<void>;
  removeItem: (id: string) => void;
  deleteRemoteItem: (id: string) => Promise<void>;
  handleRemoveItem: (id: string) => void;
  clearCompleted: () => void;
  clearAll: () => void;
};

export type MediaDropzoneAdapterProps = {
  projectId: string;
  userId?: string;
  tenantId?: string;
  source?: MediaUploadSource;

  maxFiles?: number;
  maxFileSizeBytes?: number;
  maxConcurrency?: number;
  maxRetries?: number;
  bucket?: string;
  accept?: Accept;
  disabled?: boolean;
  autoStart?: boolean;

  /**
   * Message affiché pour les fichiers en excès du quota cumulatif
   * (`too-many-files-cumulative`). Support du placeholder `{max}`.
   * Permet à l'appelant d'injecter une copy localisée (fr/en) plutôt
   * que le message anglais par défaut.
   */
  overflowRejectionMessage?: string;

  onFilesRejected?: (rejections: MediaDropzoneRejection[]) => void;
  onUploadComplete?: (summary: MediaDropzoneSummary) => void;
  onUploadError?: (error: Error) => void;

  children: (context: MediaDropzoneAdapterRenderContext) => React.ReactNode;
};

function normalizeDropzoneRejections(
  fileRejections: FileRejection[],
): MediaDropzoneRejection[] {
  return fileRejections.flatMap((rejection) =>
    rejection.errors.map((error) => {
      const code = (error.code as AdapterCode) ?? "unknown";
      return {
        fileName: rejection.file.name,
        fileSize: rejection.file.size,
        fileType: rejection.file.type,
        code,
        message: error.message,
      };
    }),
  );
}

export function MediaDropzoneAdapter({
  projectId,
  userId,
  tenantId,
  source = "local",
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE,
  maxConcurrency = 4,
  maxRetries = 2,
  bucket = "user-assets",
  accept = DEFAULT_ACCEPT,
  disabled = false,
  autoStart = false,
  overflowRejectionMessage,
  onFilesRejected,
  onUploadComplete,
  onUploadError,
  children,
}: MediaDropzoneAdapterProps) {
  const upload = useMassMediaUpload({
    projectId,
    maxConcurrency,
    maxRetries,
    bucket,
  });

  const [rejections, setRejections] = useState<MediaDropzoneRejection[]>([]);
  const wasRunningRef = useRef(false);
  const hydratedProjectRef = useRef<string | null>(null);

  const remainingSlots = useMemo(() => {
    const used = upload.items.length;
    return Math.max(0, maxFiles - used);
  }, [maxFiles, upload.items.length]);

  const clearRejections = useCallback(() => {
    setRejections([]);
  }, []);

  const appendRejections = useCallback(
    (next: MediaDropzoneRejection[]) => {
      if (!next.length) return;
      setRejections((prev) => [...prev, ...next]);
      onFilesRejected?.(next);
    },
    [onFilesRejected],
  );

  const start = useCallback(async () => {
    try {
      await upload.start({
        projectId,
        userId,
        tenantId,
        source,
      });
    } catch (error) {
      onUploadError?.(
        error instanceof Error ? error : new Error("Unknown upload error"),
      );
    }
  }, [onUploadError, projectId, source, tenantId, upload, userId]);

  const retryFailed = useCallback(async () => {
    try {
      await upload.retryFailed();
    } catch (error) {
      onUploadError?.(
        error instanceof Error ? error : new Error("Unknown retry error"),
      );
    }
  }, [onUploadError, upload]);

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      const normalized = normalizeDropzoneRejections(fileRejections);
      if (normalized.length) appendRejections(normalized);

      if (!acceptedFiles.length) return;

      const allowed = acceptedFiles.slice(0, remainingSlots);
      const overflow = acceptedFiles.slice(remainingSlots);

      if (overflow.length) {
        const message =
          overflowRejectionMessage?.replace("{max}", String(maxFiles)) ??
          `Maximum ${maxFiles} files allowed in total queue.`;
        const overflowRejections: MediaDropzoneRejection[] = overflow.map(
          (file) => ({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            code: "too-many-files-cumulative",
            message,
          }),
        );
        appendRejections(overflowRejections);
      }

      if (!allowed.length) return;

      upload.enqueue(allowed);

      if (autoStart) {
        await start();
      }
    },
    [
      appendRejections,
      autoStart,
      maxFiles,
      overflowRejectionMessage,
      remainingSlots,
      start,
      upload,
    ],
  );

  const { getRootProps, getInputProps, open, isDragActive, isDragAccept, isDragReject, isFileDialogActive } =
    useDropzone({
      disabled: disabled || remainingSlots <= 0,
      noClick: true,
      noKeyboard: true,
      accept,
      maxSize: maxFileSizeBytes,
      maxFiles,
      onDrop,
      validator: customFileValidator,
    });

  const handleRemoveItem = useCallback(
    (id: string) => {
      const target = upload.items.find((item) => item.id === id);
      if (!target) return;

      if (
        isRemoteMediaItem(target) ||
        (target.status === "uploaded" && target.assetId)
      ) {
        void upload.deleteRemoteItem(id).catch((error) => {
          onUploadError?.(
            error instanceof Error ? error : new Error("Delete failed"),
          );
        });
        return;
      }

      upload.removeItem(id);
    },
    [onUploadError, upload],
  );

  useEffect(() => {
    if (!projectId) return;
    if (hydratedProjectRef.current === projectId) return;
    hydratedProjectRef.current = projectId;

    void upload.loadProjectMedia(projectId).catch((error) => {
      hydratedProjectRef.current = null;
      onUploadError?.(
        error instanceof Error ? error : new Error("Media hydration failed"),
      );
    });
  }, [onUploadError, projectId, upload.loadProjectMedia]);

  useEffect(() => {
    // Détection de fin d'exécution pour notifier une seule fois le résumé.
    if (!wasRunningRef.current || upload.isRunning) {
      wasRunningRef.current = upload.isRunning;
      return;
    }

    const summary: MediaDropzoneSummary = {
      total: upload.totals.total,
      uploaded: upload.totals.uploaded,
      failed: upload.totals.failed,
      cancelled: upload.totals.cancelled,
    };

    onUploadComplete?.(summary);
    void upload.persistOrder().catch((error) => {
      onUploadError?.(
        error instanceof Error ? error : new Error("Order persist failed"),
      );
    });
    wasRunningRef.current = upload.isRunning;
  }, [onUploadComplete, onUploadError, upload.isRunning, upload.persistOrder, upload.totals]);

  const context: MediaDropzoneAdapterRenderContext = {
    getRootProps,
    getInputProps,
    open,
    isDragActive,
    isDragAccept,
    isDragReject,
    isFileDialogActive,
    items: upload.items,
    totals: upload.totals,
    globalProgress: upload.globalProgress,
    isRunning: upload.isRunning,
    isHydrating: upload.isHydrating,
    isPersistingOrder: upload.isPersistingOrder,
    deletingId: upload.deletingId,
    rejections,
    clearRejections,
    remainingSlots,
    maxFiles,
    maxFileSizeBytes,
    start,
    cancel: upload.cancel,
    retryFailed,
    retryItem: upload.retryItem,
    removeItem: upload.removeItem,
    deleteRemoteItem: upload.deleteRemoteItem,
    handleRemoveItem,
    clearCompleted: upload.clearCompleted,
    clearAll: upload.clearAll,
  };

  return <>{children(context)}</>;
}

