import { getSupabaseAdminClient } from "@/utils/supabase/admin";

/** MIME audio acceptés pour la musique perso (MP3 / WAV). */
export const PERSONAL_AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/x-mpeg",
] as const;

const BUCKET = "user-assets";

/**
 * Le bucket `user-assets` a souvent été créé avec une allowlist image/vidéo
 * seulement — d'où l'erreur Storage « mime type audio/mpeg is not supported ».
 * Étend l'allowlist (idempotent) si elle est restreinte ; no-op si `null` (tout autorisé).
 */
export async function ensureUserAssetsAllowsPersonalAudio(): Promise<void> {
  const admin = getSupabaseAdminClient();
  const { data: bucket, error } = await admin.storage.getBucket(BUCKET);
  if (error || !bucket) {
    throw new Error(error?.message ?? "user_assets_bucket_missing");
  }

  const allowed = bucket.allowed_mime_types;
  if (allowed == null) return;

  const missing = PERSONAL_AUDIO_MIME_TYPES.filter(
    (mime) => !allowed.includes(mime),
  );
  if (missing.length === 0) return;

  const { error: updateError } = await admin.storage.updateBucket(BUCKET, {
    allowedMimeTypes: [...allowed, ...missing],
  });
  if (updateError) {
    throw new Error(updateError.message);
  }
}
