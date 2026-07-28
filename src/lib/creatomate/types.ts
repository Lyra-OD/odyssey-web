/**
 * Types internes — plan de rendu Odyssey → Creatomate RenderScript.
 * Audio : Stem Graph (Layer × Provenance × Placement).
 */

import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";

export type CreatomatePixelSize = {
  width: number;
  height: number;
  label: "1080p" | "4K";
};

export type ResolvedMediaKind = "image" | "video";

export type ResolvedMediaAsset = {
  id: string;
  kind: ResolvedMediaKind;
  /** URL signée (TTL export — 4 h). */
  url: string;
  trimStartSec: number;
  durationSec: number;
  /** Focal 0–1 → Creatomate % alignment. */
  focalX: number;
  focalY: number;
  /** Vidéo avec piste audio → layer sync. */
  hasAudio: boolean;
};

/**
 * Bus de mix Odyssey — hiérarchie de ducking (haut → bas) :
 * sync > foreground > ghost > bed
 *
 * `ghost` / `foreground` : fondation Phase 2 (types dormants au P0).
 */
export type AudioLayer = "bed" | "ghost" | "foreground" | "sync";

export type AudioProvenance =
  | "stingray"
  | "upload"
  | "royalty_free"
  | "derived_ghost"
  | "embedded";

export type AudioPlacement =
  | "film_global"
  | "chapter_bed"
  | "clip_locked"
  | "free_spot"
  | "outro_sting";

/** Priorité numérique : plus haut = duck les layers inférieurs. */
export const AUDIO_LAYER_DUCK_PRIORITY: Record<AudioLayer, number> = {
  sync: 100,
  foreground: 80,
  ghost: 40,
  bed: 0,
};

/**
 * Stem audio résolu pour le compilateur Creatomate.
 * Ne vit pas dans wizard_state — produit du compile server-only.
 */
export type ResolvedAudioStem = {
  id: string;
  layer: AudioLayer;
  provenance: AudioProvenance;
  placement: AudioPlacement;
  url: string;
  /** Temps contenu (hors intro) sauf si film_global. */
  timeSec: number;
  durationSec: number;
  trimStartSec: number;
  /** Chapitre lié (bed / spans) — null si film_global. */
  chapterId: string | null;
  /** Média lié (sync clip_locked). */
  mediaId: string | null;
  duckPriority: number;
};

export type TimelineMediaClip = {
  mediaId: string;
  kind: ResolvedMediaKind;
  url: string;
  /** Temps absolu sur la timeline film (après intro). */
  timeSec: number;
  durationSec: number;
  trimStartSec: number;
  focalX: number;
  focalY: number;
  hasAudio: boolean;
};

export type DuckInterval = {
  startSec: number;
  endSec: number;
  /** Layer qui provoque le duck (sync | foreground…). */
  causedBy: AudioLayer;
};

export type RenderEssentials = {
  displayName: string;
  datesLine: string | null;
};

export type OdysseyRenderPlan = {
  jobId: string;
  webhookUrl: string;
  paidPackage: WizardBasePackage;
  resolution: CreatomatePixelSize;
  essentials: RenderEssentials;
  /** Clips média ordonnés (hors intro/outro). */
  clips: TimelineMediaClip[];
  /** Graphe audio résolu (bed + sync ; ghost/foreground dormants). */
  audioStems: ResolvedAudioStem[];
  /** Intervalles (temps contenu) où le bed doit être ducké. */
  duckIntervals: DuckInterval[];
};
