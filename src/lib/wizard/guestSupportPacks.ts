/**
 * Catalogue Support Packs / Empreintes invités (Cascade V-Final — Sanctuaire).
 *
 * Positionnement Quiet Luxury accessible · panier cible ~80–100 $ ARPU payant.
 * Prix figés (CEO Phase 0 — 22/07/2026). Inline Stripe `price_data`.
 *
 * Ordre d'affichage UX (ancre haut) : voix → témoignage filmé → coproduction → bougie
 * (secondaire) → Mécène (montant libre).
 *
 * `guest_video` = témoignage **live** caméra (in-app), ≠ mini-clip fichier 15–30 s.
 * Plafonds dépôt : `src/lib/contribute/sanctuaryLimits.ts`.
 *
 * Canon : docs/IMPLEMENTATION_CASCADE_VFINAL.md · docs/FREEMIUM_V1_PIVOT.md
 */

export type GuestSupportPack = {
  /** product_key persisté sur guest_micro_checkouts. */
  key: string;
  labelFr: string;
  labelEn: string;
  /** Prix fixe en centimes. `0` si montant libre (Mécène). */
  priceCents: number;
  /**
   * Ordre d'affichage Sanctuaire (1 = ancre). Plus petit = plus haut.
   * Bougie volontairement en dernier parmi les packs fixes.
   */
  displayOrder: number;
  /** Si true : ne pas proposer comme CTA principal (filet bas). */
  secondary?: boolean;
  /** Montant libre (Mécène) — bornes en centimes. */
  amountMinCents?: number;
  amountMaxCents?: number;
  /** Suggestion UI pour montant libre. */
  amountSuggestedCents?: number;
  /** @deprecated Conservé pour paniers / webhooks legacy. */
  deprecated?: boolean;
};

/** Plafond dur par transaction invité (anti-abus, aligné CHECK SQL). */
export const GUEST_TXN_MAX_CENTS = 100_000; // 1000 $

/** Plancher Mécène (Quiet Luxury accessible). */
export const GUEST_PATRON_MIN_CENTS = 15_000; // 150 $

/** Suggestion UI Mécène. */
export const GUEST_PATRON_SUGGESTED_CENTS = 25_000; // 250 $

/**
 * Catalogue actif Sanctuaire (Phase 0 — grille 22/07/2026).
 * `guest_hd` est déprécié (cannibalise la voix) — exclu de cette liste active.
 */
export const GUEST_SUPPORT_PACKS: readonly GuestSupportPack[] = [
  {
    key: "guest_voice",
    labelFr: "Voix dans le film",
    labelEn: "Voice in the film",
    priceCents: 69_00,
    displayOrder: 1,
  },
  {
    key: "guest_video",
    labelFr: "Témoignage filmé",
    labelEn: "Filmed testimony",
    priceCents: 119_00,
    displayOrder: 2,
  },
  {
    key: "guest_heritage",
    labelFr: "Coproduction (HD + Version Sociale + Générique)",
    labelEn: "Co-production (HD + Social cut + Credits)",
    priceCents: 129_00,
    displayOrder: 3,
  },
  {
    key: "guest_candle",
    labelFr: "Geste / Bougie Commémorative",
    labelEn: "Gesture / Memorial Candle",
    priceCents: 15_00,
    displayOrder: 4,
    secondary: true,
  },
  {
    key: "guest_patron",
    labelFr: "Mécène (montant libre)",
    labelEn: "Patron (custom amount)",
    priceCents: 0,
    displayOrder: 5,
    amountMinCents: GUEST_PATRON_MIN_CENTS,
    amountMaxCents: GUEST_TXN_MAX_CENTS,
    amountSuggestedCents: GUEST_PATRON_SUGGESTED_CENTS,
  },
] as const;

/**
 * @deprecated Phase 0 (22/07/2026) — remplacé par `guest_voice`.
 * Conservé pour résolution legacy (webhooks / checkouts en cours).
 */
export const GUEST_HD_DEPRECATED: GuestSupportPack = {
  key: "guest_hd",
  labelFr: "Pack Soutien Numérique (Copie HD) — déprécié",
  labelEn: "Digital Support Pack (HD copy) — deprecated",
  priceCents: 49_00,
  displayOrder: 99,
  deprecated: true,
};

const LEGACY_PACKS: readonly GuestSupportPack[] = [GUEST_HD_DEPRECATED];

export function getGuestSupportPack(
  key: string | undefined,
): GuestSupportPack | undefined {
  if (!key) return undefined;
  return (
    GUEST_SUPPORT_PACKS.find((pack) => pack.key === key) ??
    LEGACY_PACKS.find((pack) => pack.key === key)
  );
}

/** Packs proposés sur la page Sanctuaire (exclut dépréciés). */
export function listActiveGuestSupportPacks(): readonly GuestSupportPack[] {
  return [...GUEST_SUPPORT_PACKS].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
}

export function guestSupportPackLabel(
  pack: GuestSupportPack,
  locale: "fr" | "en",
): string {
  return locale === "en" ? pack.labelEn : pack.labelFr;
}

/**
 * Résout le montant facturable d'un pack.
 * - Packs fixes : `priceCents`
 * - Mécène : `amountCents` borné [min, max]
 */
export function resolveGuestPackAmountCents(
  pack: GuestSupportPack,
  amountCents?: number,
): number | null {
  if (pack.key === "guest_patron") {
    const min = pack.amountMinCents ?? GUEST_PATRON_MIN_CENTS;
    const max = pack.amountMaxCents ?? GUEST_TXN_MAX_CENTS;
    if (
      typeof amountCents !== "number" ||
      !Number.isFinite(amountCents) ||
      !Number.isInteger(amountCents)
    ) {
      return null;
    }
    if (amountCents < min || amountCents > max) return null;
    return amountCents;
  }
  if (pack.priceCents <= 0 || pack.priceCents > GUEST_TXN_MAX_CENTS) {
    return null;
  }
  return pack.priceCents;
}
