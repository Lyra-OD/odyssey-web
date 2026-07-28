/**
 * Résout l’audio par chapitre (upload signé ; Stingray master = hook futur).
 */

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { signStoragePathForCreatomate } from "@/src/lib/creatomate/resolveMediaAssets";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

export type ChapterAudioResolved = {
  chapterId: string;
  url: string;
  /** Durée contenu du chapitre (médias), pour trim musique. */
  contentDurationSec: number;
  contentStartSec: number;
};

/**
 * Pour chaque chapitre avec chanson upload → URL signée 4 h.
 * Stingray : pas d’URL master branchée ici (retourne null tant que le
 * provider master n’est pas câblé) — le film reste valide sans bed.
 */
export async function resolveChapterAudioTracks(
  admin: SupabaseClient,
  params: {
    storyboard: WizardStoryboardState;
    chapterSpans: Array<{
      chapterId: string;
      contentStartSec: number;
      contentDurationSec: number;
    }>;
    allowStingrayMaster: boolean;
  },
): Promise<ChapterAudioResolved[]> {
  const out: ChapterAudioResolved[] = [];
  const spanById = new Map(
    params.chapterSpans.map((s) => [s.chapterId, s] as const),
  );

  for (const chapter of params.storyboard.chapters) {
    const span = spanById.get(chapter.id);
    if (!span || span.contentDurationSec <= 0) continue;
    const song = chapter.song;
    if (!song) continue;

    if (song.source === "upload") {
      const url = await signStoragePathForCreatomate(admin, song.storagePath);
      if (!url) continue;
      out.push({
        chapterId: chapter.id,
        url,
        contentDurationSec: span.contentDurationSec,
        contentStartSec: span.contentStartSec,
      });
      continue;
    }

    if (song.source === "stingray" && params.allowStingrayMaster) {
      // Hook : brancher Stingray master URL (trackId) quand le provider
      // export-master sera disponible. Sans URL, on skip silencieusement.
      void song.trackId;
    }
  }

  return out;
}
