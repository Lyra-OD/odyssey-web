/** Wizard autosave payload — aligned with `/api/projects/[id]/autosave` Zod schemas. */

import {
  coerceExtensionsState,
  migrateLegacyExtensions,
} from "@/src/lib/wizard/wizardExtensions";
import { buildMusicPreviewProxyUrl } from "@/src/lib/music/stingrayTrackId";
import {
  findCatalogTrack,
  type WizardActTrackKey,
  type WizardActTracks,
  type WizardSelectedTrack,
  WIZARD_ACT_TRACK_KEYS,
} from "@/src/lib/wizard/stingrayCatalog";
import type { WizardExtensionsState } from "@/src/lib/wizard/wizardPricing";

export type { WizardExtensionsState } from "@/src/lib/wizard/wizardPricing";
export type {
  WizardSelectedTrack,
  WizardActTrackKey,
  WizardActTracks,
} from "@/src/lib/wizard/stingrayCatalog";

export const WIZARD_STATE_VERSION = 1 as const;

export type MoodId = "soft" | "classical" | "melancholic" | "bright";
export type SocialId = "facebook" | "instagram" | "tiktok" | "google";
export type TrackId = "a" | "b" | "c";

export type MontageActId = "spark" | "epic" | "legacy";

export const MONTAGE_ACT_IDS: MontageActId[] = ["spark", "epic", "legacy"];

export type MontageFocalPoint = {
  /** 0..1 — horizontal fraction from image left edge */
  x: number;
  /** 0..1 — vertical fraction from image top edge */
  y: number;
};

export type WizardMontageState = {
  acts: Record<MontageActId, string[]>;
  /** Médias retirés de la timeline narrative mais toujours dans le projet. */
  unassignedIds?: string[];
  excludedIds: string[];
  focalPoints: Record<string, MontageFocalPoint>;
};

export type WizardStateV1 = {
  version: typeof WIZARD_STATE_VERSION;
  essentials?: {
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    deathDate?: string;
    avatarPath?: string;
  };
  socialSources?: {
    selected?: SocialId;
    url?: string;
  };
  montage?: WizardMontageState;
  extensions?: WizardExtensionsState;
  musicalAmbiance?: {
    /** @deprecated Conservé pour rehydratation legacy — ne pas persister */
    mood?: MoodId;
    /** @deprecated Conservé pour rehydratation legacy — ne pas persister */
    trackOrder?: TrackId[];
    /** @deprecated Migré vers tracks.acte1 */
    selectedTrack?: WizardSelectedTrack;
    tracks?: WizardActTracks;
    catalogProvider?: string;
  };
};

export type WizardInitialDraft = {
  id: string;
  user_id?: string | null;
  tenant_id?: string | null;
  wizard_state: WizardStateV1 | Record<string, unknown>;
  wizard_step: number;
  last_saved_at: string | null;
  status?: string;
};

export type DraftCreateResult = {
  id: string;
  user_id?: string | null;
  tenant_id?: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, Math.round(value * 1000) / 1000));
}

export function emptyMontageState(): WizardMontageState {
  return {
    acts: { spark: [], epic: [], legacy: [] },
    unassignedIds: [],
    excludedIds: [],
    focalPoints: {},
  };
}

/** Ordre persisté en DB : Actes I→III puis zone non assignée. */
export function flattenMontageOrder(montage: WizardMontageState): string[] {
  return [...flattenActOrder(montage.acts), ...(montage.unassignedIds ?? [])];
}

/** Global narrative order: Act I → Act II → Act III (excluded items included). */
export function flattenActOrder(
  acts: Record<MontageActId, string[]>,
): string[] {
  return [...acts.spark, ...acts.epic, ...acts.legacy];
}

export function countIncludedMedia(
  montage: WizardMontageState,
): number {
  const excluded = new Set(montage.excludedIds);
  return flattenActOrder(montage.acts).filter((id) => !excluded.has(id))
    .length;
}

export function coerceMontageState(raw: unknown): WizardMontageState {
  const base = emptyMontageState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;

  const obj = raw as Record<string, unknown>;
  const actsRaw = obj.acts;
  const acts = { ...base.acts };

  if (actsRaw && typeof actsRaw === "object" && !Array.isArray(actsRaw)) {
    for (const actId of MONTAGE_ACT_IDS) {
      const list = (actsRaw as Record<string, unknown>)[actId];
      if (Array.isArray(list)) {
        acts[actId] = list.filter(
          (id): id is string => typeof id === "string" && isUuid(id),
        );
      }
    }
  }

  const excludedIds = Array.isArray(obj.excludedIds)
    ? obj.excludedIds.filter(
        (id): id is string => typeof id === "string" && isUuid(id),
      )
    : [];

  const unassignedIds = Array.isArray(obj.unassignedIds)
    ? obj.unassignedIds.filter(
        (id): id is string => typeof id === "string" && isUuid(id),
      )
    : [];

  const focalPoints: Record<string, MontageFocalPoint> = {};
  if (
    obj.focalPoints &&
    typeof obj.focalPoints === "object" &&
    !Array.isArray(obj.focalPoints)
  ) {
    for (const [key, value] of Object.entries(obj.focalPoints)) {
      if (!isUuid(key)) continue;
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const pt = value as Record<string, unknown>;
      if (typeof pt.x !== "number" || typeof pt.y !== "number") continue;
      focalPoints[key] = { x: clampUnit(pt.x), y: clampUnit(pt.y) };
    }
  }

  return { acts, unassignedIds, excludedIds, focalPoints };
}

function coerceSelectedTrack(raw: unknown): WizardSelectedTrack | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const artist = typeof obj.artist === "string" ? obj.artist.trim() : "";
  const trackId = typeof obj.trackId === "string" ? obj.trackId.trim() : "";
  const coverUrl =
    typeof obj.coverUrl === "string" ? obj.coverUrl.trim() : "";
  const previewUrl =
    typeof obj.previewUrl === "string" ? obj.previewUrl.trim() : undefined;
  if (!title || !artist || !trackId) return undefined;
  const isStingrayComposite = trackId.startsWith("sr:");
  const catalog = isStingrayComposite ? undefined : findCatalogTrack(trackId);
  const resolvedPreviewUrl =
    previewUrl ||
    (trackId ? buildMusicPreviewProxyUrl(trackId) : undefined) ||
    catalog?.previewUrl?.trim() ||
    undefined;
  return {
    title,
    artist,
    trackId,
    coverUrl: coverUrl || catalog?.coverUrl || "",
    ...(resolvedPreviewUrl ? { previewUrl: resolvedPreviewUrl } : {}),
  };
}

function coerceActTracks(raw: unknown): WizardActTracks {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const result: WizardActTracks = {};

  for (const key of WIZARD_ACT_TRACK_KEYS) {
    const track = coerceSelectedTrack(obj[key]);
    if (track) result[key] = track;
  }

  return result;
}

function coerceMusicalAmbiance(
  raw: unknown,
): WizardStateV1["musicalAmbiance"] | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;

  let tracks = coerceActTracks(obj.tracks);

  if (!hasAnyActTrack(tracks)) {
    const legacy =
      coerceSelectedTrack(obj.selectedTrack) ??
      (typeof obj.catalogTrackId === "string"
        ? (() => {
            const found = findCatalogTrack(obj.catalogTrackId.trim());
            return found
              ? {
                  title: found.title,
                  artist: found.artist,
                  trackId: found.id,
                  coverUrl: found.coverUrl,
                  previewUrl: found.previewUrl,
                }
              : undefined;
          })()
        : undefined);

    if (legacy) {
      const catalog = findCatalogTrack(legacy.trackId);
      tracks = {
        acte1: {
          ...legacy,
          previewUrl: legacy.previewUrl ?? catalog?.previewUrl,
        },
      };
    }
  }

  if (!hasAnyActTrack(tracks)) return undefined;

  const catalogProvider =
    typeof obj.catalogProvider === "string" && obj.catalogProvider.trim()
      ? obj.catalogProvider.trim()
      : undefined;

  return {
    tracks,
    ...(catalogProvider ? { catalogProvider } : {}),
  };
}

function hasAnyActTrack(tracks: WizardActTracks): boolean {
  return WIZARD_ACT_TRACK_KEYS.some((key) => Boolean(tracks[key]?.trackId));
}

export function emptyWizardState(): WizardStateV1 {
  return { version: WIZARD_STATE_VERSION };
}

export function coerceWizardState(raw: unknown): WizardStateV1 {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyWizardState();
  }
  const obj = raw as Record<string, unknown>;
  const extensions = migrateLegacyExtensions(
    obj,
    coerceExtensionsState(obj.extensions),
  );

  const state: WizardStateV1 = {
    version: WIZARD_STATE_VERSION,
    ...(obj.essentials && typeof obj.essentials === "object"
      ? { essentials: obj.essentials as WizardStateV1["essentials"] }
      : {}),
    ...(obj.socialSources && typeof obj.socialSources === "object"
      ? { socialSources: obj.socialSources as WizardStateV1["socialSources"] }
      : {}),
    ...(obj.montage !== undefined
      ? { montage: coerceMontageState(obj.montage) }
      : {}),
    ...(Object.keys(extensions).length ? { extensions } : {}),
    ...(obj.musicalAmbiance !== undefined
      ? { musicalAmbiance: coerceMusicalAmbiance(obj.musicalAmbiance) }
      : {}),
  };

  return state;
}

export function clampWizardStep(step: number, max = 10): number {
  if (!Number.isFinite(step)) return 1;
  return Math.min(Math.max(Math.trunc(step), 1), max);
}

/** Remap legacy drafts saved at old step indices. */
export function resolveInitialWizardStep(
  rawStep: number | undefined,
  wizardState: WizardStateV1,
  totalSteps: number,
): number {
  let step = clampWizardStep(rawStep ?? 1, totalSteps);

  if (step === 4 && !wizardState.montage) {
    const hadLaterProgress =
      Boolean(
        wizardState.musicalAmbiance?.tracks &&
          hasAnyActTrack(wizardState.musicalAmbiance.tracks),
      ) ||
      Boolean(wizardState.extensions && Object.keys(wizardState.extensions).length);

    if (hadLaterProgress) {
      return Math.min(5, totalSteps);
    }
    return step;
  }

  if (totalSteps >= 7) {
    const hasSelectedTracks = Boolean(
      wizardState.musicalAmbiance?.tracks &&
        hasAnyActTrack(wizardState.musicalAmbiance.tracks),
    );
    const hasExtensions = Boolean(
      wizardState.extensions &&
        Object.values(wizardState.extensions).some(Boolean),
    );

    if (step === 5 && !hasSelectedTracks && hasExtensions) {
      return 6;
    }
    if (step === 6 && hasSelectedTracks && !hasExtensions) {
      return 5;
    }
    if (step === 5 && hasSelectedTracks && !hasExtensions) {
      return 5;
    }
    if (step === 6 && hasExtensions) {
      return 6;
    }
  }

  return step;
}
