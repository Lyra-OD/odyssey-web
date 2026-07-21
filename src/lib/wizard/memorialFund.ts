/**
 * Fonds Commémoratif — logique de cascade (Cascade V-Final).
 *
 * Fonction PURE, miroir côté TS de la décision appliquée au checkout famille.
 * Le crédit monétaire (waterfall, allocation, consommation) vit dans les RPC
 * SQL (accrue_guest_micro_checkout / consume_family_fund_credit) ; ici on
 * calcule uniquement QUEL forfait le crédit débloque (cascade P1→P2→P3).
 *
 * Cascade :
 *   P1 — couvrir le forfait de base (plancher payant du canal)
 *   P2 — auto-élévation : le surplus pousse vers le tier supérieur autorisé
 *   P3 — le crédit restant se déverse sur les add-ons
 *
 * Canon : docs/IMPLEMENTATION_CASCADE_VFINAL.md
 */

import {
  packageCents,
  packageTierRank,
  type WizardBasePackage,
} from "@/src/lib/wizard/pricingConfig";

export type CascadeResult = {
  /** Forfait couvert le plus élevé (après auto-élévation). */
  targetPackage: WizardBasePackage;
  /** true si le fonds a fait monter d'un tier au-dessus du plancher. */
  autoElevated: boolean;
  /** Prix du forfait cible (centimes). */
  coveredCents: number;
  /** Crédit appliqué au forfait (centimes). */
  appliedCreditCents: number;
  /** Reste-à-payer famille (centimes). */
  remainingDueCents: number;
  /** Surplus de crédit disponible pour les add-ons (centimes). */
  addonCreditCents: number;
};

export type ComputeCascadeInput = {
  /** Crédit disponible = accrued − consumed (centimes). */
  fundCreditCents: number;
  /** Plancher payant du canal (ex. `signature` = Héritage 149 $ en B2C). */
  basePackage: WizardBasePackage;
  /** Tiers autorisés du canal (ChannelProfile.allowedPackages). */
  allowedPackages: WizardBasePackage[];
  /** Reste-à-payer minimum imposé au porteur (défaut 0 = magie du 0 $). */
  ownerFloorCents?: number;
};

/**
 * Détermine le forfait débloqué par le Fonds Commémoratif et le reste-à-payer.
 * Ne consomme rien : purement calculatoire (source pour l'UI + le checkout).
 */
export function computeCascade(input: ComputeCascadeInput): CascadeResult {
  const credit = Math.max(input.fundCreditCents, 0);
  const ownerFloor = Math.max(input.ownerFloorCents ?? 0, 0);
  const baseRank = packageTierRank(input.basePackage);

  // Tiers >= plancher, triés par prix croissant.
  const tiers = Array.from(new Set([input.basePackage, ...input.allowedPackages]))
    .filter((pkg) => packageTierRank(pkg) >= baseRank)
    .sort((a, b) => packageCents(a) - packageCents(b));

  // P1 + P2 : le tier le plus élevé dont le prix est ENTIÈREMENT couvert.
  let target = input.basePackage;
  for (const tier of tiers) {
    if (credit >= packageCents(tier)) {
      target = tier;
    }
  }

  const autoElevated = packageTierRank(target) > baseRank;
  const coveredCents = packageCents(target);
  const appliedCreditCents = Math.min(
    credit,
    Math.max(coveredCents - ownerFloor, 0),
  );
  const remainingDueCents = Math.max(coveredCents - appliedCreditCents, 0);
  // P3 : surplus au-delà du forfait cible → crédit add-ons.
  const addonCreditCents = Math.max(credit - coveredCents, 0);

  return {
    targetPackage: target,
    autoElevated,
    coveredCents,
    appliedCreditCents,
    remainingDueCents,
    addonCreditCents,
  };
}
