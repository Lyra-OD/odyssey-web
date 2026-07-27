"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from "react";

import { createClient } from "@/utils/supabase/client";
import {
  SIGNED_URL_TTL_SEC,
  STORAGE_CACHE_CONTROL,
} from "@/src/lib/media/storageEgressPolicy";
import type { SaveMode } from "@/src/hooks/useWizardAutosave";

type EssentialsSeed = {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  deathDate?: string;
  avatarPath?: string | null;
};

/** Slice of the parent wizardFieldsRef written by essentials handlers. */
type WizardFieldsAvatarSlice = {
  firstName: string;
  lastName: string;
  birthDate: string;
  deathDate: string;
  avatarPath: string | null;
};

function buildAvatarStoragePath(projectId: string, file: File): string {
  const fromName = file.name.split(".").pop();
  const ext =
    fromName && fromName.length <= 10
      ? fromName.toLowerCase()
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
  return `projects/${projectId}/avatar/primary-${crypto.randomUUID()}.${ext}`;
}

export type UseWizardEssentialsParams = {
  initial: EssentialsSeed | null | undefined;
  queueSave: (mode?: SaveMode) => void;
  uploadProjectId: string | null;
  /** Parent owns the full snapshot; we only mutate the essentials fields. */
  wizardFieldsRef: MutableRefObject<WizardFieldsAvatarSlice & Record<string, unknown>>;
};

export function useWizardEssentials({
  initial,
  queueSave,
  uploadProjectId,
  wizardFieldsRef,
}: UseWizardEssentialsParams) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
  const [deathDate, setDeathDate] = useState(initial?.deathDate ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(
    () => initial?.avatarPath?.trim() || null,
  );

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarHydratedPathRef = useRef<string | null>(null);
  const avatarHydrateInflightRef = useRef<string | null>(null);
  const pendingAvatarFileRef = useRef<File | null>(null);
  const avatarUploadingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const hydrateAvatarPreview = useCallback(
    async (storagePath: string, projectId: string) => {
      if (avatarHydrateInflightRef.current === storagePath) return;
      avatarHydrateInflightRef.current = storagePath;

      try {
        const apiRes = await fetch(
          `/api/projects/${projectId}/avatar?path=${encodeURIComponent(storagePath)}`,
        );

        if (apiRes.ok) {
          const body = (await apiRes.json()) as { signedUrl?: string };
          if (body.signedUrl) {
            avatarHydratedPathRef.current = storagePath;
            setAvatarPreview(body.signedUrl);
            return;
          }
        }

        const supabase = createClient();
        const { data: signed, error: signError } = await supabase.storage
          .from("user-assets")
          .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);

        if (!signError && signed?.signedUrl) {
          avatarHydratedPathRef.current = storagePath;
          setAvatarPreview(signed.signedUrl);
          return;
        }

        console.warn(
          "[useWizardEssentials] avatar hydrate failed:",
          signError?.message ?? "unknown",
        );
      } finally {
        avatarHydrateInflightRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const path = avatarPath?.trim() || initial?.avatarPath?.trim() || "";
    if (!path) return;
    if (avatarPreview?.startsWith("blob:")) return;
    if (avatarHydratedPathRef.current === path && avatarPreview) return;
    if (!uploadProjectId) return;

    void hydrateAvatarPreview(path, uploadProjectId);
  }, [
    avatarPath,
    avatarPreview,
    initial?.avatarPath,
    uploadProjectId,
    hydrateAvatarPreview,
  ]);

  useEffect(() => {
    const fromDraft = initial?.avatarPath?.trim();
    if (fromDraft && !avatarPath) {
      setAvatarPath(fromDraft);
      wizardFieldsRef.current.avatarPath = fromDraft;
    }
  }, [avatarPath, initial?.avatarPath, wizardFieldsRef]);

  const uploadAvatarToStorage = useCallback(
    async (file: File, projectId: string) => {
      if (avatarUploadingRef.current) return;
      avatarUploadingRef.current = true;
      try {
        const supabase = createClient();
        const storagePath = buildAvatarStoragePath(projectId, file);
        const { error } = await supabase.storage
          .from("user-assets")
          .upload(storagePath, file, {
            cacheControl: STORAGE_CACHE_CONTROL,
            upsert: true,
            contentType: file.type || undefined,
          });

        if (error) throw error;

        setAvatarPath(storagePath);
        wizardFieldsRef.current.avatarPath = storagePath;
        avatarHydratedPathRef.current = null;
        queueSave("immediate");
      } catch {
        // Preview blob reste visible ; path non persisté jusqu'à retry.
      } finally {
        avatarUploadingRef.current = false;
      }
    },
    [queueSave, wizardFieldsRef],
  );

  useEffect(() => {
    if (!uploadProjectId || !pendingAvatarFileRef.current) return;
    const file = pendingAvatarFileRef.current;
    pendingAvatarFileRef.current = null;
    void uploadAvatarToStorage(file, uploadProjectId);
  }, [uploadProjectId, uploadAvatarToStorage]);

  const handleFirstNameChange = useCallback(
    (value: string) => {
      setFirstName(value);
      wizardFieldsRef.current.firstName = value;
      queueSave("text");
    },
    [queueSave, wizardFieldsRef],
  );

  const handleLastNameChange = useCallback(
    (value: string) => {
      setLastName(value);
      wizardFieldsRef.current.lastName = value;
      queueSave("text");
    },
    [queueSave, wizardFieldsRef],
  );

  const handleBirthDateChange = useCallback(
    (value: string) => {
      setBirthDate(value);
      wizardFieldsRef.current.birthDate = value;
      queueSave("text");
    },
    [queueSave, wizardFieldsRef],
  );

  const handleDeathDateChange = useCallback(
    (value: string) => {
      setDeathDate(value);
      wizardFieldsRef.current.deathDate = value;
      queueSave("text");
    },
    [queueSave, wizardFieldsRef],
  );

  const handleAvatarChange = useCallback(
    (list: FileList | null) => {
      const file = list?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      setAvatarPreview((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      avatarHydratedPathRef.current = null;

      if (uploadProjectId) {
        void uploadAvatarToStorage(file, uploadProjectId);
      } else {
        pendingAvatarFileRef.current = file;
      }
    },
    [uploadProjectId, uploadAvatarToStorage],
  );

  return {
    firstName,
    lastName,
    birthDate,
    deathDate,
    avatarPreview,
    avatarPath,
    avatarInputRef: avatarInputRef as RefObject<HTMLInputElement>,
    handleFirstNameChange,
    handleLastNameChange,
    handleBirthDateChange,
    handleDeathDateChange,
    handleAvatarChange,
  };
}
