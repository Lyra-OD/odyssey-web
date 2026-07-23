import type { StingrayTrackApiPayload } from "@/src/lib/wizard/stingrayCatalog";
import { findCatalogTrack } from "@/src/lib/wizard/stingrayCatalog";
import { buildMusicPreviewProxyUrl } from "@/src/lib/music/stingrayTrackId";
import type { WizardStoryboardSong } from "@/src/lib/wizard/wizardState";

/**
 * Résout l'URL de lecture d'un extrait, quel que soit le champ renseigné par
 * l'API Stingray. Partagé entre le panneau de recherche musicale (Étape 4)
 * et le lecteur audio parent qui pilote l'élément `<audio>`.
 */
export function resolvePreviewUrl(track: StingrayTrackApiPayload): string {
  return (
    track.playbackUrl?.trim() ||
    track.previewUrl?.trim() ||
    track.streamUrl?.trim() ||
    ""
  );
}

/** Clé stable pour l'état play/pause (catalogue ou fichier perso). */
export function storyboardSongPreviewKey(song: WizardStoryboardSong): string {
  return song.source === "stingray"
    ? song.trackId
    : `upload:${song.storagePath}`;
}

/**
 * URL de préécoute pour une chanson déjà choisie.
 * - Stingray : proxy preview / catalogue
 * - Upload : signed URL via `GET /api/projects/{id}/music?path=…` (à résoudre async côté UI)
 */
export function resolveStingraySongPreviewUrl(
  song: Extract<WizardStoryboardSong, { source: "stingray" }>,
): string {
  const catalog = findCatalogTrack(song.trackId);
  if (catalog) {
    const fromCatalog = resolvePreviewUrl(catalog);
    if (fromCatalog) return fromCatalog;
  }
  return buildMusicPreviewProxyUrl(song.trackId);
}

export async function waitForAudioReady(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return;

  await new Promise<void>((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("audio_load_failed"));
    };
    const cleanup = () => {
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("error", onError);
    };
    audio.addEventListener("canplay", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });
  });
}
