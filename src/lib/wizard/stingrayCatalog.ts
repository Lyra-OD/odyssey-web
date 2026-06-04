/** Catalogue musique licencié — mock dev uniquement si STINGRAY_USE_MOCK=true. */

import { buildMusicPreviewProxyUrl } from "@/src/lib/music/stingrayTrackId";

export type StingrayCatalogTrack = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  coverUrl: string;
  /** URL de preview Stingray (champ `preview_url` côté API). */
  previewUrl: string;
  /** @deprecated Legacy — conservé pour migration catalogTrackId */
  subtitle?: string;
  moodTag?: string;
};

export type StingrayTrackApiPayload = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  coverUrl: string;
  previewUrl: string;
  streamUrl: string;
  /** URL same-origin pour le lecteur HTML (`/api/music/preview`). */
  playbackUrl: string;
};

export type WizardSelectedTrack = {
  title: string;
  artist: string;
  trackId: string;
  coverUrl: string;
  previewUrl?: string;
};

/** Clés persistées : acte1 = Étincelle, acte2 = Épopée, acte3 = Héritage. */
export type WizardActTrackKey = "acte1" | "acte2" | "acte3";

export const WIZARD_ACT_TRACK_KEYS: WizardActTrackKey[] = [
  "acte1",
  "acte2",
  "acte3",
];

export type WizardActTracks = Partial<
  Record<WizardActTrackKey, WizardSelectedTrack>
>;

export const STINGRAY_CATALOG_PROVIDER = "stingray";

const COVER = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/120/120`;

/**
 * Source upstream vérifiable (SoundHelix — une URL distincte par piste).
 * En production : remplacer par `preview_url` renvoyé par l’API Stingray.
 */
const PREVIEW = (n: number) =>
  `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;

const STINGRAY_PREVIEW_URLS: Record<string, string> = {
  "stingray-aznavour-la-mamma": PREVIEW(1),
  "stingray-aznavour-hier-encore": PREVIEW(2),
  "stingray-piaf-non-je-ne-regrette": PREVIEW(3),
  "stingray-cinematic-01": PREVIEW(4),
  "stingray-melancholic-02": PREVIEW(5),
  "stingray-soft-03": PREVIEW(6),
  "stingray-bright-04": PREVIEW(7),
  "stingray-nat-king-unforgettable": PREVIEW(8),
  "stingray-sinatra-my-way": PREVIEW(9),
  "stingray-adele-make-you-feel": PREVIEW(10),
  "stingray-enya-only-time": PREVIEW(11),
  "stingray-ludovico-nuvole": PREVIEW(12),
};

const PREVIEW_URL_PATTERN = /^https?:\/\/.+\.(mp3|aac|m4a|ogg)(\?.*)?$/i;

function previewUrlForTrack(trackId: string): string {
  return STINGRAY_PREVIEW_URLS[trackId] ?? "";
}

function assertValidCatalogPreviewUrl(track: StingrayCatalogTrack): void {
  const url = track.previewUrl?.trim() ?? "";
  if (!url || !PREVIEW_URL_PATTERN.test(url)) {
    console.error(
      `[StingrayCatalog] URL audio invalide ou manquante pour "${track.title}" (${track.id}):`,
      url || "(vide)",
    );
  }
}

export const STINGRAY_CATALOG_TRACKS: StingrayCatalogTrack[] = [
  {
    id: "stingray-aznavour-la-mamma",
    title: "La Mamma",
    artist: "Charles Aznavour",
    duration: "3:42",
    coverUrl: COVER("aznavour-la-mamma"),
    previewUrl: previewUrlForTrack("stingray-aznavour-la-mamma"),
    moodTag: "melancholic",
  },
  {
    id: "stingray-aznavour-hier-encore",
    title: "Hier encore",
    artist: "Charles Aznavour",
    duration: "3:08",
    coverUrl: COVER("aznavour-hier"),
    previewUrl: previewUrlForTrack("stingray-aznavour-hier-encore"),
    moodTag: "melancholic",
  },
  {
    id: "stingray-piaf-non-je-ne-regrette",
    title: "Non, je ne regrette rien",
    artist: "Édith Piaf",
    duration: "2:22",
    coverUrl: COVER("piaf-non"),
    previewUrl: previewUrlForTrack("stingray-piaf-non-je-ne-regrette"),
    moodTag: "cinematic",
  },
  {
    id: "stingray-cinematic-01",
    title: "Horizon de mémoire",
    artist: "Orchestre Cinématographique",
    duration: "3:12",
    coverUrl: COVER("horizon-memoire"),
    previewUrl: previewUrlForTrack("stingray-cinematic-01"),
    subtitle: "Orchestre cinématographique · Creatone",
    moodTag: "cinematic",
  },
  {
    id: "stingray-melancholic-02",
    title: "Veille silencieuse",
    artist: "Piano & Cordes",
    duration: "2:48",
    coverUrl: COVER("veille-silencieuse"),
    previewUrl: previewUrlForTrack("stingray-melancholic-02"),
    subtitle: "Piano & cordes · Stingray Music",
    moodTag: "melancholic",
  },
  {
    id: "stingray-soft-03",
    title: "Lueur intime",
    artist: "Ambiance Douce",
    duration: "3:34",
    coverUrl: COVER("lueur-intime"),
    previewUrl: previewUrlForTrack("stingray-soft-03"),
    subtitle: "Ambiance douce · Creatone",
    moodTag: "soft",
  },
  {
    id: "stingray-bright-04",
    title: "Éclat d’espoir",
    artist: "Cordes Lumineuses",
    duration: "2:56",
    coverUrl: COVER("eclat-espoir"),
    previewUrl: previewUrlForTrack("stingray-bright-04"),
    subtitle: "Cordes lumineuses · Stingray Music",
    moodTag: "bright",
  },
  {
    id: "stingray-nat-king-unforgettable",
    title: "Unforgettable",
    artist: "Nat King Cole",
    duration: "3:28",
    coverUrl: COVER("nat-unforgettable"),
    previewUrl: previewUrlForTrack("stingray-nat-king-unforgettable"),
    moodTag: "soft",
  },
  {
    id: "stingray-sinatra-my-way",
    title: "My Way",
    artist: "Frank Sinatra",
    duration: "4:35",
    coverUrl: COVER("sinatra-my-way"),
    previewUrl: previewUrlForTrack("stingray-sinatra-my-way"),
    moodTag: "cinematic",
  },
  {
    id: "stingray-adele-make-you-feel",
    title: "Make You Feel My Love",
    artist: "Adele",
    duration: "3:32",
    coverUrl: COVER("adele-feel"),
    previewUrl: previewUrlForTrack("stingray-adele-make-you-feel"),
    moodTag: "melancholic",
  },
  {
    id: "stingray-enya-only-time",
    title: "Only Time",
    artist: "Enya",
    duration: "3:38",
    coverUrl: COVER("enya-time"),
    previewUrl: previewUrlForTrack("stingray-enya-only-time"),
    moodTag: "soft",
  },
  {
    id: "stingray-ludovico-nuvole",
    title: "Nuvole bianche",
    artist: "Ludovico Einaudi",
    duration: "5:57",
    coverUrl: COVER("einaudi-nuvole"),
    previewUrl: previewUrlForTrack("stingray-ludovico-nuvole"),
    moodTag: "classical",
  },
];

if (typeof console !== "undefined") {
  for (const track of STINGRAY_CATALOG_TRACKS) {
    assertValidCatalogPreviewUrl(track);
  }
}

export function resolveStingrayStreamUrl(trackId: string): string | null {
  const track = findCatalogTrack(trackId);
  return track?.previewUrl ?? null;
}

/** URL same-origin servie par `/api/music/preview` — à utiliser dans le lecteur HTML. */
export function getTrackPreviewPlaybackUrl(trackId: string): string {
  return buildMusicPreviewProxyUrl(trackId);
}

export function serializeStingrayTrackForApi(
  track: StingrayCatalogTrack,
): StingrayTrackApiPayload {
  const previewUrl = track.previewUrl?.trim() ?? "";
  if (!previewUrl) {
    console.error(
      `[StingrayCatalog] previewUrl manquant lors de la sérialisation API pour "${track.title}" (${track.id})`,
    );
  }
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    duration: track.duration,
    coverUrl: track.coverUrl,
    previewUrl,
    streamUrl: previewUrl,
    playbackUrl: getTrackPreviewPlaybackUrl(track.id),
  };
}

export function emptyActTracks(): WizardActTracks {
  return {};
}

export function hasAnyActTrack(tracks: WizardActTracks): boolean {
  return WIZARD_ACT_TRACK_KEYS.some((key) => Boolean(tracks[key]?.trackId));
}

export function catalogTrackToSelected(
  track: StingrayCatalogTrack | StingrayTrackApiPayload,
): WizardSelectedTrack {
  const previewUrl =
    track.previewUrl?.trim() || buildMusicPreviewProxyUrl(track.id);
  return {
    title: track.title,
    artist: track.artist,
    trackId: track.id,
    coverUrl: track.coverUrl,
    previewUrl,
  };
}

export function findCatalogTrack(
  trackId: string,
): StingrayCatalogTrack | undefined {
  return STINGRAY_CATALOG_TRACKS.find((track) => track.id === trackId);
}

export function resolveTrackPreviewUrl(
  trackId: string,
  fallbackPreviewUrl?: string,
): string | null {
  if (fallbackPreviewUrl?.trim()) return fallbackPreviewUrl.trim();
  return resolveStingrayStreamUrl(trackId);
}

/** Recherche locale — remplacer par appel API Stingray en production. */
export function searchStingrayTracks(
  query: string,
  limit = 12,
): StingrayCatalogTrack[] {
  const q = query.trim().toLowerCase();
  const pool = q
    ? STINGRAY_CATALOG_TRACKS.filter((track) => {
        const tokens = q.split(/\s+/).filter(Boolean);
        const haystack =
          `${track.title} ${track.artist} ${track.subtitle ?? ""}`.toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      })
    : STINGRAY_CATALOG_TRACKS.slice(0, 8);

  return pool.slice(0, limit);
}

export function searchStingrayTracksForApi(
  query: string,
  limit = 12,
): StingrayTrackApiPayload[] {
  return searchStingrayTracks(query, limit).map(serializeStingrayTrackForApi);
}
