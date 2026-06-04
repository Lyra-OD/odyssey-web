import "server-only";

import type { StingrayTrackApiPayload } from "@/src/lib/wizard/stingrayCatalog";
import {
  buildMusicPreviewProxyUrl,
  encodeStingrayTrackId,
} from "@/src/lib/music/stingrayTrackId";
import {
  getStingrayConfig,
  isStingrayConfigured,
  type StingrayConfig,
} from "@/src/lib/music/stingrayConfig";
import { searchStingrayTracksForApi } from "@/src/lib/wizard/stingrayCatalog";

type StingrayChannel = {
  id: string;
  name?: string;
  description?: string;
  cover?: string;
};

type StingraySong = {
  id: string;
  title?: string;
  artistDisplay?: string;
  artists?: Array<{ name?: string }>;
  thumbnail?: string;
  albumTitle?: string;
};

type StingrayPlaylist = {
  id: string;
  channelId?: string;
  songs?: StingraySong[];
};

export class StingrayApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "StingrayApiError";
  }
}

function stingrayHeaders(config: StingrayConfig): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Language": config.language,
    "X-Device-Id": config.deviceId,
  };
  if (config.clientId) {
    headers["x-client-id"] = config.clientId;
  }
  if (config.bearerToken) {
    headers.Authorization = `Bearer ${config.bearerToken}`;
  }
  return headers;
}

async function stingrayFetch<T>(
  path: string,
  init: RequestInit & { searchParams?: Record<string, string> } = {},
): Promise<T> {
  const config = getStingrayConfig();
  const url = new URL(path, config.baseUrl);
  if (init.searchParams) {
    for (const [key, value] of Object.entries(init.searchParams)) {
      if (value !== "") url.searchParams.set(key, value);
    }
  }

  const { searchParams: _ignored, ...fetchInit } = init;
  const response = await fetch(url.toString(), {
    ...fetchInit,
    headers: {
      ...stingrayHeaders(config),
      ...(fetchInit.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let details = "";
    try {
      const body = (await response.json()) as {
        message?: string;
        code?: string;
      };
      details = body.message ?? body.code ?? "";
    } catch {
      details = await response.text().catch(() => "");
    }
    throw new StingrayApiError(
      details || `Stingray HTTP ${response.status}`,
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new StingrayApiError(
      `Réponse Stingray inattendue (${contentType || "sans type"})`,
      502,
    );
  }

  return (await response.json()) as T;
}

function songArtist(song: StingraySong): string {
  if (song.artistDisplay?.trim()) return song.artistDisplay.trim();
  const fromArtists = song.artists?.map((a) => a.name?.trim()).find(Boolean);
  return fromArtists ?? "Artiste inconnu";
}

function songCover(song: StingraySong, channel?: StingrayChannel): string {
  if (song.thumbnail?.trim()) {
    return song.thumbnail.replace("%W", "120").replace("%H", "120");
  }
  if (channel?.cover?.trim()) {
    return channel.cover.replace("%W", "120").replace("%H", "120");
  }
  return "";
}

function matchesQuery(song: StingraySong, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack =
    `${song.title ?? ""} ${songArtist(song)} ${song.albumTitle ?? ""}`.toLowerCase();
  return q.split(/\s+/).filter(Boolean).every((token) => haystack.includes(token));
}

function mapSongToTrack(
  song: StingraySong,
  playlistId: string,
  channel?: StingrayChannel,
): StingrayTrackApiPayload {
  const trackId = encodeStingrayTrackId(playlistId, song.id);
  const previewUrl = buildMusicPreviewProxyUrl(trackId);
  return {
    id: trackId,
    title: song.title?.trim() || "Sans titre",
    artist: songArtist(song),
    duration: "",
    coverUrl: songCover(song, channel),
    previewUrl,
    streamUrl: previewUrl,
    playbackUrl: previewUrl,
  };
}

async function searchChannels(query: string, pageSize: number): Promise<StingrayChannel[]> {
  const tokens = query.trim();
  const byId = new Map<string, StingrayChannel>();

  const run = async (params: Record<string, string>) => {
    const channels = await stingrayFetch<StingrayChannel[]>("/api/v1/channel", {
      searchParams: params,
    });
    for (const channel of channels ?? []) {
      if (channel?.id) byId.set(channel.id, channel);
    }
  };

  if (!tokens) {
    await run({
      page_size: String(Math.min(100, Math.max(1, pageSize))),
      page_number: "0",
    });
    return [...byId.values()];
  }

  await Promise.all([
    run({
      artist_name: tokens,
      page_size: String(Math.min(100, Math.max(1, pageSize))),
      page_number: "0",
    }),
    run({
      channel_name: tokens,
      page_size: String(Math.min(100, Math.max(1, pageSize))),
      page_number: "0",
    }),
  ]);

  return [...byId.values()];
}

async function createChannelPlaylist(
  channelId: string,
  size: number,
): Promise<StingrayPlaylist> {
  return stingrayFetch<StingrayPlaylist>("/api/v1/playlist", {
    method: "POST",
    body: JSON.stringify({
      channel_id: channelId,
      quality: "high",
      size: Math.min(10, Math.max(1, size)),
    }),
  });
}

/**
 * Recherche licenciée Stingray : channels → playlist → chansons mappées.
 */
export async function searchStingrayMusicTracks(
  query: string,
  limit = 12,
): Promise<StingrayTrackApiPayload[]> {
  const q = query.trim();
  const channels = q
    ? await searchChannels(q, Math.min(5, limit))
    : await searchChannels("", 3);

  const tracks: StingrayTrackApiPayload[] = [];
  const seen = new Set<string>();

  for (const channel of channels) {
    if (tracks.length >= limit) break;
    try {
      const playlist = await createChannelPlaylist(
        channel.id,
        Math.min(10, limit - tracks.length),
      );
      if (!playlist?.id) continue;

      for (const song of playlist.songs ?? []) {
        if (!song?.id || tracks.length >= limit) break;
        if (q && !matchesQuery(song, q)) continue;

        const track = mapSongToTrack(song, playlist.id, channel);
        if (seen.has(track.id)) continue;
        seen.add(track.id);
        tracks.push(track);
      }
    } catch (error) {
      console.error(
        "[StingrayClient] Échec playlist pour channel",
        channel.id,
        error,
      );
    }
  }

  return tracks;
}

/** Flux audio binaire Stingray pour une piste (proxy vers le navigateur). */
export async function fetchStingrayTrackStream(
  playlistId: string,
  songId: string,
): Promise<Response> {
  const config = getStingrayConfig();
  const url = new URL(
    `/api/v1/playlist/${encodeURIComponent(playlistId)}/track/${encodeURIComponent(songId)}`,
    config.baseUrl,
  );

  const response = await fetch(url.toString(), {
    headers: {
      ...stingrayHeaders(config),
      Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
    },
    cache: "no-store",
  });

  if (!response.ok || !response.body) {
    throw new StingrayApiError(
      `Preview Stingray indisponible (HTTP ${response.status})`,
      response.status,
    );
  }

  return response;
}

export async function searchMusicCatalog(
  query: string,
  limit = 12,
): Promise<{ tracks: StingrayTrackApiPayload[]; source: "stingray" | "mock" }> {
  const config = getStingrayConfig();

  if (!isStingrayConfigured(config)) {
    if (config.useMock) {
      return {
        tracks: searchStingrayTracksForApi(query, limit),
        source: "mock",
      };
    }
    throw new StingrayApiError(
      "Service musical non configuré (STINGRAY_CLIENT_ID manquant).",
      503,
      "service_unavailable",
    );
  }

  try {
    const tracks = await searchStingrayMusicTracks(query, limit);
    return { tracks, source: "stingray" };
  } catch (error) {
    if (config.useMock) {
      console.error("[StingrayClient] API indisponible — fallback mock:", error);
      return {
        tracks: searchStingrayTracksForApi(query, limit),
        source: "mock",
      };
    }
    throw error;
  }
}
