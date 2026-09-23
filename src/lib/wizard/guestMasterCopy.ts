/**
 * C12 — Copie personnelle invité (licence même Master MP4 · 0 Creatomate).
 * Canon : docs/product/SOUVENIR_STREAM_MASTER_49.md · FREEMIUM_V1_PIVOT §2.
 */

export const GUEST_MASTER_COPY_SKU = "guestMasterCopy" as const;

/** 15 $ USD — grille cercle. */
export const GUEST_MASTER_COPY_CENTS = 1500;

export function guestMasterCopyLabel(locale: "fr" | "en"): string {
  return locale === "en"
    ? "Personal master copy · $15"
    : "Copie personnelle Master · 15 $";
}
