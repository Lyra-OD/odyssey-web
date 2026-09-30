/**
 * Moteur de pacing temporel (ticket S4 + freeze Quiet Luxury 29 sept 2026).
 *
 * Fonctions pures, sans dépendance React. Règles produit :
 *
 * 1. Rythme photo : `targetSecondsPerMedia` (7s) par photo.
 * 2. Vidéos : trim fixe `VIDEO_TRIM_DURATION_SEC` (10s).
 * 3. Marges : intro 5s + outro 5s (outro **8s** sur le dernier chapitre).
 * 4. Option B : taxe ouverture **5s** sur le **premier** chapitre (musique dès t=0
 *    pendant nom + portrait) — `CHAPTER1_OPENING_TAX_SEC`.
 * 5. Breath Engine : réserve `chapterEndHoldSec` / `finaleHoldSec` (canon
 *    `cinematicTheme.breath`) pour que Soft Cap ne déborde pas la piste.
 *
 * `durationSec` inconnu → capacité `null` (UI « à déterminer »).
 */

import { cinematicTheme } from "@/src/lib/creatomate/cinematicTheme";
import {
  packageTargetSecondsPerMedia,
  type PackageId,
} from "@/src/lib/wizard/wizardDeliverables";
import type {
  WizardStoryboardChapter,
  WizardStoryboardChapterMood,
} from "@/src/lib/wizard/wizardState";

/** Durée fixe (post-trim) d'une vidéo dans le calcul de charge d'un chapitre. */
export const VIDEO_TRIM_DURATION_SEC = 10;

/** Marge de respiration réservée en début de chapitre (carton titre). */
export const CHAPTER_INTRO_MARGIN_SEC = 5;
/** Marge outro chapitres non-derniers (fade). */
export const CHAPTER_OUTRO_MARGIN_SEC = 5;
/**
 * Outro du **dernier** chapitre : carte mémoire + noir fin (~6.5+1.55).
 * Remplace `CHAPTER_OUTRO_MARGIN_SEC` (pas 5+8).
 */
export const LAST_CHAPTER_ENDING_OUTRO_SEC = 8;
/**
 * Taxe ouverture cinéma (Option B) — nom + portrait pendant la piste 1.
 * Ajoutée **en plus** des marges, **premier chapitre seulement**.
 */
export const CHAPTER1_OPENING_TAX_SEC = 5;

/** Canon Breath Engine — taxe Soft Cap (miroirs `cinematicTheme.breath`). */
export const BREATH_MAX_MAJOR_PER_FILM =
  cinematicTheme.breath.maxMajorBreathsPerFilm;
export const BREATH_CHAPTER_END_HOLD_SEC =
  cinematicTheme.breath.chapterEndHoldSec;
export const BREATH_FINALE_HOLD_SEC = cinematicTheme.breath.finaleHoldSec;

/** @deprecated Préférer `chapterOverheadSeconds(role)` — somme milieu = 10. */
export const CHAPTER_MARGIN_SEC =
  CHAPTER_INTRO_MARGIN_SEC + CHAPTER_OUTRO_MARGIN_SEC;

export const RECOMMENDED_MIN_TRACK_DURATION_SEC = 3 * 60;

export const AVERAGE_ASSUMED_TRACK_DURATION_SEC = 3.5 * 60;

export type MediaKind = "image" | "video";

/** Position du chapitre dans le film (pour taxes ouverture / finale). */
export type ChapterPacingRole = {
  isFirstChapter: boolean;
  isLastChapter: boolean;
};

export function chapterPacingRole(
  chapterIndex: number,
  chapterCount: number,
): ChapterPacingRole {
  const count = Math.max(0, Math.trunc(chapterCount));
  const index = Math.max(0, Math.trunc(chapterIndex));
  return {
    isFirstChapter: count > 0 && index === 0,
    isLastChapter: count > 0 && index === count - 1,
  };
}

/**
 * Secondes réservées hors médias (intro + outro + taxe ouverture si 1er
 * + hold Breath Engine si `role` fourni).
 */
export function chapterOverheadSeconds(role?: ChapterPacingRole): number {
  const intro = CHAPTER_INTRO_MARGIN_SEC;
  const outro = role?.isLastChapter
    ? LAST_CHAPTER_ENDING_OUTRO_SEC
    : CHAPTER_OUTRO_MARGIN_SEC;
  const openingTax = role?.isFirstChapter ? CHAPTER1_OPENING_TAX_SEC : 0;
  const breathTax = role
    ? role.isLastChapter
      ? BREATH_FINALE_HOLD_SEC
      : BREATH_CHAPTER_END_HOLD_SEC
    : 0;
  return intro + outro + openingTax + breathTax;
}

const MOOD_PACING_MULTIPLIER: Record<WizardStoryboardChapterMood, number> = {
  contemplative: 1,
  energetic: 1,
  nostalgic: 1,
};

export function resolveTargetSecondsPerMedia(
  packageId: PackageId,
  mood?: WizardStoryboardChapterMood,
): number {
  const base = packageTargetSecondsPerMedia(packageId);
  const multiplier = mood ? MOOD_PACING_MULTIPLIER[mood] : 1;
  return base * multiplier;
}

export function mediaCostSeconds(
  kind: MediaKind,
  targetSecondsPerMedia: number,
): number {
  return kind === "video" ? VIDEO_TRIM_DURATION_SEC : targetSecondsPerMedia;
}

export function chapterMediaLoadSeconds(
  items: readonly { kind: MediaKind }[],
  targetSecondsPerMedia: number,
): number {
  return items.reduce(
    (sum, item) => sum + mediaCostSeconds(item.kind, targetSecondsPerMedia),
    0,
  );
}

/**
 * Temps disponible pour des médias.
 * Sans `role` : comportement milieu (intro 5 + outro 5) — compat tests / callers.
 */
export function chapterAvailableSecondsForMedia(
  durationSec: number | null | undefined,
  role?: ChapterPacingRole,
): number {
  if (!durationSec || durationSec <= 0) return 0;
  return Math.max(0, durationSec - chapterOverheadSeconds(role));
}

/**
 * Capacité recommandée (équivalent-photos).
 * `null` = durée inconnue. `0` = trop court après overhead.
 */
export function chapterRecommendedCapacity(
  durationSec: number | null | undefined,
  targetSecondsPerMedia: number,
  role?: ChapterPacingRole,
): number | null {
  if (!durationSec || durationSec <= 0) return null;
  if (!targetSecondsPerMedia || targetSecondsPerMedia <= 0) return null;
  const available = chapterAvailableSecondsForMedia(durationSec, role);
  if (available <= 0) return 0;
  return Math.floor(available / targetSecondsPerMedia);
}

export type ChapterPacingState = {
  capacity: number | null;
  assignedCount: number;
  isOverloaded: boolean;
};

export function chapterPacingState(
  chapter: Pick<WizardStoryboardChapter, "mediaIds" | "song" | "mood">,
  packageId: PackageId,
  role?: ChapterPacingRole,
): ChapterPacingState {
  const targetSecondsPerMedia = resolveTargetSecondsPerMedia(
    packageId,
    chapter.mood,
  );
  const capacity = chapterRecommendedCapacity(
    chapter.song?.durationSec,
    targetSecondsPerMedia,
    role,
  );
  const assignedCount = chapter.mediaIds.length;

  return {
    capacity,
    assignedCount,
    isOverloaded: capacity !== null && assignedCount > capacity,
  };
}

export function estimateStoryboardTotalDurationSec(
  chapters: readonly Pick<WizardStoryboardChapter, "song">[],
): number {
  return chapters.reduce((total, chapter) => {
    const durationSec = chapter.song?.durationSec;
    const resolved =
      typeof durationSec === "number" && durationSec > 0
        ? durationSec
        : AVERAGE_ASSUMED_TRACK_DURATION_SEC;
    return total + resolved;
  }, 0);
}

export type ChapterTimeLoadState = {
  availableSeconds: number | null;
  usedSeconds: number;
  isOverloaded: boolean;
};

export function chapterTimeLoadState(
  chapter: Pick<WizardStoryboardChapter, "song" | "mood">,
  items: readonly { kind: MediaKind }[],
  packageId: PackageId,
  role?: ChapterPacingRole,
): ChapterTimeLoadState {
  const targetSecondsPerMedia = resolveTargetSecondsPerMedia(
    packageId,
    chapter.mood,
  );
  const durationSec = chapter.song?.durationSec;
  const availableSeconds =
    durationSec && durationSec > 0
      ? chapterAvailableSecondsForMedia(durationSec, role)
      : null;
  const usedSeconds = chapterMediaLoadSeconds(items, targetSecondsPerMedia);

  return {
    availableSeconds,
    usedSeconds,
    isOverloaded: availableSeconds !== null && usedSeconds > availableSeconds,
  };
}
