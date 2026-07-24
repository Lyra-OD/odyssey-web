import {
  WIZARD_EDITOR_AUTOSAVE_ALLOWLIST,
  isWizardStepAllowedForRole,
  type WizardEditorAutosaveKey,
} from "@/src/lib/wizard/collabCapabilities";

export type EditorAutosaveFilterResult =
  | {
      ok: true;
      wizard_state?: Record<string, unknown>;
      wizard_step?: number;
    }
  | {
      ok: false;
      error: "forbidden_autosave_keys" | "forbidden_wizard_step";
      message: string;
      rejectedKeys?: string[];
      wizard_step?: number;
    };

/**
 * Filtre strict PATCH autosave pour role=editor.
 * - Refuse toute clé hors whitelist
 * - Refuse wizard_step ∉ {3,4,5}
 */
export function filterAutosavePatchForEditor(input: {
  wizard_state?: Record<string, unknown>;
  wizard_step?: number;
}): EditorAutosaveFilterResult {
  if (input.wizard_step !== undefined) {
    if (!isWizardStepAllowedForRole("editor", input.wizard_step)) {
      return {
        ok: false,
        error: "forbidden_wizard_step",
        message: `Editor cannot set wizard_step=${input.wizard_step}`,
        wizard_step: input.wizard_step,
      };
    }
  }

  if (input.wizard_state === undefined) {
    return {
      ok: true,
      ...(input.wizard_step !== undefined
        ? { wizard_step: input.wizard_step }
        : {}),
    };
  }

  const rejectedKeys = Object.keys(input.wizard_state).filter(
    (key) =>
      !(WIZARD_EDITOR_AUTOSAVE_ALLOWLIST as readonly string[]).includes(key),
  );

  if (rejectedKeys.length > 0) {
    return {
      ok: false,
      error: "forbidden_autosave_keys",
      message: `Editor cannot patch: ${rejectedKeys.join(", ")}`,
      rejectedKeys,
    };
  }

  const filtered: Record<string, unknown> = {};
  for (const key of WIZARD_EDITOR_AUTOSAVE_ALLOWLIST) {
    if (key in input.wizard_state) {
      filtered[key] = input.wizard_state[key as WizardEditorAutosaveKey];
    }
  }

  return {
    ok: true,
    ...(Object.keys(filtered).length > 0 ? { wizard_state: filtered } : {}),
    ...(input.wizard_step !== undefined
      ? { wizard_step: input.wizard_step }
      : {}),
  };
}
