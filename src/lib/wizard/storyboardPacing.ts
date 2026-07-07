/**
 * Moteur de pacing temporel (ticket S4 du plan STORYBOARD_REFACTOR).
 *
 * Fonctions pures, sans dépendance React. Règles produit validées :
 *
 * 1. Rythme photo strict : `targetSecondsPerMedia` (7s) par photo, uniforme
 *    pour tous les forfaits.
 * 2. Vidéos : non soumises au rythme photo. Elles sont tronquées (trim) à
 *    `VIDEO_TRIM_DURATION_SEC` (10s) — c'est cette durée fixe, et non la
 *    durée du fichier source, qui pèse dans le calcul de charge d'un bac.
 * 3. Marges de respiration : chaque chapitre réserve `CHAPTER_INTRO_MARGIN_SEC`
 *    (5s) en intro et `CHAPTER_OUTRO_MARGIN_SEC` (5s) en outro, exclues du
 *    temps disponible pour les médias :
 *      temps_disponible = durationSec - (intro + outro)
 *
 * `durationSec` peut être inconnu (chanson pas encore choisie, ou upload
 * personnel sans métadonnée) : dans ce cas la capacité est `null` et l'UI
 * doit afficher un état "à déterminer" plutôt qu'un chiffre erroné.
 *
 * Pipeline de rendu (Creatomate) — note d'implémentation future : quel que
 * soit le mix photo/vidéo retenu ici, le rendu final devra appliquer un LUT
 * "Odyssey" unifié à tous les médias pour garantir une cohérence
 * colorimétrique cross-device (photo scannée, vidéo VHS, smartphone récent…).
 */

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

/** Marge de respiration réservée en début de chapitre (avant le premier média). */
export const CHAPTER_INTRO_MARGIN_SEC = 5;
/** Marge de respiration réservée en fin de chapitre (après le dernier média). */
export const CHAPTER_OUTRO_MARGIN_SEC = 5;
/** Marge totale exclue du temps disponible pour les médias d'un chapitre. */
export const CHAPTER_MARGIN_SEC =
  CHAPTER_INTRO_MARGIN_SEC + CHAPTER_OUTRO_MARGIN_SEC;

/**
 * Durée minimale de piste conseillée côté UX (voir bandeau éducatif Étape 4) —
 * en-deçà, le temps disponible pour les médias devient trop contraint pour un
 * montage confortable.
 */
export const RECOMMENDED_MIN_TRACK_DURATION_SEC = 3 * 60;

/**
 * Durée moyenne supposée d'une chanson tant qu'aucun titre réel n'est
 * choisi (milieu de la fourchette 3-4 min recommandée côté UX) — sert
 * uniquement à estimer la durée totale du film pour le résumé narratif de
 * l'Étape 4, jamais pour un calcul de capacité par chapitre (qui reste
 * `null` tant que `durationSec` est inconnu, voir `chapterRecommendedCapacity`).
 */
export const AVERAGE_ASSUMED_TRACK_DURATION_SEC = 3.5 * 60;

export type MediaKind = "image" | "video";

/**
 * Pondération de pacing par mood (S4 — structure prête, valeurs neutres).
 * Phase future : différencier le rythme par intention narrative (ex.
 * "energetic" → cadence plus rapide que 7s/photo). En attente de validation
 * produit des coefficients cible, toutes les pondérations valent 1 afin de
 * ne pas modifier silencieusement le comportement actuel.
 */
const MOOD_PACING_MULTIPLIER: Record<WizardStoryboardChapterMood, number> = {
  contemplative: 1,
  energetic: 1,
  nostalgic: 1,
};

/** Cible de rythme (secondes/photo) pour un forfait, éventuellement pondérée par mood. */
export function resolveTargetSecondsPerMedia(
  packageId: PackageId,
  mood?: WizardStoryboardChapterMood,
): number {
  const base = packageTargetSecondsPerMedia(packageId);
  const multiplier = mood ? MOOD_PACING_MULTIPLIER[mood] : 1;
  return base * multiplier;
}

/** Coût temporel d'un média dans le calcul de charge d'un chapitre. */
export function mediaCostSeconds(
  kind: MediaKind,
  targetSecondsPerMedia: number,
): number {
  return kind === "video" ? VIDEO_TRIM_DURATION_SEC : targetSecondsPerMedia;
}

/** Somme du coût temporel d'une liste de médias (mix photo/vidéo). */
export function chapterMediaLoadSeconds(
  items: readonly { kind: MediaKind }[],
  targetSecondsPerMedia: number,
): number {
  return items.reduce(
    (sum, item) => sum + mediaCostSeconds(item.kind, targetSecondsPerMedia),
    0,
  );
}

/** Temps réellement disponible pour des médias, marges intro/outro déduites. */
export function chapterAvailableSecondsForMedia(
  durationSec: number | null | undefined,
): number {
  if (!durationSec || durationSec <= 0) return 0;
  return Math.max(0, durationSec - CHAPTER_MARGIN_SEC);
}

/**
 * Capacité recommandée d'un chapitre, exprimée en équivalent-photos
 * (hypothèse "tout photo" — la vraie charge en Étape 5 dépendra du mix
 * réel photo/vidéo, voir `chapterMediaLoadSeconds`).
 * `null` = durée de chanson inconnue. `0` = chanson trop courte pour
 * accueillir un média après les marges intro/outro.
 */
export function chapterRecommendedCapacity(
  durationSec: number | null | undefined,
  targetSecondsPerMedia: number,
): number | null {
  if (!durationSec || durationSec <= 0) return null;
  if (!targetSecondsPerMedia || targetSecondsPerMedia <= 0) return null;
  const available = chapterAvailableSecondsForMedia(durationSec);
  if (available <= 0) return 0;
  return Math.floor(available / targetSecondsPerMedia);
}

export type ChapterPacingState = {
  /** `null` si la durée de la chanson est inconnue. */
  capacity: number | null;
  assignedCount: number;
  isOverloaded: boolean;
};

/**
 * Vue simplifiée "nombre de médias vs capacité équivalent-photos" — utilisée
 * Étape 4 où seul le nombre de bacs importe encore (pas de médias assignés).
 * Pour un calcul de charge réel mixte photo/vidéo (Étape 5), voir
 * `chapterTimeLoadState`.
 */
export function chapterPacingState(
  chapter: Pick<WizardStoryboardChapter, "mediaIds" | "song" | "mood">,
  packageId: PackageId,
): ChapterPacingState {
  const targetSecondsPerMedia = resolveTargetSecondsPerMedia(
    packageId,
    chapter.mood,
  );
  const capacity = chapterRecommendedCapacity(
    chapter.song?.durationSec,
    targetSecondsPerMedia,
  );
  const assignedCount = chapter.mediaIds.length;

  return {
    capacity,
    assignedCount,
    isOverloaded: capacity !== null && assignedCount > capacity,
  };
}

/**
 * Estimation de la durée totale du film (secondes) à partir des chapitres
 * pré-générés — chanson réelle si choisie, sinon `AVERAGE_ASSUMED_TRACK_DURATION_SEC`.
 * Utilisée pour le résumé narratif de l'Étape 4 ; volontairement optimiste
 * tant que l'utilisateur n'a pas encore choisi toutes ses chansons.
 */
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
  /** `null` si la durée de la chanson est inconnue. */
  availableSeconds: number | null;
  usedSeconds: number;
  isOverloaded: boolean;
};

/**
 * Charge temporelle réelle d'un chapitre (mix photo/vidéo) vs temps
 * disponible après marges intro/outro — moteur prêt pour l'Étape 5
 * (bacs médias). Le dépassement reste un warning non bloquant (bandeau
 * ambre), jamais un blocage de navigation.
 */
export function chapterTimeLoadState(
  chapter: Pick<WizardStoryboardChapter, "song" | "mood">,
  items: readonly { kind: MediaKind }[],
  packageId: PackageId,
): ChapterTimeLoadState {
  const targetSecondsPerMedia = resolveTargetSecondsPerMedia(
    packageId,
    chapter.mood,
  );
  const durationSec = chapter.song?.durationSec;
  const availableSeconds =
    durationSec && durationSec > 0
      ? chapterAvailableSecondsForMedia(durationSec)
      : null;
  const usedSeconds = chapterMediaLoadSeconds(items, targetSecondsPerMedia);

  return {
    availableSeconds,
    usedSeconds,
    isOverloaded: availableSeconds !== null && usedSeconds > availableSeconds,
  };
}