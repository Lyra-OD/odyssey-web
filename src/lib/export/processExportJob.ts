import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildOdysseyRenderPlan,
  essentialsFromWizard,
} from "@/src/lib/creatomate/buildPlan";
import { buildCreatomateRenderBody } from "@/src/lib/creatomate/payloadBuilder";
import { resolveAudioStems } from "@/src/lib/creatomate/resolveAudioStems";
import { resolveStoryboardMediaAssets } from "@/src/lib/creatomate/resolveMediaAssets";
import { buildTimelineClips } from "@/src/lib/creatomate/timeline";
import {
  createOdysseyRender,
  isCreatomateConfigured,
  resolveCreatomateWebhookUrl,
} from "@/src/lib/video/creatomate";
import { getProjectPaidEntitlements } from "@/src/lib/wizard/paidEntitlements";
import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";
import {
  coerceWizardState,
  emptyStoryboardState,
} from "@/src/lib/wizard/wizardState";

/**
 * Worker export — mock local OU Creatomate (mapping storyboard dynamique).
 *
 * - Sans `CREATOMATE_API_KEY` : queued → processing → completed (sync mock).
 * - Avec clé : queued → processing + external_render_id ; completed via webhook.
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
  return `mock_staging completed (${res}, ${stingray}). Creatomate worker stub.`;
}

export type DrainResult = {
  claimed: number;
  completed: number;
  failed: number;
  submitted: number;
  mode: "mock_staging" | "creatomate";
  jobIds: string[];
};

async function claimQueuedJob(
  admin: SupabaseClient,
  job: ExportJobRow,
  processingMessage: string,
): Promise<boolean> {
  const { data: claimed, error: claimError } = await admin
    .from("project_export_jobs")
    .update({
      status: "processing",
      message: processingMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();

  return Boolean(!claimError && claimed?.id);
}

async function completeMockJob(
  admin: SupabaseClient,
  job: ExportJobRow,
): Promise<"completed" | "failed"> {
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
    return "failed";
  }
  return "completed";
}

async function failJob(
  admin: SupabaseClient,
  jobId: string,
  message: string,
): Promise<"failed"> {
  await admin
    .from("project_export_jobs")
    .update({
      status: "failed",
      message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  return "failed";
}

async function submitCreatomateJob(
  admin: SupabaseClient,
  job: ExportJobRow,
): Promise<"submitted" | "failed"> {
  const webhookUrl = resolveCreatomateWebhookUrl();
  if (!webhookUrl) {
    return failJob(
      admin,
      job.id,
      "creatomate_webhook_url_missing. Set CREATOMATE_WEBHOOK_URL or NEXT_PUBLIC_SITE_URL",
    );
  }

  try {
    const entitlements = await getProjectPaidEntitlements(
      admin,
      job.project_id,
    );
    const paidPackage: WizardBasePackage =
      entitlements?.paid_package ?? "essential";

    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("wizard_state")
      .eq("id", job.project_id)
      .maybeSingle();

    if (projectError || !project) {
      return failJob(
        admin,
        job.id,
        `creatomate_project_load_failed: ${projectError?.message ?? "missing"}`,
      );
    }

    const wizard = coerceWizardState(project.wizard_state);
    const storyboard = wizard.storyboard ?? emptyStoryboardState();
    const mediaById = await resolveStoryboardMediaAssets(admin, {
      projectId: job.project_id,
      storyboard,
    });

    const { clips, chapterSpans } = buildTimelineClips({
      storyboard,
      mediaById,
    });

    const audioStems = await resolveAudioStems(admin, {
      storyboard,
      chapterSpans,
      clips,
      allowStingrayMaster: job.allow_stingray_master,
    });

    const plan = buildOdysseyRenderPlan({
      jobId: job.id,
      webhookUrl,
      paidPackage,
      storyboard,
      mediaById,
      essentials: essentialsFromWizard(wizard),
      audioStems,
    });
    const renderBody = buildCreatomateRenderBody(plan);
    const result = await createOdysseyRender(renderBody);

    if (!result.ok) {
      return failJob(admin, job.id, result.message);
    }

    const { error } = await admin
      .from("project_export_jobs")
      .update({
        status: "processing",
        provider: "creatomate",
        external_render_id: result.render.id,
        message: `creatomate submitted (${result.render.status}, ${plan.resolution.label}). Awaiting webhook`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "processing");

    if (error) {
      return failJob(
        admin,
        job.id,
        `creatomate_persist_failed: ${error.message}`,
      );
    }

    return "submitted";
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "creatomate_submit_error";
    return failJob(admin, job.id, message);
  }
}

/**
 * Claim up to `limit` queued jobs.
 * Mock : complete sync. Creatomate : submit render, leave processing.
 */
export async function drainQueuedExportJobs(
  admin: SupabaseClient,
  options: { limit?: number } = {},
): Promise<DrainResult> {
  const limit = Math.min(Math.max(options.limit ?? 5, 1), 25);
  const useCreatomate = isCreatomateConfigured();
  const result: DrainResult = {
    claimed: 0,
    completed: 0,
    failed: 0,
    submitted: 0,
    mode: useCreatomate ? "creatomate" : "mock_staging",
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
    const claimed = await claimQueuedJob(
      admin,
      job,
      useCreatomate
        ? "creatomate submitting…"
        : "mock_staging processing…",
    );
    if (!claimed) continue;

    result.claimed += 1;
    result.jobIds.push(job.id);

    if (useCreatomate) {
      const outcome = await submitCreatomateJob(admin, job);
      if (outcome === "submitted") result.submitted += 1;
      else result.failed += 1;
      continue;
    }

    const outcome = await completeMockJob(admin, job);
    if (outcome === "completed") result.completed += 1;
    else result.failed += 1;
  }

  return result;
}
