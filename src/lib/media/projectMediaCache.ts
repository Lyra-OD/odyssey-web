import type { HydratedMediaApiItem } from "@/src/lib/media/mediaTypes";
import { PROJECT_MEDIA_CACHE_MAX_AGE_MS } from "@/src/lib/media/storageEgressPolicy";

type CacheEntry = {
  items: HydratedMediaApiItem[];
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();

export function invalidateProjectMediaCache(projectId: string): void {
  cache.delete(projectId);
}

export async function fetchProjectMediaCached(
  projectId: string,
  options?: { force?: boolean },
): Promise<HydratedMediaApiItem[]> {
  const force = options?.force === true;
  const cached = cache.get(projectId);
  const now = Date.now();

  if (
    !force &&
    cached &&
    now - cached.fetchedAt < PROJECT_MEDIA_CACHE_MAX_AGE_MS
  ) {
    return cached.items;
  }

  const res = await fetch(`/api/projects/${projectId}/media`);
  const body = (await res.json().catch(() => null)) as
    | { items: HydratedMediaApiItem[] }
    | { error?: string }
    | null;

  if (!res.ok || !body || !("items" in body)) {
    throw new Error(
      body && "error" in body ? body.error : `HTTP ${res.status}`,
    );
  }

  cache.set(projectId, { items: body.items, fetchedAt: now });
  return body.items;
}
