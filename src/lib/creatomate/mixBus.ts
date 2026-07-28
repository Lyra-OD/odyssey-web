/**
 * Mix bus Odyssey — One Bed Law + compilation d’enveloppes de ducking.
 * Fonctions pures (testables sans Supabase / Creatomate).
 */

import { cinematicTheme } from "@/src/lib/creatomate/cinematicTheme";
import {
  AUDIO_LAYER_DUCK_PRIORITY,
  type AudioLayer,
  type AudioProvenance,
  type DuckInterval,
  type ResolvedAudioStem,
} from "@/src/lib/creatomate/types";

/** Provenances bed autorisées, par priorité décroissante (One Bed Law). */
export const BED_PROVENANCE_PRIORITY: readonly AudioProvenance[] = [
  "upload",
  "royalty_free",
  "stingray",
] as const;

export type BedCandidate = {
  chapterId: string;
  provenance: Extract<
    AudioProvenance,
    "upload" | "stingray" | "royalty_free"
  >;
  url: string;
  timeSec: number;
  durationSec: number;
  trimStartSec?: number;
};

/**
 * One Bed Law — au plus **un** bed par chapitre.
 * `upload` (famille) gagne toujours sur `royalty_free` / `stingray`.
 */
export function selectOneBedStem(
  candidates: BedCandidate[],
): ResolvedAudioStem | null {
  if (candidates.length === 0) return null;

  let winner: BedCandidate | null = null;
  let bestRank = Number.POSITIVE_INFINITY;

  for (const c of candidates) {
    const rank = BED_PROVENANCE_PRIORITY.indexOf(c.provenance);
    if (rank < 0) continue;
    if (rank < bestRank) {
      bestRank = rank;
      winner = c;
    }
  }

  if (!winner || winner.durationSec <= 0 || !winner.url.trim()) return null;

  return {
    id: `bed-${winner.chapterId}-${winner.provenance}`,
    layer: "bed",
    provenance: winner.provenance,
    placement: "chapter_bed",
    url: winner.url,
    timeSec: winner.timeSec,
    durationSec: winner.durationSec,
    trimStartSec: winner.trimStartSec ?? 0,
    chapterId: winner.chapterId,
    mediaId: null,
    duckPriority: AUDIO_LAYER_DUCK_PRIORITY.bed,
  };
}

/** Enforce One Bed Law sur une liste de stems (déduplique beds par chapitre). */
export function enforceOneBedLaw(
  stems: ResolvedAudioStem[],
): ResolvedAudioStem[] {
  const nonBed = stems.filter((s) => s.layer !== "bed");
  const beds = stems.filter((s) => s.layer === "bed");
  const byChapter = new Map<string, ResolvedAudioStem[]>();

  for (const bed of beds) {
    const key = bed.chapterId ?? "__global__";
    const list = byChapter.get(key) ?? [];
    list.push(bed);
    byChapter.set(key, list);
  }

  const keptBeds: ResolvedAudioStem[] = [];
  for (const [, list] of byChapter) {
    const candidates: BedCandidate[] = list.map((s) => ({
      chapterId: s.chapterId ?? "__global__",
      provenance: s.provenance as BedCandidate["provenance"],
      url: s.url,
      timeSec: s.timeSec,
      durationSec: s.durationSec,
      trimStartSec: s.trimStartSec,
    }));
    const one = selectOneBedStem(candidates);
    if (one) keptBeds.push(one);
  }

  return [...nonBed, ...keptBeds];
}

const DUCK_CAUSES: ReadonlySet<AudioLayer> = new Set(["sync", "foreground"]);

/**
 * Compile les intervalles où le **bed** doit baisser.
 * Causes P0 : `sync` (vidéos sonores). `foreground` prêt Phase 2.
 * Ghost ne duck pas le bed au P0 (policy Quiet Luxury : ghost sous photos).
 */
export function compileDuckEnvelopes(
  stems: ResolvedAudioStem[],
): DuckInterval[] {
  const raw: DuckInterval[] = [];

  for (const stem of stems) {
    if (!DUCK_CAUSES.has(stem.layer)) continue;
    if (stem.durationSec <= 0) continue;
    raw.push({
      startSec: stem.timeSec,
      endSec: stem.timeSec + stem.durationSec,
      causedBy: stem.layer,
    });
  }

  return mergeDuckIntervals(raw);
}

export function mergeDuckIntervals(intervals: DuckInterval[]): DuckInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.startSec - b.startSec);
  const out: DuckInterval[] = [{ ...sorted[0]! }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const last = out[out.length - 1]!;
    if (cur.startSec <= last.endSec + 0.05) {
      last.endSec = Math.max(last.endSec, cur.endSec);
      if (
        AUDIO_LAYER_DUCK_PRIORITY[cur.causedBy] >
        AUDIO_LAYER_DUCK_PRIORITY[last.causedBy]
      ) {
        last.causedBy = cur.causedBy;
      }
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

/** Volume bed selon cause dominante de l’intervalle. */
export function bedVolumeForDuckCause(causedBy: AudioLayer | null): string {
  const m = cinematicTheme.music;
  if (causedBy === "sync") return m.duckFromSync;
  if (causedBy === "foreground") return m.duckFromVoice;
  return m.bedVolume;
}

export function stemsByLayer(
  stems: ResolvedAudioStem[],
  layer: AudioLayer,
): ResolvedAudioStem[] {
  return stems.filter((s) => s.layer === layer);
}
