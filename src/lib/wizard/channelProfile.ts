/**
 * ChannelProfile — chef d'orchestre de l'entrée wizard (Cascade V-Final).
 *
 * Source unique de vérité, dérivée du BACKEND (tenants.is_freemium + invitation),
 * qui dicte le forfait de départ, les forfaits autorisés, et le comportement
 * d'export/preview par canal. Remplace le fallback frontend historique
 * (DEFAULT_B2C_BASE_PACKAGE = heritage / Éternité 349 $) qui faisait démarrer
 * tout nouveau projet au forfait maximum.
 *
 * Canon : docs/IMPLEMENTATION_CASCADE_VFINAL.md
 */

import {
  WIZARD_B2C_DIRECT_PACKAGES,
  WIZARD_PARTNER_GRANTED_PACKAGES,
} from "@/src/lib/wizard/pricingConfig";
import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";
import { WIZARD_STATE_VERSION } from "@/src/lib/wizard/wizardState";

export type WizardChannel = "partner" | "direct";

export type ChannelProfile = {
  channel: WizardChannel;
  /** Forfait offert à l'entrée (partner = essential/Souvenir 0 $). */
  grantedPackage: WizardBasePackage;
  /** Forfait visé au démarrage (plancher payant côté direct). */
  intendedPackage: WizardBasePackage;
  /** Forfaits sélectionnables dans ce canal. */
  allowedPackages: WizardBasePackage[];
  /** Forfait mis en avant (« le plus choisi ») dans l'UI. */
  anchorPackage: WizardBasePackage;
  /** true = export gratuit possible (B2B2C Souvenir 0 $). false = paywall à l'export. */
  freeExport: boolean;
  /** Rendu preview avant paiement : complet (B2B2C) vs filigrané (B2C). */
  previewMode: "full" | "watermarked";
};

export type ResolveChannelInput = {
  isFreemiumTenant: boolean;
  hasInvitation: boolean;
};

/**
 * B2B2C (partenaire / salon) : Souvenir 0 $ offert → Soft Cap → upsell.
 * B2C (direct) : brouillon gratuit, paywall STRICT à l'export (plancher Héritage 179 $),
 * financé par la Boucle Virale (Fonds Commémoratif).
 */
export function resolveChannelProfile(input: ResolveChannelInput): ChannelProfile {
  const isPartner = input.isFreemiumTenant || input.hasInvitation;

  if (isPartner) {
    return {
      channel: "partner",
      grantedPackage: "essential", // Souvenir 0 $
      intendedPackage: "essential",
      allowedPackages: [...WIZARD_PARTNER_GRANTED_PACKAGES], // essential, signature, heritage
      anchorPackage: "heritage", // Éternité = cible upsell
      freeExport: true,
      previewMode: "full",
    };
  }

  return {
    channel: "direct",
    // Pas de forfait offert : le plancher payant EST le point de départ.
    grantedPackage: "signature", // Héritage 179 $
    intendedPackage: "signature",
    allowedPackages: [...WIZARD_B2C_DIRECT_PACKAGES], // signature, heritage, legendary
    anchorPackage: "heritage", // Éternité mis en avant (Légendaire = ancre/leurre)
    freeExport: false,
    previewMode: "watermarked",
  };
}

/**
 * État wizard initial persisté à la création du projet — pilote le forfait de
 * départ côté DB (fin du fallback frontend Éternité 349 $).
 */
export function buildInitialWizardState(
  profile: ChannelProfile,
): Record<string, unknown> {
  return {
    version: WIZARD_STATE_VERSION,
    isPartner: false,
    channel: profile.channel,
    grantedPackage: profile.grantedPackage,
    intendedPackage: profile.intendedPackage,
    basePackage: profile.intendedPackage,
  };
}
