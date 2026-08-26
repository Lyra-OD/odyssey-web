/**
 * Mode démo VP — hacks egress temporaires (poll médias off, pas de fallback full-res).
 * Activer : `NEXT_PUBLIC_DEMO_MODE=true` dans `.env.local` (jamais en prod par défaut).
 */
export const IS_DEMO_MODE =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/** Poll Coffre wizard étape 3 — 0 = off (démo), 5000 = sync scanner compagnon. */
export const WIZARD_MEDIA_POLL_INTERVAL_MS = IS_DEMO_MODE ? 0 : 5000;
