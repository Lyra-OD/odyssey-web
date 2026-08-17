/** Canon : docs/SCANNER_COMPANION.md — Phase A. */

export const SCAN_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
export const SCAN_MAX_UPLOADS_PER_SESSION = 30;
export const SCAN_MAX_FILE_BYTES = 12 * 1024 * 1024;

/** JPEG/PNG/WebP (spec) + HEIC (galerie iPhone, sinon le coffre est cassé). */
export const SCAN_ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const SCAN_MEDIA_SOURCE = "scanner_companion";
export const SCAN_STORAGE_BUCKET = "user-assets";
