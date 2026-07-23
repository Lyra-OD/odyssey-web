/**
 * Gestion des chapitres du storyboard (ticket S5/S6 — Étape 4 "chapitres
 * musicaux"). Le nombre de bacs n'est jamais une valeur libre : il découle du
 * forfait (`PACKAGE_MANIFEST[...].limits.maxSongs`) et du volume de médias
 * déjà uploadés (`getRequiredSongCountForMediaCount`).
 */

import {
  getRequiredSongCountForMediaCount,
  validatePackagePacing,
  type PackageId,
} from "@/src/lib/wizard/wizardDeliverables";
import type { StingrayTrackApiPayload } from "@/src/lib/wizard/stingrayCatalog";
import type {
  WizardStoryboardChapter,
  WizardStoryboardSong,
  WizardStoryboardState,
} from "@/src/lib/wizard/wizardState";

function parseDurationLabelToSeconds(value: string | undefined): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Convertit un résultat de recherche Stingray en chanson de chapitre (avec `durationSec`). */
export function storyboardSongFromCatalogTrack(
  track: StingrayTrackApiPayload,
): WizardStoryboardSong {
  return {
    source: "stingray",
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    coverUrl: track.coverUrl,
    durationSec: parseDurationLabelToSeconds(track.duration),
  };
}

/** Chanson chapitre depuis un fichier personnel (MP3/WAV) uploadé en Storage. */
export function storyboardSongFromUploadFile(params: {
  storagePath: string;
  fileName: string;
  mimeType?: string;
  durationSec?: number | null;
}): WizardStoryboardSong {
  const title = params.fileName.replace(/\.[^.]+$/, "").trim() || params.fileName;
  return {
    source: "upload",
    storagePath: params.storagePath,
    title,
    fileName: params.fileName,
    ...(params.mimeType ? { mimeType: params.mimeType } : {}),
    ...(params.durationSec != null && Number.isFinite(params.durationSec)
      ? { durationSec: Math.max(1, Math.round(params.durationSec)) }
      : {}),
  };
}

export function buildChapterMusicUploadPath(
  projectId: string,
  file: File,
): string {
  const fromName = file.name.split(".").pop();
  const ext =
    fromName && fromName.length <= 8
      ? fromName.toLowerCase()
      : file.type.includes("wav")
        ? "wav"
        : "mp3";
  return `projects/${projectId}/music/upload-${crypto.randomUUID()}.${ext}`;
}

export function isPersonalAudioFile(file: File): boolean {
  const mime = (file.type || "").toLowerCase();
  if (
    mime === "audio/mpeg" ||
    mime === "audio/mp3" ||
    mime === "audio/wav" ||
    mime === "audio/x-wav" ||
    mime === "audio/wave"
  ) {
    return true;
  }
  const name = file.name.toLowerCase();
  return name.endsWith(".mp3") || name.endsWith(".wav");
}

/** Lit la durée via le navigateur (metadata) — best-effort, avec timeout. */
export function readAudioFileDurationSec(
  file: File,
  timeoutMs = 2500,
): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    let settled = false;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      try {
        audio.removeAttribute("src");
        audio.load();
      } catch {
        /* ignore */
      }
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      // Entier : l'autosave Zod exige `durationSec.int()`.
      finish(
        Number.isFinite(d) && d > 0 ? Math.max(1, Math.round(d)) : null,
      );
    };
    audio.onerror = () => finish(null);
    audio.src = url;
  });
}

function nextChapterId(existingIds: ReadonlySet<string>): string {
  let n = existingIds.size + 1;
  let id = `chapter-${n}`;
  while (existingIds.has(id)) {
    n += 1;
    id = `chapter-${n}`;
  }
  return id;
}

function emptyChapter(id: string): WizardStoryboardChapter {
  return { id, mediaIds: [] };
}

/**
 * Pré-génère le nombre minimum de bacs requis par le forfait pour le volume
 * de médias déjà uploadé — appelé à l'ouverture de l'Étape 4. Ne raccourcit
 * jamais une liste existante (voir `capChaptersToPackageMax` pour le plafond
 * dur). Référentiellement stable si aucun changement n'est nécessaire.
 */
export function ensureMinimumChapters(
  storyboard: WizardStoryboardState,
  minCount: number,
  maxCount: number,
): WizardStoryboardState {
  const target = Math.min(Math.max(Math.trunc(minCount), 1), Math.max(maxCount, 1));
  if (storyboard.chapters.length >= target) return storyboard;

  const usedIds = new Set(storyboard.chapters.map((chapter) => chapter.id));
  const nextChapters = [...storyboard.chapters];

  while (nextChapters.length < target) {
    const id = nextChapterId(usedIds);
    usedIds.add(id);
    nextChapters.push(emptyChapter(id));
  }

  return { ...storyboard, chapters: nextChapters };
}

/**
 * Plafond dur du forfait (ex. rétrogradation de package). Priorité absolue :
 * ne jamais perdre une chanson déjà choisie si la place le permet — on
 * retire d'abord les bacs vides, dans l'ordre, avant de toucher un bac avec
 * chanson. Les médias des bacs finalement retirés sont projetés en zone non
 * assignée (aucune perte silencieuse de média).
 *
 * Seul cas où une chanson est réellement perdue : le nombre de chansons déjà
 * choisies dépasse lui-même `maxCount` (ex. 8 chansons choisies puis
 * rétrogradation vers un forfait à 5 max) — dans ce cas les bacs excédentaires
 * les plus loin dans l'ordre sont retirés. Ce cas doit être anticipé côté UI
 * par un garde-fou de confirmation avant d'appeler cette fonction, voir
 * `countSongsLostIfCappedTo`.
 */
export function capChaptersToPackageMax(
  storyboard: WizardStoryboardState,
  maxCount: number,
): WizardStoryboardState {
  if (storyboard.chapters.length <= maxCount) return storyboard;

  const withSong = storyboard.chapters.filter((chapter) => Boolean(chapter.song));
  const withoutSong = storyboard.chapters.filter((chapter) => !chapter.song);

  const keepIds = new Set<string>();
  if (withSong.length <= maxCount) {
    for (const chapter of withSong) keepIds.add(chapter.id);
    const remainingSlots = maxCount - withSong.length;
    for (const chapter of withoutSong.slice(0, remainingSlots)) {
      keepIds.add(chapter.id);
    }
  } else {
    for (const chapter of withSong.slice(0, maxCount)) keepIds.add(chapter.id);
  }

  const kept = storyboard.chapters.filter((chapter) => keepIds.has(chapter.id));
  const removed = storyboard.chapters.filter((chapter) => !keepIds.has(chapter.id));

  if (removed.length === 0) return storyboard;

  const overflowMediaIds = removed.flatMap((chapter) => chapter.mediaIds);
  if (overflowMediaIds.length === 0) {
    return { ...storyboard, chapters: kept };
  }

  const seen = new Set(storyboard.unassignedIds);
  const nextUnassigned = [...storyboard.unassignedIds];
  for (const id of overflowMediaIds) {
    if (!seen.has(id)) {
      seen.add(id);
      nextUnassigned.push(id);
    }
  }

  return { ...storyboard, chapters: kept, unassignedIds: nextUnassigned };
}

/**
 * Nombre de chansons déjà choisies qui seraient irrémédiablement perdues si
 * `storyboard` était plafonné à `maxCount` bacs. Pure, ne mute rien — sert de
 * garde-fou de confirmation avant d'appliquer un changement de forfait
 * destructeur (ex. sélecteur de forfait Étape 4), avant même d'appeler
 * `capChaptersToPackageMax`.
 */
export function countSongsLostIfCappedTo(
  storyboard: WizardStoryboardState,
  maxCount: number,
): number {
  return Math.max(0, countChaptersWithSong(storyboard) - Math.max(maxCount, 0));
}

/** Ajoute un chapitre vide, borné par `maxSongs` du forfait. */
export function addChapter(
  storyboard: WizardStoryboardState,
  maxCount: number,
): WizardStoryboardState {
  if (storyboard.chapters.length >= maxCount) return storyboard;
  const usedIds = new Set(storyboard.chapters.map((chapter) => chapter.id));
  const id = nextChapterId(usedIds);
  return { ...storyboard, chapters: [...storyboard.chapters, emptyChapter(id)] };
}

/**
 * Retire un chapitre (toujours au moins 1 restant). Les médias déjà
 * assignés à ce chapitre (le cas échéant) sont reprojetés en non assigné.
 */
export function removeChapter(
  storyboard: WizardStoryboardState,
  chapterId: string,
): WizardStoryboardState {
  if (storyboard.chapters.length <= 1) return storyboard;
  const target = storyboard.chapters.find((chapter) => chapter.id === chapterId);
  if (!target) return storyboard;

  const seen = new Set(storyboard.unassignedIds);
  const nextUnassigned = [...storyboard.unassignedIds];
  for (const id of target.mediaIds) {
    if (!seen.has(id)) {
      seen.add(id);
      nextUnassigned.push(id);
    }
  }

  return {
    ...storyboard,
    chapters: storyboard.chapters.filter((chapter) => chapter.id !== chapterId),
    unassignedIds: nextUnassigned,
  };
}

export function assignSongToChapter(
  storyboard: WizardStoryboardState,
  chapterId: string,
  song: WizardStoryboardSong,
): WizardStoryboardState {
  return {
    ...storyboard,
    chapters: storyboard.chapters.map((chapter) =>
      chapter.id === chapterId ? { ...chapter, song } : chapter,
    ),
  };
}

export function clearChapterSong(
  storyboard: WizardStoryboardState,
  chapterId: string,
): WizardStoryboardState {
  return {
    ...storyboard,
    chapters: storyboard.chapters.map((chapter) => {
      if (chapter.id !== chapterId) return chapter;
      const { song: _, ...rest } = chapter;
      return rest;
    }),
  };
}

export function countChaptersWithSong(storyboard: WizardStoryboardState): number {
  return storyboard.chapters.filter((chapter) => Boolean(chapter.song)).length;
}

/** Retourne l'id du chapitre contenant ce média, ou `null` si non assigné. */
export function findChapterForMedia(
  chapters: WizardStoryboardState["chapters"],
  mediaId: string,
): string | null {
  for (const chapter of chapters) {
    if (chapter.mediaIds.includes(mediaId)) return chapter.id;
  }
  return null;
}

/** Index du chapitre dans la liste (pour la palette de couleurs). */
export function chapterIndexById(
  chapters: WizardStoryboardState["chapters"],
  chapterId: string,
): number {
  const index = chapters.findIndex((chapter) => chapter.id === chapterId);
  return index >= 0 ? index : 0;
}

/** Clé d'identité stable d'une chanson, indépendante de la source. */
function songIdentityKey(song: WizardStoryboardSong): string {
  return song.source === "stingray"
    ? `stingray:${song.trackId}`
    : `upload:${song.storagePath}`;
}

export type DuplicateSongInfo = {
  hasDuplicates: boolean;
  /** Chapitres dont la chanson est utilisée dans au moins un autre chapitre. */
  duplicateChapterIds: ReadonlySet<string>;
  /** Signature stable du jeu de doublons courant — sert à invalider un acquittement obsolète. */
  signature: string;
};

const EMPTY_DUPLICATE_SONG_INFO: DuplicateSongInfo = {
  hasDuplicates: false,
  duplicateChapterIds: new Set(),
  signature: "",
};

/**
 * Détecte les chansons choisies dans plusieurs chapitres à la fois. Pure et
 * dérivée de `storyboard` — ne doit jamais être stockée dans le state, un
 * changement de sélection la recalcule automatiquement.
 */
export function detectDuplicateStoryboardSongs(
  storyboard: WizardStoryboardState,
): DuplicateSongInfo {
  const chapterIdsByKey = new Map<string, string[]>();
  for (const chapter of storyboard.chapters) {
    if (!chapter.song) continue;
    const key = songIdentityKey(chapter.song);
    const bucket = chapterIdsByKey.get(key);
    if (bucket) {
      bucket.push(chapter.id);
    } else {
      chapterIdsByKey.set(key, [chapter.id]);
    }
  }

  const duplicateChapterIds = new Set<string>();
  const duplicateKeys: string[] = [];
  for (const [key, chapterIds] of chapterIdsByKey) {
    if (chapterIds.length > 1) {
      duplicateKeys.push(key);
      for (const id of chapterIds) duplicateChapterIds.add(id);
    }
  }

  if (duplicateChapterIds.size === 0) return EMPTY_DUPLICATE_SONG_INFO;

  return {
    hasDuplicates: true,
    duplicateChapterIds,
    signature: duplicateKeys.sort().join("|"),
  };
}

export type StoryboardStructureValidation = {
  minSongsRequired: number;
  maxSongsAllowed: number;
  isValid: boolean;
};

/**
 * Règle de blocage de navigation : le nombre de chapitres avec chanson doit
 * respecter [minSongsRequired, maxSongsAllowed] pour le volume de médias du
 * projet — réutilise le moteur pacing existant (`validatePackagePacing`).
 * Le dépassement de capacité par chapitre (durée réelle) reste un warning
 * non bloquant, porté par `chapterPacingState` (storyboardPacing.ts).
 */
export function validateStoryboardPackageStructure(
  storyboard: WizardStoryboardState,
  packageId: PackageId,
  totalProjectMediaCount: number,
): StoryboardStructureValidation {
  const selectedSongCount = countChaptersWithSong(storyboard);
  return validatePackagePacing(packageId, totalProjectMediaCount, selectedSongCount);
}

export { getRequiredSongCountForMediaCount };

/** Met à jour le titre personnalisé d'un chapitre (Étape 5 — inline edit). */
export function setChapterLabel(
  storyboard: WizardStoryboardState,
  chapterId: string,
  label: string,
): WizardStoryboardState {
  const trimmed = label.trim().slice(0, 40);
  return {
    ...storyboard,
    chapters: storyboard.chapters.map((chapter) => {
      if (chapter.id !== chapterId) return chapter;
      if (!trimmed) {
        const { label: _, ...rest } = chapter;
        return rest;
      }
      return { ...chapter, label: trimmed };
    }),
  };
}

/** Réordonne les chapitres (bloc entier + contenu). */
export function reorderStoryboardChapters(
  storyboard: WizardStoryboardState,
  activeChapterId: string,
  overChapterId: string,
): WizardStoryboardState {
  const oldIndex = storyboard.chapters.findIndex(
    (chapter) => chapter.id === activeChapterId,
  );
  const newIndex = storyboard.chapters.findIndex(
    (chapter) => chapter.id === overChapterId,
  );
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return storyboard;

  const chapters = [...storyboard.chapters];
  const [moved] = chapters.splice(oldIndex, 1);
  chapters.splice(newIndex, 0, moved);
  return { ...storyboard, chapters };
}
