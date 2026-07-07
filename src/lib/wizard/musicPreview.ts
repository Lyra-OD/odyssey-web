import type { StingrayTrackApiPayload } from "@/src/lib/wizard/stingrayCatalog";

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
