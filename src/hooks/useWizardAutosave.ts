"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  DraftCreateResult,
  WizardStateV1,
} from "@/src/lib/wizard/wizardState";

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export type SaveMode = "text" | "immediate";

const TEXT_DEBOUNCE_MS = 800;
const MIN_PATCH_INTERVAL_MS = 500;
const SAVED_RESET_MS = 3000;

type DraftBody = {
  firstName?: string;
  lastName?: string;
  birthDate?: string | null;
  deathDate?: string | null;
};

export type UseWizardAutosaveOptions = {
  /** Active project UUID — PATCH is skipped while null. */
  projectId: string | null;
  /** Current wizard step (1..N), persisted alongside wizard_state. */
  wizardStep: number;
  /** Builds the latest wizard_state snapshot from React state. */
  buildWizardState: () => WizardStateV1;
  /** Called after a successful PATCH with the server timestamp. */
  onSaved?: (lastSavedAt: string) => void;
};

export type UseWizardAutosaveReturn = {
  status: AutosaveStatus;
  lastSavedAt: string | null;
  errorMessage: string | null;
  /** Schedule a debounced save (`text`, 800ms) or flush now (`immediate`, 0ms). */
  queueSave: (mode?: SaveMode) => void;
  /** Cancel debounce and PATCH immediately — use before step navigation. */
  flush: () => Promise<void>;
  /**
   * POST `/api/projects/draft` once when firstName >= 2 chars.
   * Returns the new project id or null on failure.
   */
  ensureDraft: (body: DraftBody) => Promise<DraftCreateResult | null>;
};

export function useWizardAutosave({
  projectId,
  wizardStep,
  buildWizardState,
  onSaved,
}: UseWizardAutosaveOptions): UseWizardAutosaveReturn {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const projectIdRef = useRef(projectId);
  const wizardStepRef = useRef(wizardStep);
  const buildWizardStateRef = useRef(buildWizardState);
  const onSavedRef = useRef(onSaved);

  const abortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPatchAtRef = useRef(0);
  const ensureDraftPromiseRef = useRef<Promise<DraftCreateResult | null> | null>(
    null,
  );

  projectIdRef.current = projectId;
  wizardStepRef.current = wizardStep;
  buildWizardStateRef.current = buildWizardState;
  onSavedRef.current = onSaved;

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const clearSavedReset = useCallback(() => {
    if (savedResetTimerRef.current) {
      clearTimeout(savedResetTimerRef.current);
      savedResetTimerRef.current = null;
    }
  }, []);

  const scheduleSavedReset = useCallback(() => {
    clearSavedReset();
    savedResetTimerRef.current = setTimeout(() => {
      setStatus((current) => (current === "saved" ? "idle" : current));
    }, SAVED_RESET_MS);
  }, [clearSavedReset]);

  const buildPatchBody = useCallback(() => {
    return {
      wizard_state: buildWizardStateRef.current(),
      wizard_step: wizardStepRef.current,
    };
  }, []);

  const patchNow = useCallback(
    async (options?: { keepalive?: boolean; signal?: AbortSignal }) => {
      const id = projectIdRef.current;
      if (!id) return;

      const now = Date.now();
      const elapsed = now - lastPatchAtRef.current;
      if (elapsed < MIN_PATCH_INTERVAL_MS && !options?.keepalive) {
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_PATCH_INTERVAL_MS - elapsed),
        );
      }

      if (abortRef.current && !options?.keepalive) {
        abortRef.current.abort();
      }

      const controller = options?.signal
        ? null
        : new AbortController();
      const signal = options?.signal ?? controller!.signal;
      if (controller) abortRef.current = controller;

      setStatus("saving");
      setErrorMessage(null);

      try {
        const res = await fetch(`/api/projects/${id}/autosave`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(buildPatchBody()),
          signal,
          keepalive: options?.keepalive ?? false,
        });

        const payload = (await res.json().catch(() => null)) as
          | {
              last_saved_at?: string;
              error?: string;
              message?: string;
            }
          | null;

        if (!res.ok) {
          const reason =
            payload?.message ?? payload?.error ?? `HTTP ${res.status}`;
          setStatus("error");
          setErrorMessage(reason);
          return;
        }

        lastPatchAtRef.current = Date.now();
        const savedAt = payload?.last_saved_at ?? new Date().toISOString();
        setLastSavedAt(savedAt);
        setStatus("saved");
        onSavedRef.current?.(savedAt);
        scheduleSavedReset();
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "network_error",
        );
      } finally {
        if (controller && abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [buildPatchBody, scheduleSavedReset],
  );

  const flush = useCallback(async () => {
    clearDebounce();
    await patchNow();
  }, [clearDebounce, patchNow]);

  const queueSave = useCallback(
    (mode: SaveMode = "text") => {
      if (!projectIdRef.current) return;

      clearDebounce();

      if (mode === "immediate") {
        void patchNow();
        return;
      }

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        void patchNow();
      }, TEXT_DEBOUNCE_MS);
    },
    [clearDebounce, patchNow],
  );

  const ensureDraft = useCallback(async (body: DraftBody) => {
    if (projectIdRef.current) {
      return {
        id: projectIdRef.current,
      };
    }

    if (ensureDraftPromiseRef.current) {
      return ensureDraftPromiseRef.current;
    }

    const promise = (async (): Promise<DraftCreateResult | null> => {
      try {
        const res = await fetch("/api/projects/draft", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            firstName: body.firstName?.trim() || undefined,
            lastName: body.lastName?.trim() || undefined,
            birthDate: body.birthDate || undefined,
            deathDate: body.deathDate || undefined,
          }),
        });

        const payload = (await res.json().catch(() => null)) as
          | DraftCreateResult & { error?: string; message?: string }
          | null;

        if (!res.ok || !payload?.id) {
          return null;
        }

        return {
          id: payload.id,
          user_id: payload.user_id,
          tenant_id: payload.tenant_id,
        };
      } catch {
        return null;
      } finally {
        ensureDraftPromiseRef.current = null;
      }
    })();

    ensureDraftPromiseRef.current = promise;
    return promise;
  }, []);

  // Flush pending debounced save on unmount.
  useEffect(() => {
    return () => {
      clearDebounce();
      clearSavedReset();
      abortRef.current?.abort();
    };
  }, [clearDebounce, clearSavedReset]);

  // Best-effort save when the tab closes (fetch keepalive supports PATCH).
  useEffect(() => {
    const onBeforeUnload = () => {
      if (!projectIdRef.current) return;
      void patchNow({ keepalive: true });
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [patchNow]);

  return {
    status,
    lastSavedAt,
    errorMessage,
    queueSave,
    flush,
    ensureDraft,
  };
}
