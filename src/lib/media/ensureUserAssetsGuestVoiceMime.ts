import { getSupabaseAdminClient } from "@/utils/supabase/admin";
import { SANCTUARY_GUEST_VOICE_MIME_TYPES } from "@/src/lib/contribute/sanctuaryLimits";
import { PERSONAL_AUDIO_MIME_TYPES } from "@/src/lib/media/ensureUserAssetsAudioMime";

const BUCKET = "user-assets";

/**
 * Étend l’allowlist bucket pour MediaRecorder (webm/mp4/ogg) + MP3/WAV.
 * Idempotent ; no-op si allowed_mime_types est null.
 */
export async function ensureUserAssetsAllowsGuestVoiceAudio(): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { data: bucket, error } = await admin.storage.getBucket(BUCKET);
  if (error || !bucket) {
    throw new Error(error?.message ?? "user_assets_bucket_missing");
  }

  const allowed = bucket.allowed_mime_types;
  if (allowed == null) return;

  const needed = Array.from(
    new Set<string>([...PERSONAL_AUDIO_MIME_TYPES, ...SANCTUARY_GUEST_VOICE_MIME_TYPES]),
  );
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
