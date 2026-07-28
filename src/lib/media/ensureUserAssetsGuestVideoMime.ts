import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { SANCTUARY_GUEST_VIDEO_MIME_TYPES } from "@/src/lib/contribute/sanctuaryLimits";

const BUCKET = "user-assets";

/**
 * Étend l’allowlist bucket pour MediaRecorder vidéo (webm/mp4/quicktime).
 * Idempotent ; no-op si allowed_mime_types est null.
 */
export async function ensureUserAssetsAllowsGuestVideo(): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { data: bucket, error } = await admin.storage.getBucket(BUCKET);
  if (error || !bucket) {
    throw new Error(error?.message ?? "user_assets_bucket_missing");
  }

  const allowed = bucket.allowed_mime_types;
  if (allowed == null) return;

  const needed = Array.from(new Set<string>([...SANCTUARY_GUEST_VIDEO_MIME_TYPES]));
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
