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
  onFilesRejected,
  onUploadComplete,
  onUploadError,
  children,
}: MediaDropzoneAdapterProps) {
  const upload = useMassMediaUpload({
    maxConcurrency,
    maxRetries,
    bucket,
  });

  const [rejections, setRejections] = useState<MediaDropzoneRejection[]>([]);
  const wasRunningRef = useRef(false);

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
        const overflowRejections: MediaDropzoneRejection[] = overflow.map(
          (file) => ({
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            code: "too-many-files-cumulative",
            message: `Maximum ${maxFiles} files allowed in total queue.`,
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
    wasRunningRef.current = upload.isRunning;
  }, [onUploadComplete, upload.isRunning, upload.totals]);

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
    clearCompleted: upload.clearCompleted,
    clearAll: upload.clearAll,
  };

  return <>{children(context)}</>;
}

