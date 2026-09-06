import type { HydratedMediaApiItem } from "@/src/lib/media/mediaTypes";
import { parseApiJson } from "@/src/lib/http/parseApiJson";
import { PROJECT_MEDIA_CACHE_MAX_AGE_MS } from "@/src/lib/media/storageEgressPolicy";

type CacheEntry = {
  items: HydratedMediaApiItem[];
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();
/** In-flight fetches — dedupe concurrent callers (Strict Mode / multi-consumers). */
const inflight = new Map<string, Promise<HydratedMediaApiItem[]>>();

export function invalidateProjectMediaCache(projectId: string): void {
  cache.delete(projectId);
  inflight.delete(projectId);
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

  // Dédoublonnage systématique — y compris en `force` (le poll média
  // l'utilise) : sans ça, deux appels qui se chevauchent (poll + action
  // manuelle) partent chacun leur propre requête authentifiée, ce qui
  // multiplie les `getUser()` concurrents pile au moment où l'access
  // token expire (voir src/lib/supabase/authRefreshLock.ts).
  const pending = inflight.get(projectId);
  if (pending) return pending;

  const request = (async () => {
    const res = await fetch(`/api/projects/${projectId}/media`);
    const body = await parseApiJson<{
      items?: HydratedMediaApiItem[];
      error?: string;
    }>(res);

    if (!res.ok || !body.items) {
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }

    cache.set(projectId, { items: body.items, fetchedAt: Date.now() });
    return body.items;
  })();

  inflight.set(projectId, request);

  try {
    return await request;
  } finally {
    if (inflight.get(projectId) === request) {
      inflight.delete(projectId);
    }
  }
}
