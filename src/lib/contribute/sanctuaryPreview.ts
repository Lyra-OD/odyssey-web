import {
  listActiveGuestSupportPacks,
  guestSupportPackLabel,
} from "@/src/lib/wizard/guestSupportPacks";

/**
 * Tokens fictifs pour QA visuelle du Sanctuaire (dev only).
 * Ex. http://localhost:3000/fr/contribute/test-visuel
 */
const PREVIEW_TOKENS = new Set(["test-visuel", "preview"]);

export function isSanctuaryVisualPreview(token: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return PREVIEW_TOKENS.has(token.trim().toLowerCase());
}

export const SANCTUARY_PREVIEW_TRIBUTE = {
  firstName: "Margaret",
  lastName: "Whitfield",
} as const;

/** Packs pour aperçu dev — même forme que GET /api/contribute/[token]. */
export function sanctuaryPreviewPacks(locale: "fr" | "en") {
  return listActiveGuestSupportPacks().map((pack) => ({
    key: pack.key,
    label: guestSupportPackLabel(pack, locale),
    priceCents: pack.priceCents,
    secondary: pack.secondary === true,
    amountMinCents: pack.amountMinCents ?? null,
    amountMaxCents: pack.amountMaxCents ?? null,
    amountSuggestedCents: pack.amountSuggestedCents ?? null,
  }));
}
