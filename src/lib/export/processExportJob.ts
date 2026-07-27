import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Worker export mock contrôlé (semaine Creatomate).
 * Consomme `project_export_jobs` status=queued → processing → completed.
 * Pas d’appel Creatomate réel tant que CREATOMATE_API_KEY n’est pas branché.
 */

export type ExportJobRow = {
  id: string;
  project_id: string;
  status: string;
  provider: string;
  allow_4k: boolean;
  allow_stingray_master: boolean;
  message: string | null;
};

export function buildMockCompletedMessage(job: {
  allow_4k: boolean;
  allow_stingray_master: boolean;
}): string {
  const res = job.allow_4k ? "4K" : "1080p";
  const stingray = job.allow_stingray_master
    ? "stingray_master=yes"
    : "stingray_master=no";
  return `mock_staging completed (${res}, ${stingray}) — Creatomate worker stub.`;
}

export type DrainResult = {
  claimed: number;
  completed: number;
  failed: number;
  jobIds: string[];
};

/**
 * Claim up to `limit` queued jobs and mark them completed (mock).
 * Uses service_role client. Safe to re-run (only touches `queued`).
 */
export async function drainQueuedExportJobs(
  admin: SupabaseClient,
  options: { limit?: number } = {},
): Promise<DrainResult> {
  const limit = Math.min(Math.max(options.limit ?? 5, 1), 25);
  const result: DrainResult = {
    claimed: 0,
    completed: 0,
    failed: 0,
    jobIds: [],
  };

  const { data: queued, error: listError } = await admin
    .from("project_export_jobs")
    .select(
      "id, project_id, status, provider, allow_4k, allow_stingray_master, message",
    )
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (listError) {
    throw new Error(`export_drain_list_failed: ${listError.message}`);
  }

  const jobs = (queued ?? []) as ExportJobRow[];

  for (const job of jobs) {
    const { data: claimed, error: claimError } = await admin
      .from("project_export_jobs")
      .update({
        status: "processing",
        message: "mock_staging processing…",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();

    if (claimError || !claimed?.id) {
      continue;
    }

    result.claimed += 1;
    result.jobIds.push(job.id);

    const { error: completeError } = await admin
      .from("project_export_jobs")
      .update({
        status: "completed",
        message: buildMockCompletedMessage(job),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "processing");

    if (completeError) {
      await admin
        .from("project_export_jobs")
        .update({
          status: "failed",
          message: `mock_staging failed: ${completeError.message}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      result.failed += 1;
    } else {
      result.completed += 1;
    }
  }

  return result;
}
