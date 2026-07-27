"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";

import { useDebouncedValue } from "@/src/hooks/useDebouncedValue";
import type { SaveMode } from "@/src/hooks/useWizardAutosave";
import type { DraftCreateResult } from "@/src/lib/wizard/wizardState";

export type UseWizardDraftLifecycleParams = {
  isEditor: boolean;
  ensureDraft: (body: {
    firstName?: string;
    lastName?: string;
    birthDate?: string | null;
    deathDate?: string | null;
  }) => Promise<DraftCreateResult | null>;
  queueSave: (mode?: SaveMode) => void;
  currentStep: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  deathDate: string;
  uploadProjectId: string | null;
  setUploadProjectId: Dispatch<SetStateAction<string | null>>;
  setUploadUserId: Dispatch<SetStateAction<string | null>>;
  setUploadTenantId: Dispatch<SetStateAction<string | null>>;
  /** True when mounting with an existing draft (skip initial seed save). */
  hasInitialDraft: boolean;
  projectDraftError: string | null;
  setProjectDraftError: Dispatch<SetStateAction<string | null>>;
  projectDraftLoading: boolean;
  setProjectDraftLoading: Dispatch<SetStateAction<boolean>>;
};

/**
 * Draft ensure + autosave seed/step orchestration.
 * Upload project ids stay owned by the parent (avoids circular deps with essentials).
 */
export function useWizardDraftLifecycle({
  isEditor,
  ensureDraft,
  queueSave,
  currentStep,
  firstName,
  lastName,
  birthDate,
  deathDate,
  uploadProjectId,
  setUploadProjectId,
  setUploadUserId,
  setUploadTenantId,
  hasInitialDraft,
  setProjectDraftError,
  setProjectDraftLoading,
}: UseWizardDraftLifecycleParams) {
  const skipInitialAutosaveRef = useRef(hasInitialDraft);
  const skipStepAutosaveRef = useRef(true);

  const draftFields = useMemo(
    () => ({ firstName, lastName, birthDate, deathDate }),
    [firstName, lastName, birthDate, deathDate],
  );
  const debouncedDraftFields = useDebouncedValue(draftFields, 400);

  useEffect(() => {
    if (isEditor) return;
    if (uploadProjectId) return;
    if (debouncedDraftFields.firstName.trim().length < 2) return;

    let aborted = false;
    setProjectDraftLoading(true);
    setProjectDraftError(null);

    (async () => {
      try {
        const draft = await ensureDraft({
          firstName: debouncedDraftFields.firstName,
          lastName: debouncedDraftFields.lastName,
          birthDate: debouncedDraftFields.birthDate,
          deathDate: debouncedDraftFields.deathDate,
        });

        if (aborted) return;

        if (!draft?.id) {
          setProjectDraftError("project_insert_failed");
          return;
        }

        setUploadProjectId(draft.id);
        setUploadUserId(draft.user_id ?? null);
        setUploadTenantId(draft.tenant_id ?? null);
      } catch (err) {
        if (!aborted) {
          setProjectDraftError(
            err instanceof Error ? err.message : "network_error",
          );
        }
      } finally {
        if (!aborted) setProjectDraftLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [
    debouncedDraftFields,
    uploadProjectId,
    ensureDraft,
    isEditor,
    setUploadProjectId,
    setUploadUserId,
    setUploadTenantId,
    setProjectDraftError,
    setProjectDraftLoading,
  ]);

  useEffect(() => {
    if (!uploadProjectId) return;
    if (skipInitialAutosaveRef.current) {
      skipInitialAutosaveRef.current = false;
      return;
    }
    skipStepAutosaveRef.current = false;
    queueSave("immediate");
  }, [uploadProjectId, queueSave]);

  useEffect(() => {
    if (!uploadProjectId) return;
    if (skipStepAutosaveRef.current) {
      skipStepAutosaveRef.current = false;
      return;
    }
    queueSave("immediate");
    // Intentionnel : pas de dep uploadProjectId — évite le double PATCH à la création.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- step navigation only
  }, [currentStep, queueSave]);
}
