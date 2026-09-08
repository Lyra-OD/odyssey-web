import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { SANCTUARY_GUEST_MESSAGE_MIME_TYPES } from "@/src/lib/contribute/sanctuaryLimits";

const BUCKET = "user-assets";

/**
 * Étend l’allowlist bucket pour le dépôt de mot texte invité (`text/plain`).
 * Idempotent ; no-op si allowed_mime_types est null.
 *
 * Root cause (8 sept 2026) : le bucket `user-assets` a été créé avec une
 * allowlist image/vidéo seulement — `text/plain` n'y a jamais été ajouté,
 * contrairement à l'audio/vidéo invité qui ont déjà ce garde-fou. Résultat :
 * 100 % des dépôts de mot texte échouaient en 400 `storage_upload_failed`.
 */
export async function ensureUserAssetsAllowsGuestMessage(): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { data: bucket, error } = await admin.storage.getBucket(BUCKET);
  if (error || !bucket) {
    throw new Error(error?.message ?? "user_assets_bucket_missing");
  }

  const allowed = bucket.allowed_mime_types;
  if (allowed == null) return;

  const needed = Array.from(new Set<string>([...SANCTUARY_GUEST_MESSAGE_MIME_TYPES]));
  const missing = needed.filter((mime) => !allowed.includes(mime));
  if (missing.length === 0) return;

  const { error: updateError } = await admin.storage.updateBucket(BUCKET, {
    public: bucket.public,
    allowedMimeTypes: [...allowed, ...missing],
  });
  if (updateError) {
    throw new Error(updateError.message);
  }
}
