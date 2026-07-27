import { NextResponse } from "next/server";
import { z } from "zod";

import {
  buildPersistedWizardState,
  coerceWizardState,
} from "@/src/lib/wizard/wizardState";
import { resolveWizardCraftAccess } from "@/src/lib/api/projectAccess";
import { filterAutosavePatchForEditor } from "@/src/lib/wizard/collabAutosave";
import { ProjectIdSchema } from "@/src/lib/api/projectIdSchema";

/**
 * Tribute Wizard — Autosave API.
 *
 * Routes:
 *   GET    /api/projects/[id]/autosave  → fetch current draft state
 *   PATCH  /api/projects/[id]/autosave  → partial update of wizard_state
 *                                         and/or wizard_step
 *
 * Security model:
 *   1. Titulaire : session Odyssey + `user_id` (RLS + filtre explicite).
 *   2. Co-Créateur : cookie httpOnly `wizard_editor` (Phase B) + client admin
 *      après `resolveWizardCraftAccess` — PATCH limité à la whitelist
 *      (`storyboard`, `musicRightsAttestation`) et steps {3,4,5}.
 *   3. Never trust UI alone — API = loi.
 *
 * JSONB merge strategy:
 *   - Top-level shallow merge: PATCH bodies replace an entire section
 *     (`essentials`, `socialSources`, `storyboard`, `montage`, `musicalAmbiance`) but never wipe
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
    birthDate: z.string().trim().max(32).optional(),
    deathDate: z.string().trim().max(32).optional(),
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

const BasePackageSchema = z.enum([
  "essential",
  "signature",
  "heritage",
  "legendary",
  "prestige",
]);

const SelectedTrackSchema = z
  .object({
    title: z.string().trim().max(200),
    artist: z.string().trim().max(200),
    trackId: z.string().trim().max(160),
    coverUrl: z.string().trim().max(500),
    previewUrl: z.string().trim().max(800).optional(),
  })
  .strict();

const MusicalAmbianceSchema = z
  .object({
    tracks: z
      .object({
        acte1: SelectedTrackSchema.optional(),
        acte2: SelectedTrackSchema.optional(),
        acte3: SelectedTrackSchema.optional(),
      })
      .strict()
      .optional(),
    catalogProvider: z.string().trim().max(80).optional(),
    /** Legacy — accepté à l'entrée */
    selectedTrack: SelectedTrackSchema.optional(),
    mood: z.string().trim().max(40).optional(),
    trackOrder: z.array(z.string().trim().max(40)).max(20).optional(),
    catalogTrackId: z.string().trim().max(120).optional(),
  })
  .strict()
  .partial();

const ExtensionsSchema = z
  .object({
    aiRetouch: z.boolean().optional(),
    // Freemium V1 — clés canoniques du Pivot.
    musicLicense: z.boolean().optional(),
    storyVoice: z.boolean().optional(),
    sanctuaryToken: z.boolean().optional(),
    memoryBook: z.boolean().optional(),
    digitalVault: z.boolean().optional(),
    heritagePack: z.boolean().optional(),
    // Alias legacy conservés en entrée (migrés côté coerceExtensionsState).
    extendedLicense: z.boolean().optional(),
    collectorUsb: z.boolean().optional(),
  })
  .strict()
  .partial();

/** Attestation ToS upload MP3/WAV (Phase 4/5). */
const MusicRightsAttestationSchema = z
  .object({
    acceptedAt: z.string().trim().max(64),
    tosVersion: z.string().trim().max(40),
  })
  .strict();

const UuidSchema = z.string().uuid();

const MontageActListSchema = z.array(UuidSchema).max(150);

const MontageFocalPointSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
  })
  .strict();

const MontageSchema = z
  .object({
    acts: z
      .object({
        spark: MontageActListSchema.optional(),
        epic: MontageActListSchema.optional(),
        legacy: MontageActListSchema.optional(),
      })
      .strict()
      .optional(),
    unassignedIds: z.array(UuidSchema).max(150).optional(),
    excludedIds: z.array(UuidSchema).max(150).optional(),
    focalPoints: z
      .record(UuidSchema, MontageFocalPointSchema)
      .refine((record) => Object.keys(record).length <= 150, {
        message: "Too many focal points",
      })
      .optional(),
  })
  .strict()
  .partial();

/** Accepte un float navigateur (ex. Audio.duration) et normalise en secondes entières. */
const DurationSecondsSchema = z.preprocess((value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.round(value));
  }
  return value;
}, z.number().int().positive().max(60 * 60).nullable().optional());

const StoryboardChapterIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, "invalid_chapter_id");

/** Intention narrative du chapitre — pacing dynamique par mood (S4, futur). */
const StoryboardChapterMoodSchema = z.enum([
  "contemplative",
  "energetic",
  "nostalgic",
]);

/**
 * Extrait vidéo retenu (trim) pour un media_asset — `durationSec` est
 * borné à 60s côté schéma (garde-fou large ; la règle produit S4 fixe
 * la cible à VIDEO_TRIM_DURATION_SEC = 10s côté storyboardPacing.ts).
 */
const StoryboardVideoTrimSchema = z
  .object({
    trimStartSec: z.number().min(0).max(24 * 60 * 60),
    durationSec: z.number().positive().max(60),
  })
  .strict();

const StoryboardStingraySongSchema = z
  .object({
    source: z.literal("stingray"),
    trackId: z.string().trim().min(1).max(160),
    title: z.string().trim().min(1).max(200),
    artist: z.string().trim().min(1).max(200),
    coverUrl: z.string().trim().max(500).optional(),
    durationSec: DurationSecondsSchema,
  })
  .strict();

const StoryboardUploadSongSchema = z
  .object({
    source: z.literal("upload"),
    storagePath: z.string().trim().min(1).max(500),
    title: z.string().trim().min(1).max(200),
    fileName: z.string().trim().max(200).optional(),
    mimeType: z.string().trim().max(120).optional(),
    artist: z.string().trim().max(200).optional(),
    durationSec: DurationSecondsSchema,
  })
  .strict()
  .superRefine((song, ctx) => {
    if (song.mimeType && !song.mimeType.startsWith("audio/")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mimeType"],
        message: "upload_song_mime_must_be_audio",
      });
    }
  });

const StoryboardSongSchema = z.discriminatedUnion("source", [
  StoryboardStingraySongSchema,
  StoryboardUploadSongSchema,
]);

const StoryboardChapterSchema = z
  .object({
    id: StoryboardChapterIdSchema,
    label: z.string().trim().min(1).max(40).optional(),
    mediaIds: z.array(UuidSchema).max(250),
    song: StoryboardSongSchema.optional(),
    mood: StoryboardChapterMoodSchema.optional(),
  })
  .strict()
  .superRefine((chapter, ctx) => {
    const seen = new Set<string>();
    for (const [index, mediaId] of chapter.mediaIds.entries()) {
      if (seen.has(mediaId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mediaIds", index],
          message: "duplicate_media_id_in_chapter",
        });
      }
      seen.add(mediaId);
    }
  });

const StoryboardSchema = z
  .object({
    chapters: z.array(StoryboardChapterSchema).max(12),
    unassignedIds: z.array(UuidSchema).max(250),
    excludedIds: z.array(UuidSchema).max(250),
    focalPoints: z
      .record(UuidSchema, MontageFocalPointSchema)
      .refine((record) => Object.keys(record).length <= 250, {
        message: "too_many_focal_points",
      }),
    videoTrims: z
      .record(UuidSchema, StoryboardVideoTrimSchema)
      .refine((record) => Object.keys(record).length <= 250, {
        message: "too_many_video_trims",
      }),
  })
  .strict()
  .superRefine((storyboard, ctx) => {
    const chapterIds = new Set<string>();
    const assignedMediaIds = new Map<string, string>();

    for (const [chapterIndex, chapter] of storyboard.chapters.entries()) {
      if (chapterIds.has(chapter.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["chapters", chapterIndex, "id"],
          message: "duplicate_chapter_id",
        });
      }
      chapterIds.add(chapter.id);

      for (const [mediaIndex, mediaId] of chapter.mediaIds.entries()) {
        const owner = assignedMediaIds.get(mediaId);
        if (owner) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["chapters", chapterIndex, "mediaIds", mediaIndex],
            message: `media_id_already_assigned_to_${owner}`,
          });
        } else {
          assignedMediaIds.set(mediaId, chapter.id);
        }
      }
    }

    const seenUnassigned = new Set<string>();
    for (const [index, mediaId] of storyboard.unassignedIds.entries()) {
      if (seenUnassigned.has(mediaId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["unassignedIds", index],
          message: "duplicate_unassigned_media_id",
        });
      }
      seenUnassigned.add(mediaId);

      if (assignedMediaIds.has(mediaId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["unassignedIds", index],
          message: "unassigned_media_id_already_in_chapter",
        });
      }
    }
  });

const WizardStatePartialSchema = z
  .object({
    version: z.union([z.literal(1), z.literal(2)]).optional(),
    isPartner: z.boolean().optional(),
    channel: z.enum(["partner", "direct"]).optional(),
    basePackage: BasePackageSchema.optional(),
    /** Soft Cap Freemium V1 — forfait offert (immuable) + intention construite. */
    grantedPackage: BasePackageSchema.optional(),
    intendedPackage: BasePackageSchema.optional(),
    musicRightsAttestation: MusicRightsAttestationSchema.optional(),
    pricing: z
      .object({
        basePackage: BasePackageSchema,
        baseCents: z.number().int().min(0),
        optionsCents: z.number().int().min(0),
        totalCents: z.number().int().min(0),
        partnerTokenCost: z.number().int().min(0).optional(),
      })
      .strict()
      .optional(),
    essentials: EssentialsSchema.optional(),
    socialSources: SocialSourcesSchema.optional(),
    /**
     * Nouveau snapshot canonique : jamais partial.
     * Si `storyboard` est fourni, il doit être complet.
     */
    storyboard: StoryboardSchema.optional(),
    /**
     * Legacy accepté pendant la transition S1/S2.
     */
    montage: MontageSchema.optional(),
    extensions: ExtensionsSchema.optional(),
    /**
     * Legacy accepté pendant la transition S1/S2.
     */
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

type RouteParams = { params: { id: string } };

// ---------------------------------------------------------------------------
// GET — fetch current autosave snapshot
// ---------------------------------------------------------------------------
export async function GET(_req: Request, { params }: RouteParams) {
  const projectIdResult = ProjectIdSchema.safeParse(params.id);
  if (!projectIdResult.success) {
    return NextResponse.json({ error: "invalid_project_id" }, { status: 400 });
  }

  const projectId = projectIdResult.data;
  const access = await resolveWizardCraftAccess(projectId);
  if (!access.ok) return access.response;

  const query = access.supabase
    .from("projects")
    .select("id, user_id, wizard_state, wizard_step, last_saved_at, status")
    .eq("id", projectId);

  const { data, error } =
    access.role === "owner"
      ? await query.eq("user_id", access.user.id).maybeSingle()
      : await query.maybeSingle();

  if (error) {
    return NextResponse.json({ error: "autosave_fetch_failed" }, { status: 400 });
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
    accessRole: access.role,
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

  const access = await resolveWizardCraftAccess(projectId);
  if (!access.ok) return access.response;

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

  let patchState = parsed.data.wizard_state as
    | Record<string, unknown>
    | undefined;
  let patchStep = parsed.data.wizard_step;

  if (access.role === "editor") {
    const filtered = filterAutosavePatchForEditor({
      wizard_state: patchState,
      wizard_step: patchStep,
    });
    if (!filtered.ok) {
      return NextResponse.json(
        {
          error: "forbidden",
          code: filtered.error,
          message: filtered.message,
          rejectedKeys: filtered.rejectedKeys,
          role: "editor",
        },
        { status: 403 },
      );
    }
    patchState = filtered.wizard_state;
    patchStep = filtered.wizard_step;
    if (patchState === undefined && patchStep === undefined) {
      return NextResponse.json(
        { error: "empty_editor_patch", message: "Nothing allowed to save." },
        { status: 400 },
      );
    }
  }

  const existingQuery = access.supabase
    .from("projects")
    .select("id, user_id, wizard_state, wizard_step")
    .eq("id", projectId);

  const existing =
    access.role === "owner"
      ? await existingQuery.eq("user_id", access.user.id).maybeSingle()
      : await existingQuery.maybeSingle();

  if (existing.error) {
    return NextResponse.json({ error: "autosave_lookup_failed" }, { status: 400 });
  }

  if (!existing.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (
    access.role === "owner" &&
    existing.data.user_id !== access.user.id
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const mergedState = mergeWizardState(existing.data.wizard_state, patchState);

  const runtimeState = coerceWizardState(mergedState);
  const persistedState = buildPersistedWizardState(runtimeState);

  if (
    Buffer.byteLength(JSON.stringify(persistedState), "utf8") >
    WIZARD_STATE_MAX_BYTES
  ) {
    return NextResponse.json(
      {
        error: "wizard_state_too_large",
        message: `wizard_state exceeds ${WIZARD_STATE_MAX_BYTES} bytes`,
      },
      { status: 413 },
    );
  }

  const updatePayload: Record<string, unknown> = {
    wizard_state: persistedState,
    last_saved_at: new Date().toISOString(),
  };
  if (patchStep !== undefined) {
    updatePayload.wizard_step = patchStep;
  }

  let updateQuery = access.supabase
    .from("projects")
    .update(updatePayload)
    .eq("id", projectId);

  if (access.role === "owner") {
    updateQuery = updateQuery.eq("user_id", access.user.id);
  }

  const { data: updated, error: updateError } = await updateQuery
    .select("id, wizard_state, wizard_step, last_saved_at, status")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "autosave_update_failed" }, { status: 400 });
  }

  return NextResponse.json({
    id: updated.id,
    wizard_state: updated.wizard_state ?? {},
    wizard_step: updated.wizard_step ?? 1,
    last_saved_at: updated.last_saved_at,
    status: updated.status,
    accessRole: access.role,
  });
}
