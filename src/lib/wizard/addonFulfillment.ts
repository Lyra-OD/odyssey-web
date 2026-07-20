import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WizardExtensionsState } from "@/src/lib/wizard/wizardPricing";
import { normalizeExtensionsState } from "@/src/lib/wizard/wizardPricing";

export type AddonFulfillmentKind =
  | "sanctuaryToken"
  | "storyVoice"
  | "memoryBook";

/**
 * Phase 5 stub — enregistre les add-ons Quiet Luxury à fulfillment.
 * NFC claim / TTS / Gelato = follow-ups ; ici on marque `pending` côté projet.
 */
export async function enqueueQuietLuxuryFulfillment(
  admin: SupabaseClient,
  params: {
    projectId: string;
    extensions: WizardExtensionsState;
  },
): Promise<{ ok: true; kinds: AddonFulfillmentKind[] } | { ok: false; message: string }> {
  const ext = normalizeExtensionsState(params.extensions);
  const kinds: AddonFulfillmentKind[] = [];
  if (ext.sanctuaryToken || ext.collectorUsb) kinds.push("sanctuaryToken");
  if (ext.storyVoice) kinds.push("storyVoice");
  if (ext.memoryBook) kinds.push("memoryBook");

  if (kinds.length === 0) {
    return { ok: true, kinds: [] };
  }

  const { data: project, error: fetchError } = await admin
    .from("projects")
    .select("wizard_state")
    .eq("id", params.projectId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, message: fetchError.message };
  }

  const prev =
    project?.wizard_state &&
    typeof project.wizard_state === "object" &&
    !Array.isArray(project.wizard_state)
      ? (project.wizard_state as Record<string, unknown>)
      : {};

  const fulfillment = {
    status: "pending" as const,
    kinds,
    queuedAt: new Date().toISOString(),
    note: "Phase 5 stub — ops / Creatomate / Gelato / NFC claim to follow",
  };

  const { error: updateError } = await admin
    .from("projects")
    .update({
      wizard_state: {
        ...prev,
        quietLuxuryFulfillment: fulfillment,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.projectId);

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  console.info("[fulfillment] quiet luxury queued", {
    projectId: params.projectId,
    kinds,
  });

  return { ok: true, kinds };
}
