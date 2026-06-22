/** Immutable storage paths — long browser/CDN cache (1 year). */
export const STORAGE_CACHE_CONTROL_SEC = 31_536_000;

/** Signed URL lifetime — aligned with client media list cache below. */
export const SIGNED_URL_TTL_SEC = 3600;

/** Reuse hydrated media API responses within one browser session. */
export const PROJECT_MEDIA_CACHE_MAX_AGE_MS = 50 * 60 * 1000;

export const STORAGE_CACHE_CONTROL = String(STORAGE_CACHE_CONTROL_SEC);
