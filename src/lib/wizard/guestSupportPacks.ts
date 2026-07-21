/**
 * Catalogue Support Packs invités (Cascade V-Final — Boucle Virale).
 *
 * Positionnement Quiet Luxury, panier cible ~50 $. Prix figés (CEO 21/07/2026).
 * Les prix sont inline (price_data Stripe), pas dans billing_catalog — cohérent
 * avec /api/checkout famille.
 *
 * Canon : docs/IMPLEMENTATION_CASCADE_VFINAL.md
 */

export type GuestSupportPack = {
  /** product_key persisté sur guest_micro_checkouts. */
  key: string;
  labelFr: string;
  labelEn: string;
  priceCents: number;
};

export const GUEST_SUPPORT_PACKS: readonly GuestSupportPack[] = [
  {
    key: "guest_heritage",
    labelFr: "Pack Héritage (HD + Version Sociale + Page Livre d'or)",
    labelEn: "Heritage Pack (HD + Social cut + Guest book page)",
    priceCents: 89_00,
  },
  {
    key: "guest_hd",
    labelFr: "Pack Soutien Numérique (Copie HD)",
    labelEn: "Digital Support Pack (HD copy)",
    priceCents: 49_00,
  },
  {
    key: "guest_candle",
    labelFr: "Bougie Commémorative Digitale",
    labelEn: "Digital Memorial Candle",
    priceCents: 15_00,
  },
] as const;

/** Plafond dur par transaction invité (anti-abus, aligné CHECK SQL). */
export const GUEST_TXN_MAX_CENTS = 100_000; // 1000 $

export function getGuestSupportPack(
  key: string | undefined,
): GuestSupportPack | undefined {
  if (!key) return undefined;
  return GUEST_SUPPORT_PACKS.find((pack) => pack.key === key);
}

export function guestSupportPackLabel(
  pack: GuestSupportPack,
  locale: "fr" | "en",
): string {
  return locale === "en" ? pack.labelEn : pack.labelFr;
}
