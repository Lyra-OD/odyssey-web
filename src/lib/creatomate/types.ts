/**
 * Types internes — plan de rendu Odyssey → Creatomate RenderScript.
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
  /** Vidéo avec piste audio → déclenche ducking. */
  hasAudio: boolean;
};

export type ResolvedChapterAudio = {
  chapterId: string;
  url: string;
  /** Décalage dans le fichier source (upload) si besoin. */
  trimStartSec: number;
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
  /** Intervalles absolus où la musique doit être duckée. */
  duckIntervals: DuckInterval[];
  /** Une piste musique par chapitre (URL signée ou master), time = début chapitre médias. */
  chapterAudio: Array<{
    chapterId: string;
    url: string;
    timeSec: number;
    durationSec: number;
  }>;
};
