/**
 * Compile le graphe de stems audio (Layer × Provenance × Placement).
 * Remplace resolveChapterAudio — One Bed Law + stems sync.
 */

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  enforceOneBedLaw,
  selectOneBedStem,
  type BedCandidate,
} from "@/src/lib/creatomate/mixBus";
import { signStoragePathForCreatomate } from "@/src/lib/creatomate/resolveMediaAssets";
import { resolveStingrayMasterUrl } from "@/src/lib/creatomate/resolveStingrayMaster";
import {
  AUDIO_LAYER_DUCK_PRIORITY,
  type ResolvedAudioStem,
  type TimelineMediaClip,
} from "@/src/lib/creatomate/types";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

export type ChapterSpan = {
  chapterId: string;
  contentStartSec: number;
  contentDurationSec: number;
};

/**
 * Produit le graphe de stems :
 * - **bed** : une piste / chapitre (upload > stingray) — One Bed Law
 * - **sync** : audio embarqué des clips vidéo
 * - **ghost** / **foreground** : non émis au P0 (types prêts Phase 2)
 */
export async function resolveAudioStems(
  admin: SupabaseClient,
  params: {
    storyboard: WizardStoryboardState;
    chapterSpans: ChapterSpan[];
    clips: TimelineMediaClip[];
    allowStingrayMaster: boolean;
  },
): Promise<ResolvedAudioStem[]> {
  const spanById = new Map(
    params.chapterSpans.map((s) => [s.chapterId, s] as const),
  );

  const bedCandidates: BedCandidate[] = [];

  for (const chapter of params.storyboard.chapters) {
    const span = spanById.get(chapter.id);
    if (!span || span.contentDurationSec <= 0) continue;
    const song = chapter.song;
    if (!song) continue;

    if (song.source === "upload") {
      const url = await signStoragePathForCreatomate(admin, song.storagePath);
      if (!url) continue;
      bedCandidates.push({
        chapterId: chapter.id,
        provenance: "upload",
        url,
        timeSec: span.contentStartSec,
        durationSec: span.contentDurationSec,
        trimStartSec: 0,
      });
      continue;
    }

    if (song.source === "stingray") {
      if (!params.allowStingrayMaster) continue;
      const master = await resolveStingrayMasterUrl(song.trackId);
      if (!master.ok) continue;
      bedCandidates.push({
        chapterId: chapter.id,
        provenance: "stingray",
        url: master.url,
        timeSec: span.contentStartSec,
        durationSec: span.contentDurationSec,
        trimStartSec: 0,
      });
    }
  }

  // One Bed Law par chapitre (upload gagne si les deux étaient présents)
  const bedsByChapter = new Map<string, BedCandidate[]>();
  for (const c of bedCandidates) {
    const list = bedsByChapter.get(c.chapterId) ?? [];
    list.push(c);
    bedsByChapter.set(c.chapterId, list);
  }

  const bedStems: ResolvedAudioStem[] = [];
  for (const [, list] of bedsByChapter) {
    const bed = selectOneBedStem(list);
    if (bed) bedStems.push(bed);
  }

  const syncStems: ResolvedAudioStem[] = params.clips
    .filter((c) => c.kind === "video" && c.hasAudio)
    .map((clip) => ({
      id: `sync-${clip.mediaId}`,
      layer: "sync" as const,
      provenance: "embedded" as const,
      placement: "clip_locked" as const,
      url: clip.url,
      timeSec: clip.timeSec,
      durationSec: clip.durationSec,
      trimStartSec: clip.trimStartSec,
      chapterId: null,
      mediaId: clip.mediaId,
      duckPriority: AUDIO_LAYER_DUCK_PRIORITY.sync,
    }));

  // Phase 2 dormants : ghost / foreground volontairement absents ici.
  let stems = enforceOneBedLaw([...bedStems, ...syncStems]);

  /**
   * Craft / staging — si aucun bed (Stingray master absent, pas d’upload),
   * `CREATOMATE_CRAFT_BED_URL` pose un lit royalty_free film_global.
   * Jamais en prod sans intention ops (URL publique temporaire OK).
   */
  const craftBedUrl = process.env.CREATOMATE_CRAFT_BED_URL?.trim();
  const hasBed = stems.some((s) => s.layer === "bed");
  if (craftBedUrl && !hasBed && params.allowStingrayMaster) {
    const contentDurationSec = params.clips.reduce(
      (max, c) => Math.max(max, c.timeSec + c.durationSec),
      0,
    );
    if (contentDurationSec > 0 && /^https?:\/\//i.test(craftBedUrl)) {
      stems = enforceOneBedLaw([
        ...stems,
        {
          id: "craft-bed-global",
          layer: "bed",
          provenance: "royalty_free",
          placement: "film_global",
          url: craftBedUrl,
          timeSec: 0,
          durationSec: contentDurationSec,
          trimStartSec: 0,
          chapterId: null,
          mediaId: null,
          duckPriority: AUDIO_LAYER_DUCK_PRIORITY.bed,
        },
      ]);
    }
  }

  return stems;
}
