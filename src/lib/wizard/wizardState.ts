/** Wizard autosave payload — aligned with `/api/projects/[id]/autosave` Zod schemas. */

import {
  coerceExtensionsState,
  migrateLegacyExtensions,
} from "@/src/lib/wizard/wizardExtensions";
import { buildMusicPreviewProxyUrl } from "@/src/lib/music/stingrayTrackId";
import {
  findCatalogTrack,
  STINGRAY_CATALOG_PROVIDER,
  type WizardActTrackKey,
  type WizardActTracks,
  type WizardSelectedTrack,
  WIZARD_ACT_TRACK_KEYS,
} from "@/src/lib/wizard/stingrayCatalog";
import {
  buildPricingSnapshot,
  resolvePartnerTokenCost,
} from "@/src/lib/wizard/wizardPricing";
import type {
  WizardBasePackage,
  WizardExtensionsState,
  WizardPricingSnapshot,
} from "@/src/lib/wizard/wizardPricing";
import { normalizeBasePackageId } from "@/src/lib/wizard/pricingConfig";
import type { WizardChannel } from "@/src/lib/wizard/channelProfile";

export type { WizardExtensionsState } from "@/src/lib/wizard/wizardPricing";
export type {
  WizardSelectedTrack,
  WizardActTrackKey,
  WizardActTracks,
} from "@/src/lib/wizard/stingrayCatalog";

export const WIZARD_STATE_VERSION = 2 as const;

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

export type WizardStoryboardSongBase = {
  /** Libellé affichable dans l'UI. */
  title: string;
  /**
   * Durée réelle en secondes.
   * `null` = inconnue au moment de la migration / parsing.
   */
  durationSec?: number | null;
};

export type WizardStoryboardStingraySong = WizardStoryboardSongBase & {
  source: "stingray";
  /** Identifiant catalogue durable. */
  trackId: string;
  artist: string;
  coverUrl?: string;
};

export type WizardStoryboardUploadSong = WizardStoryboardSongBase & {
  source: "upload";
  /** Chemin Storage durable, jamais une URL signée. */
  storagePath: string;
  /** Nom de fichier d'origine ou libellé dérivé. */
  fileName?: string;
  mimeType?: string;
  artist?: string;
};

export type WizardStoryboardSong =
  | WizardStoryboardStingraySong
  | WizardStoryboardUploadSong;

/**
 * Intention narrative d'un chapitre — capturée dès S4 pour préparer un
 * pacing dynamique par mood (ticket futur, non implémenté : voir
 * `storyboardPacing.ts`). `undefined` = pacing par défaut du forfait.
 */
export type WizardStoryboardChapterMood =
  | "contemplative"
  | "energetic"
  | "nostalgic";

export type WizardStoryboardChapter = {
  /**
   * ID stable du chapitre.
   * L'ordre visuel = index dans `chapters`.
   */
  id: string;
  /** Titre personnalisé — si absent, l'UI utilise le libellé par défaut du chapitre. */
  label?: string;
  /**
   * Liste ordonnée des media_assets assignés à ce chapitre.
   * L'ordre narratif du chapitre = ordre du tableau.
   */
  mediaIds: string[];
  /**
   * Chanson liée au chapitre.
   * Absente si le chapitre n'a pas encore de piste.
   */
  song?: WizardStoryboardSong;
  /** Voir `WizardStoryboardChapterMood`. */
  mood?: WizardStoryboardChapterMood;
};

/**
 * Extrait vidéo retenu pour un media_asset de type vidéo.
 * Indexé par media asset id dans `WizardStoryboardState.videoTrims`
 * (même convention que `focalPoints`) car une vidéo garde son point de
 * coupe indépendamment du chapitre auquel elle est rattachée.
 */
export type WizardStoryboardVideoTrim = {
  /** Début de l'extrait retenu, en secondes depuis le début du fichier source. */
  trimStartSec: number;
  /**
   * Durée de l'extrait, en secondes — fixée à `VIDEO_TRIM_DURATION_SEC` (10s,
   * voir storyboardPacing.ts) pour préserver le rythme cinématographique.
   */
  durationSec: number;
};

export type WizardStoryboardState = {
  /**
   * Liste ordonnée des chapitres.
   * Le schéma autorise `[]` pour les drafts précoces.
   */
  chapters: WizardStoryboardChapter[];
  /**
   * Médias présents dans le projet mais pas encore assignés à un chapitre.
   */
  unassignedIds: string[];
  /**
   * Médias exclus du rendu mais conservés dans l'organisation.
   * Un média peut rester dans un chapitre ET être exclu.
   */
  excludedIds: string[];
  /**
   * Focal points conservés par media asset id.
   */
  focalPoints: Record<string, MontageFocalPoint>;
  /**
   * Extraits vidéo (trim) conservés par media asset id — voir
   * `WizardStoryboardVideoTrim`. Indépendant du chapitre pour survivre à un
   * déplacement de la vidéo entre bacs.
   */
  videoTrims: Record<string, WizardStoryboardVideoTrim>;
};

export type WizardLegacyMusicalAmbianceState = {
  /** @deprecated Conservé pour rehydratation legacy — ne pas persister */
  mood?: MoodId;
  /** @deprecated Conservé pour rehydratation legacy — ne pas persister */
  trackOrder?: TrackId[];
  /** @deprecated Migré vers tracks.acte1 */
  selectedTrack?: WizardSelectedTrack;
  tracks?: WizardActTracks;
  catalogProvider?: string;
};

export type { WizardBasePackage } from "@/src/lib/wizard/wizardPricing";

/**
 * Runtime transitional state:
 * - `storyboard` devient la source de vérité canonique
 * - `montage` et `musicalAmbiance` restent exposés temporairement
 *   pour ne pas casser l'UI actuelle avant la refonte Storyboard.
 */
export type WizardStateV1 = {
  version: typeof WIZARD_STATE_VERSION;
  /** Mode funérarium / partenaire B2B vs famille B2C. */
  isPartner?: boolean;
  /** Canal d'entrée (Cascade V-Final / ChannelProfile). */
  channel?: WizardChannel;
  /**
   * @deprecated Freemium V1 — préférer `intendedPackage`.
   * Conservé = miroir de `intendedPackage` pour compat P7/UI.
   */
  basePackage?: WizardBasePackage;
  /** Forfait offert par le salon (immuable côté Soft Cap). */
  grantedPackage?: WizardBasePackage;
  /** Forfait construit (Soft Cap / Dossier) — pilote quotas + panier. */
  intendedPackage?: WizardBasePackage;
  /** Attestation ToS upload MP3 (Phase 4). */
  musicRightsAttestation?: {
    acceptedAt: string;
    tosVersion: string;
  };
  /** Snapshot tarifaire pour checkout (recalculé à chaque autosave). */
  pricing?: WizardPricingSnapshot;
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
  /**
   * Nouvelle source de vérité canonique.
   * Persistée côté DB à partir de S2.
   */
  storyboard?: WizardStoryboardState;
  /**
   * Legacy runtime bridge — lecture uniquement pendant la transition.
   */
  montage?: WizardMontageState;
  extensions?: WizardExtensionsState;
  /**
   * Legacy runtime bridge — lecture uniquement pendant la transition.
   */
  musicalAmbiance?: WizardLegacyMusicalAmbianceState;
};

export type WizardStatePersistedV2 = Omit<
  WizardStateV1,
  "montage" | "musicalAmbiance"
> & {
  version: typeof WIZARD_STATE_VERSION;
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

const CHAPTER_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

type LegacyStoryboardBridge = {
  actId: MontageActId;
  trackKey: WizardActTrackKey;
  chapterId: string;
};

const LEGACY_STORYBOARD_BRIDGE: readonly LegacyStoryboardBridge[] = [
  { actId: "spark", trackKey: "acte1", chapterId: "chapter-1" },
  { actId: "epic", trackKey: "acte2", chapterId: "chapter-2" },
  { actId: "legacy", trackKey: "acte3", chapterId: "chapter-3" },
] as const;

function parseDurationLabelToSeconds(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function coerceDurationSec(raw: unknown): number | null | undefined {
  if (raw === null) return null;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  const normalized = Math.trunc(raw);
  if (normalized <= 0 || normalized > 3600) return undefined;
  return normalized;
}

function normalizeChapterId(raw: unknown, fallbackIndex: number): string {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (value && CHAPTER_ID_RE.test(value)) return value;
  return `chapter-${fallbackIndex + 1}`;
}

function ensureUniqueChapterId(
  requestedId: string,
  usedIds: Set<string>,
): string {
  if (!usedIds.has(requestedId)) return requestedId;
  let suffix = 2;
  let next = `${requestedId}-${suffix}`;
  while (usedIds.has(next)) {
    suffix += 1;
    next = `${requestedId}-${suffix}`;
  }
  return next;
}

export function emptyStoryboardState(): WizardStoryboardState {
  return {
    chapters: [],
    unassignedIds: [],
    excludedIds: [],
    focalPoints: {},
    videoTrims: {},
  };
}

function hasMontageSignal(montage: WizardMontageState | undefined): boolean {
  if (!montage) return false;
  if ((montage.unassignedIds ?? []).length > 0) return true;
  if (montage.excludedIds.length > 0) return true;
  if (Object.keys(montage.focalPoints).length > 0) return true;
  return MONTAGE_ACT_IDS.some((actId) => (montage.acts[actId] ?? []).length > 0);
}

function hasStoryboardSignal(storyboard: WizardStoryboardState | undefined): boolean {
  if (!storyboard) return false;
  return (
    storyboard.chapters.length > 0 ||
    storyboard.unassignedIds.length > 0 ||
    storyboard.excludedIds.length > 0 ||
    Object.keys(storyboard.focalPoints).length > 0 ||
    Object.keys(storyboard.videoTrims).length > 0
  );
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

function coerceStoryboardSong(
  raw: unknown,
): WizardStoryboardSong | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const source = typeof obj.source === "string" ? obj.source.trim() : "";

  if (source === "stingray") {
    const trackId = typeof obj.trackId === "string" ? obj.trackId.trim() : "";
    const catalog = trackId ? findCatalogTrack(trackId) : undefined;
    const title =
      typeof obj.title === "string" && obj.title.trim()
        ? obj.title.trim()
        : catalog?.title?.trim() ?? "";
    const artist =
      typeof obj.artist === "string" && obj.artist.trim()
        ? obj.artist.trim()
        : catalog?.artist?.trim() ?? "";
    const coverUrl =
      typeof obj.coverUrl === "string" && obj.coverUrl.trim()
        ? obj.coverUrl.trim()
        : catalog?.coverUrl?.trim() ?? "";
    const durationSec =
      coerceDurationSec(obj.durationSec) ??
      parseDurationLabelToSeconds(catalog?.duration) ??
      undefined;

    if (!trackId || !title || !artist) return undefined;

    return {
      source: "stingray",
      trackId,
      title,
      artist,
      ...(coverUrl ? { coverUrl } : {}),
      ...(durationSec !== undefined ? { durationSec } : {}),
    };
  }

  if (source === "upload") {
    const storagePath =
      typeof obj.storagePath === "string" ? obj.storagePath.trim() : "";
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    const fileName =
      typeof obj.fileName === "string" && obj.fileName.trim()
        ? obj.fileName.trim()
        : undefined;
    const mimeType =
      typeof obj.mimeType === "string" && obj.mimeType.trim()
        ? obj.mimeType.trim()
        : undefined;
    const artist =
      typeof obj.artist === "string" && obj.artist.trim()
        ? obj.artist.trim()
        : undefined;
    const durationSec = coerceDurationSec(obj.durationSec);

    if (!storagePath || !title) return undefined;

    return {
      source: "upload",
      storagePath,
      title,
      ...(fileName ? { fileName } : {}),
      ...(mimeType ? { mimeType } : {}),
      ...(artist ? { artist } : {}),
      ...(durationSec !== undefined ? { durationSec } : {}),
    };
  }

  return undefined;
}

const CHAPTER_MOODS: readonly WizardStoryboardChapterMood[] = [
  "contemplative",
  "energetic",
  "nostalgic",
];

function coerceChapterMood(
  raw: unknown,
): WizardStoryboardChapterMood | undefined {
  return typeof raw === "string" &&
    (CHAPTER_MOODS as readonly string[]).includes(raw)
    ? (raw as WizardStoryboardChapterMood)
    : undefined;
}

function coerceStoryboardChapter(
  raw: unknown,
  index: number,
): WizardStoryboardChapter | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;

  const mediaIdsRaw = Array.isArray(obj.mediaIds) ? obj.mediaIds : [];
  const seen = new Set<string>();
  const mediaIds: string[] = [];

  for (const value of mediaIdsRaw) {
    if (typeof value !== "string" || !isUuid(value) || seen.has(value)) continue;
    seen.add(value);
    mediaIds.push(value);
  }

  const song = coerceStoryboardSong(obj.song);
  const mood = coerceChapterMood(obj.mood);
  const label =
    typeof obj.label === "string" && obj.label.trim().length > 0
      ? obj.label.trim().slice(0, 40)
      : undefined;
  if (mediaIds.length === 0 && !song) return undefined;

  return {
    id: normalizeChapterId(obj.id, index),
    mediaIds,
    ...(label ? { label } : {}),
    ...(song ? { song } : {}),
    ...(mood ? { mood } : {}),
  };
}

function coerceVideoTrim(raw: unknown): WizardStoryboardVideoTrim | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const trimStartSec =
    typeof obj.trimStartSec === "number" && Number.isFinite(obj.trimStartSec)
      ? Math.max(0, Math.round(obj.trimStartSec * 100) / 100)
      : undefined;
  const durationSec =
    typeof obj.durationSec === "number" &&
    Number.isFinite(obj.durationSec) &&
    obj.durationSec > 0
      ? Math.round(obj.durationSec * 100) / 100
      : undefined;
  if (trimStartSec === undefined || durationSec === undefined) return undefined;
  return { trimStartSec, durationSec };
}

export function coerceStoryboardState(raw: unknown): WizardStoryboardState {
  const base = emptyStoryboardState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;

  const obj = raw as Record<string, unknown>;
  const chaptersRaw = Array.isArray(obj.chapters) ? obj.chapters : [];
  const usedChapterIds = new Set<string>();
  const assignedMediaIds = new Set<string>();
  const chapters: WizardStoryboardChapter[] = [];

  for (let index = 0; index < chaptersRaw.length; index += 1) {
    const chapter = coerceStoryboardChapter(chaptersRaw[index], index);
    if (!chapter) continue;

    const id = ensureUniqueChapterId(chapter.id, usedChapterIds);
    usedChapterIds.add(id);

    const mediaIds = chapter.mediaIds.filter((mediaId) => {
      if (assignedMediaIds.has(mediaId)) return false;
      assignedMediaIds.add(mediaId);
      return true;
    });

    if (mediaIds.length === 0 && !chapter.song) continue;

    chapters.push({
      id,
      mediaIds,
      ...(chapter.song ? { song: chapter.song } : {}),
      ...(chapter.mood ? { mood: chapter.mood } : {}),
    });
  }

  const seenUnassigned = new Set<string>();
  const unassignedIds = Array.isArray(obj.unassignedIds)
    ? obj.unassignedIds.filter((id): id is string => {
        if (typeof id !== "string" || !isUuid(id)) return false;
        if (assignedMediaIds.has(id)) return false;
        if (seenUnassigned.has(id)) return false;
        seenUnassigned.add(id);
        return true;
      })
    : [];

  const seenExcluded = new Set<string>();
  const excludedIds = Array.isArray(obj.excludedIds)
    ? obj.excludedIds.filter((id): id is string => {
        if (typeof id !== "string" || !isUuid(id)) return false;
        if (seenExcluded.has(id)) return false;
        seenExcluded.add(id);
        return true;
      })
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

  const videoTrims: Record<string, WizardStoryboardVideoTrim> = {};
  if (
    obj.videoTrims &&
    typeof obj.videoTrims === "object" &&
    !Array.isArray(obj.videoTrims)
  ) {
    for (const [key, value] of Object.entries(obj.videoTrims)) {
      if (!isUuid(key)) continue;
      const trim = coerceVideoTrim(value);
      if (trim) videoTrims[key] = trim;
    }
  }

  return {
    chapters,
    unassignedIds,
    excludedIds,
    focalPoints,
    videoTrims,
  };
}

function storyboardSongFromLegacyTrack(
  track: WizardSelectedTrack | undefined,
): WizardStoryboardSong | undefined {
  if (!track?.trackId?.trim()) return undefined;
  const catalog = findCatalogTrack(track.trackId.trim());
  const durationSec =
    parseDurationLabelToSeconds(catalog?.duration) ?? null;

  return {
    source: "stingray",
    trackId: track.trackId.trim(),
    title: track.title.trim(),
    artist: track.artist.trim(),
    ...(track.coverUrl?.trim() ? { coverUrl: track.coverUrl.trim() } : {}),
    durationSec,
  };
}

export function migrateLegacyWizardStateToStoryboard(input: {
  montage?: WizardMontageState;
  musicalAmbiance?: WizardLegacyMusicalAmbianceState;
}): WizardStoryboardState | undefined {
  const montage = input.montage;
  const musicalAmbiance = input.musicalAmbiance;
  const tracks = musicalAmbiance?.tracks ?? {};
  const hasLegacyTracks = hasAnyActTrack(tracks);
  const hasLegacyMontage = hasMontageSignal(montage);

  if (!hasLegacyTracks && !hasLegacyMontage) return undefined;

  const safeMontage = montage ?? emptyMontageState();
  const chapters: WizardStoryboardChapter[] = [];

  for (const bridge of LEGACY_STORYBOARD_BRIDGE) {
    const mediaIds = [...(safeMontage.acts[bridge.actId] ?? [])];
    const song = storyboardSongFromLegacyTrack(tracks[bridge.trackKey]);

    if (mediaIds.length === 0 && !song) continue;

    chapters.push({
      id: bridge.chapterId,
      mediaIds,
      ...(song ? { song } : {}),
    });
  }

  return {
    chapters,
    unassignedIds: [...(safeMontage.unassignedIds ?? [])],
    excludedIds: [...safeMontage.excludedIds],
    focalPoints: { ...safeMontage.focalPoints },
    videoTrims: {},
  };
}

function selectedTrackFromStoryboardSong(
  song: WizardStoryboardSong | undefined,
): WizardSelectedTrack | undefined {
  if (!song || song.source !== "stingray") return undefined;
  return {
    title: song.title,
    artist: song.artist,
    trackId: song.trackId,
    coverUrl: song.coverUrl ?? "",
    previewUrl: buildMusicPreviewProxyUrl(song.trackId),
  };
}

function legacyMontageFromStoryboard(
  storyboard: WizardStoryboardState,
): WizardMontageState {
  const base = emptyMontageState();

  for (let index = 0; index < LEGACY_STORYBOARD_BRIDGE.length; index += 1) {
    const bridge = LEGACY_STORYBOARD_BRIDGE[index];
    const chapter = storyboard.chapters[index];
    base.acts[bridge.actId] = [...(chapter?.mediaIds ?? [])];
  }

  // Les chapitres > 3 sont projetés en zone non assignée pendant la transition UI,
  // afin d'éviter de "perdre" des médias dans le runtime legacy.
  const overflowChapterMediaIds = storyboard.chapters
    .slice(LEGACY_STORYBOARD_BRIDGE.length)
    .flatMap((chapter) => chapter.mediaIds);

  const seen = new Set<string>();
  const unassignedIds = [
    ...storyboard.unassignedIds,
    ...overflowChapterMediaIds,
  ].filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return {
    acts: base.acts,
    unassignedIds,
    excludedIds: [...storyboard.excludedIds],
    focalPoints: { ...storyboard.focalPoints },
  };
}

function legacyMusicalAmbianceFromStoryboard(
  storyboard: WizardStoryboardState,
): WizardLegacyMusicalAmbianceState | undefined {
  const tracks: WizardActTracks = {};

  for (let index = 0; index < LEGACY_STORYBOARD_BRIDGE.length; index += 1) {
    const bridge = LEGACY_STORYBOARD_BRIDGE[index];
    const chapter = storyboard.chapters[index];
    const selectedTrack = selectedTrackFromStoryboardSong(chapter?.song);
    if (selectedTrack) {
      tracks[bridge.trackKey] = selectedTrack;
    }
  }

  if (!hasAnyActTrack(tracks)) return undefined;

  return {
    tracks,
    catalogProvider: STINGRAY_CATALOG_PROVIDER,
  };
}

function coerceMusicalAmbiance(
  raw: unknown,
): WizardLegacyMusicalAmbianceState | undefined {
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

function coerceIsPartner(raw: unknown): boolean {
  return raw === true;
}

function coercePricingSnapshot(
  raw: unknown,
  fallbackPackage: WizardBasePackage,
  isPartner: boolean,
): WizardPricingSnapshot | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const basePackage = coerceBasePackage(obj.basePackage ?? fallbackPackage);
  const baseCents = typeof obj.baseCents === "number" ? obj.baseCents : 0;
  const optionsCents = typeof obj.optionsCents === "number" ? obj.optionsCents : 0;
  const totalCents = typeof obj.totalCents === "number" ? obj.totalCents : 0;
  if (baseCents < 0 || optionsCents < 0 || totalCents < 0) return undefined;
  const storedTokens =
    typeof obj.partnerTokenCost === "number" ? obj.partnerTokenCost : undefined;

  const resolvedPartnerTokenCost = isPartner
    ? resolvePartnerTokenCost(basePackage)
    : undefined;

  return {
    basePackage,
    baseCents,
    optionsCents,
    totalCents,
    ...(isPartner
      ? resolvedPartnerTokenCost !== undefined
        ? {
            partnerTokenCost: storedTokens ?? resolvedPartnerTokenCost,
          }
        : {}
      : {}),
  };
}

function coerceBasePackage(raw: unknown): WizardBasePackage {
  if (typeof raw === "string") {
    return normalizeBasePackageId(raw);
  }
  return normalizeBasePackageId(undefined);
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
  const isPartner = coerceIsPartner(obj.isPartner);
  const channel: WizardChannel | undefined =
    obj.channel === "partner" || obj.channel === "direct"
      ? obj.channel
      : undefined;
  const intendedPackage = coerceBasePackage(
    obj.intendedPackage ?? obj.basePackage,
  );
  const grantedPackage = coerceBasePackage(
    obj.grantedPackage ?? obj.basePackage ?? intendedPackage,
  );
  /** Miroir Soft Cap — UI / P7 legacy lisent encore basePackage. */
  const basePackage = intendedPackage;

  const pricing =
    coercePricingSnapshot(obj.pricing, basePackage, isPartner) ??
    buildPricingSnapshot(extensions, basePackage, isPartner);

  let musicRightsAttestation: WizardStateV1["musicRightsAttestation"];
  if (
    obj.musicRightsAttestation &&
    typeof obj.musicRightsAttestation === "object" &&
    !Array.isArray(obj.musicRightsAttestation)
  ) {
    const att = obj.musicRightsAttestation as Record<string, unknown>;
    if (
      typeof att.acceptedAt === "string" &&
      typeof att.tosVersion === "string"
    ) {
      musicRightsAttestation = {
        acceptedAt: att.acceptedAt,
        tosVersion: att.tosVersion,
      };
    }
  }

  const legacyMontage =
    obj.montage !== undefined ? coerceMontageState(obj.montage) : undefined;
  const legacyMusicalAmbiance =
    obj.musicalAmbiance !== undefined
      ? coerceMusicalAmbiance(obj.musicalAmbiance)
      : undefined;

  const explicitStoryboard =
    obj.storyboard !== undefined
      ? coerceStoryboardState(obj.storyboard)
      : undefined;
  const migratedLegacyStoryboard = migrateLegacyWizardStateToStoryboard({
    montage: legacyMontage,
    musicalAmbiance: legacyMusicalAmbiance,
  });
  const storyboard = explicitStoryboard
    ? hasStoryboardSignal(explicitStoryboard)
      ? explicitStoryboard
      : migratedLegacyStoryboard ?? explicitStoryboard
    : migratedLegacyStoryboard;

  const runtimeMontage = storyboard
    ? legacyMontageFromStoryboard(storyboard)
    : legacyMontage;

  const runtimeMusicalAmbiance = storyboard
    ? legacyMusicalAmbianceFromStoryboard(storyboard) ?? legacyMusicalAmbiance
    : legacyMusicalAmbiance;

  const state: WizardStateV1 = {
    version: WIZARD_STATE_VERSION,
    ...(isPartner ? { isPartner: true } : {}),
    ...(channel ? { channel } : {}),
    basePackage,
    grantedPackage,
    intendedPackage,
    pricing,
    ...(musicRightsAttestation ? { musicRightsAttestation } : {}),
    ...(obj.essentials && typeof obj.essentials === "object"
      ? { essentials: obj.essentials as WizardStateV1["essentials"] }
      : {}),
    ...(obj.socialSources && typeof obj.socialSources === "object"
      ? { socialSources: obj.socialSources as WizardStateV1["socialSources"] }
      : {}),
    ...(storyboard ? { storyboard } : {}),
    ...(runtimeMontage ? { montage: runtimeMontage } : {}),
    ...(Object.keys(extensions).length ? { extensions } : {}),
    ...(runtimeMusicalAmbiance
      ? { musicalAmbiance: runtimeMusicalAmbiance }
      : {}),
  };

  return state;
}

export function buildPersistedWizardState(
  state: WizardStateV1,
): WizardStatePersistedV2 {
  const storyboard =
    state.storyboard ??
    migrateLegacyWizardStateToStoryboard({
      montage: state.montage,
      musicalAmbiance: state.musicalAmbiance,
    });

  return {
    version: WIZARD_STATE_VERSION,
    ...(state.isPartner ? { isPartner: true } : {}),
    ...(state.channel ? { channel: state.channel } : {}),
    ...(state.basePackage ? { basePackage: state.basePackage } : {}),
    // Freemium V1 : le Soft Cap dépend de granted/intended — DOIVENT persister.
    ...(state.grantedPackage ? { grantedPackage: state.grantedPackage } : {}),
    ...(state.intendedPackage ? { intendedPackage: state.intendedPackage } : {}),
    ...(state.musicRightsAttestation
      ? { musicRightsAttestation: state.musicRightsAttestation }
      : {}),
    ...(state.pricing ? { pricing: state.pricing } : {}),
    ...(state.essentials ? { essentials: state.essentials } : {}),
    ...(state.socialSources ? { socialSources: state.socialSources } : {}),
    ...(storyboard ? { storyboard } : {}),
    ...(state.extensions ? { extensions: state.extensions } : {}),
  };
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
