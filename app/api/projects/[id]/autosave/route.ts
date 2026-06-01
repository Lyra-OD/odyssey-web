import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/utils/supabase/server";

/**
 * Tribute Wizard — Autosave API.
 *
 * Routes:
 *   GET    /api/projects/[id]/autosave  → fetch current draft state
 *   PATCH  /api/projects/[id]/autosave  → partial update of wizard_state
 *                                         and/or wizard_step
 *
 * Security model:
 *   1. `auth.getUser()` must return a user (cookie-based session via @supabase/ssr).
 *   2. RLS on `public.projects` already filters by `user_id = auth.uid()` for
 *      the `authenticated` role (P0 policies).
 *   3. We add an explicit `eq("user_id", user.id)` filter on every query for
 *      defense in depth — never trust a single layer.
 *
 * JSONB merge strategy:
 *   - Top-level shallow merge: PATCH bodies replace an entire section
 *     (`essentials`, `socialSources`, `musicalAmbiance`) but never wipe
 *     sibling sections.
 *   - Read-modify-write done server-side. Concurrent PATCH for the same
 *     project from the same user are mitigated client-side via AbortController
 *     in `useWizardAutosave` (step C). For multi-device edits we accept
 *     last-write-wins.
 *
 * `last_saved_at` is set to the server-side wall clock (`new Date()`)
 * rather than a DB trigger to keep the migration footprint minimal.
 * Drift versus DB clock is sub-second and acceptable for the "saved Xs ago"
 * UX label.
 */

const WIZARD_STEP_MIN = 1;
const WIZARD_STEP_MAX = 10;
const WIZARD_STATE_MAX_BYTES = 64 * 1024;

const EssentialsSchema = z
  .object({
    firstName: z.string().trim().max(120).optional(),
    lastName: z.string().trim().max(120).optional(),
    avatarPath: z.string().trim().max(500).optional(),
  })
  .strict()
  .partial();

const SocialSourcesSchema = z
  .object({
    selected: z.string().trim().max(40).optional(),
    url: z.string().trim().max(500).optional(),
  })
  .strict()
  .partial();

const MusicalAmbianceSchema = z
  .object({
    mood: z.string().trim().max(40).optional(),
    trackOrder: z.array(z.string().trim().max(40)).max(20).optional(),
  })
  .strict()
  .partial();

const WizardStatePartialSchema = z
  .object({
    version: z.literal(1).optional(),
    essentials: EssentialsSchema.optional(),
    socialSources: SocialSourcesSchema.optional(),
    musicalAmbiance: MusicalAmbianceSchema.optional(),
  })
  .strict();

const PatchBodySchema = z
  .object({
    wizard_state: WizardStatePartialSchema.optional(),
    wizard_step: z
      .number()
      .int()
      .min(WIZARD_STEP_MIN)
      .max(WIZARD_STEP_MAX)
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.wizard_state !== undefined || data.wizard_step !== undefined,
    { message: "At least one of wizard_state or wizard_step must be provided." },
  );

const ProjectIdSchema = z.string().uuid({ message: "invalid_project_id" });

type WizardStateJson = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Shallow merge at the top level: each section of the partial body replaces
 * the existing section completely, but sibling sections stay untouched.
 * Suits the wizard UX where a step "owns" its section end-to-end.
 */
const mergeWizardState = (
  current: unknown,
  partial: WizardStateJson | undefined,
): WizardStateJson => {
  const base: WizardStateJson = isPlainObject(current) ? { ...current } : {};
  if (!partial) return base;
  for (const [key, value] of Object.entries(partial)) {
    if (value === undefined) continue;
    base[key] = value;
  }
  return base;
};

async function authenticate() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null as null };
  return { supabase, user };
}

type RouteParams = { params: { id: string } };

// ---------------------------------------------------------------------------
// GET — fetch current autosave snapshot
// ---------------------------------------------------------------------------
export async function GET(_req: Request, { params }: RouteParams) {
  const projectIdResult = ProjectIdSchema.safeParse(params.id);
  if (!projectIdResult.success) {
    return NextResponse.json({ error: "invalid_project_id" }, { status: 400 });
  }

  const { supabase, user } = await authenticate();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, user_id, wizard_state, wizard_step, last_saved_at, status")
    .eq("id", projectIdResult.data)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "autosave_fetch_failed", message: error.message },
      { status: 400 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    wizard_state: data.wizard_state ?? {},
    wizard_step: data.wizard_step ?? 1,
    last_saved_at: data.last_saved_at,
    status: data.status,
  });
}

// ---------------------------------------------------------------------------
// PATCH — merge wizard_state and/or update wizard_step
// ---------------------------------------------------------------------------
export async function PATCH(req: Request, { params }: RouteParams) {
  const projectIdResult = ProjectIdSchema.safeParse(params.id);
  if (!projectIdResult.success) {
    return NextResponse.json({ error: "invalid_project_id" }, { status: 400 });
  }
  const projectId = projectIdResult.data;

  const { supabase, user } = await authenticate();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = PatchBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_body",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const existing = await supabase
    .from("projects")
    .select("id, user_id, wizard_state, wizard_step")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing.error) {
    return NextResponse.json(
      { error: "autosave_lookup_failed", message: existing.error.message },
      { status: 400 },
    );
  }

  if (!existing.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (existing.data.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const mergedState = mergeWizardState(
    existing.data.wizard_state,
    parsed.data.wizard_state,
  );

  if (Buffer.byteLength(JSON.stringify(mergedState), "utf8") > WIZARD_STATE_MAX_BYTES) {
    return NextResponse.json(
      {
        error: "wizard_state_too_large",
        message: `wizard_state exceeds ${WIZARD_STATE_MAX_BYTES} bytes`,
      },
      { status: 413 },
    );
  }

  const updatePayload: Record<string, unknown> = {
    wizard_state: mergedState,
    last_saved_at: new Date().toISOString(),
  };
  if (parsed.data.wizard_step !== undefined) {
    updatePayload.wizard_step = parsed.data.wizard_step;
  }

  const { data: updated, error: updateError } = await supabase
    .from("projects")
    .update(updatePayload)
    .eq("id", projectId)
    .eq("user_id", user.id)
    .select("id, wizard_state, wizard_step, last_saved_at, status")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      {
        error: "autosave_update_failed",
        message: updateError?.message ?? "Unknown error",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    id: updated.id,
    wizard_state: updated.wizard_state ?? {},
    wizard_step: updated.wizard_step ?? 1,
    last_saved_at: updated.last_saved_at,
    status: updated.status,
  });
}
