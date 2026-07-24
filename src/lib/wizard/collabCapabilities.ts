/**
 * Capacités d'accès Wizard Famille — Owner vs Co-Créateur (Editor).
 *
 * Règle d'or : **UI = confort ; API = loi**.
 * Ce module est le contrat produit/tech (Phase A). Les routes Phase B
 * appellent `assertWizardCapability` / consultent `getWizardCapabilities`
 * — jamais un simple masquage de bouton.
 *
 * Canon : docs/WIZARD_EDITOR_COLLAB.md
 */

/** Rôle d'accès au Wizard pour un projet donné. */
export type WizardAccessRole = "owner" | "editor";

/**
 * Étapes Wizard accessibles au Co-Créateur.
 * Titulaire (owner) : toutes (1–7).
 */
export const WIZARD_EDITOR_ALLOWED_STEPS = [3, 4, 5] as const;

export type WizardEditorStep = (typeof WIZARD_EDITOR_ALLOWED_STEPS)[number];

/** TTL du lien opaque `/collab/[token]` (avant redeem → cookie). */
export const WIZARD_EDITOR_TOKEN_TTL_DAYS = 14;

/** Nom du cookie httpOnly posé après redeem (Phase B). */
export const WIZARD_EDITOR_COOKIE_NAME = "wizard_editor";

/**
 * TTL session cookie Co-Créateur (indépendant du token URL, révoqué au redeem).
 * Aligné sur le TTL lien pour limiter la fenêtre post-redeem.
 */
export const WIZARD_EDITOR_COOKIE_TTL_DAYS = 14;

/** purpose stocké dans `project_access_tokens.purpose`. */
export const WIZARD_EDITOR_TOKEN_PURPOSE = "wizard_editor" as const;

export type WizardCapabilityKey =
  | "canAccessVault"
  | "canAccessMusic"
  | "canAccessMontage"
  | "canAccessEssentials"
  | "canAccessInvite"
  | "canAccessPreview"
  | "canAccessCheckout"
  | "canUploadMedia"
  | "canEditStoryboard"
  | "canEditMusicSelection"
  | "canAcceptMusicRights"
  | "canEditPricing"
  | "canEditExtensions"
  | "canManageContributeLink"
  | "canManageCollabLink"
  | "canViewFundBalance"
  | "canCheckout"
  | "canExport";

export type WizardCapabilities = Record<WizardCapabilityKey, boolean>;

const OWNER_CAPABILITIES: WizardCapabilities = {
  canAccessVault: true,
  canAccessMusic: true,
  canAccessMontage: true,
  canAccessEssentials: true,
  canAccessInvite: true,
  canAccessPreview: true,
  canAccessCheckout: true,
  canUploadMedia: true,
  canEditStoryboard: true,
  canEditMusicSelection: true,
  canAcceptMusicRights: true,
  canEditPricing: true,
  canEditExtensions: true,
  canManageContributeLink: true,
  canManageCollabLink: true,
  canViewFundBalance: true,
  canCheckout: true,
  canExport: true,
};

/**
 * Co-Créateur : craft émotionnel uniquement.
 * Soft Cap / Licence / Fonds : visibles éventuellement en lecture plus tard,
 * mais **jamais** actionnables (checkout / fund-balance / mint liens).
 * Les frais Stingray restent assumés par le Titulaire à l'étape 7.
 */
const EDITOR_CAPABILITIES: WizardCapabilities = {
  canAccessVault: true,
  canAccessMusic: true,
  canAccessMontage: true,
  canAccessEssentials: false,
  canAccessInvite: false,
  canAccessPreview: false,
  canAccessCheckout: false,
  canUploadMedia: true,
  canEditStoryboard: true,
  canEditMusicSelection: true,
  canAcceptMusicRights: true,
  canEditPricing: false,
  canEditExtensions: false,
  canManageContributeLink: false,
  canManageCollabLink: false,
  canViewFundBalance: false,
  canCheckout: false,
  canExport: false,
};

const BY_ROLE: Record<WizardAccessRole, WizardCapabilities> = {
  owner: OWNER_CAPABILITIES,
  editor: EDITOR_CAPABILITIES,
};

export function getWizardCapabilities(
  role: WizardAccessRole,
): WizardCapabilities {
  return BY_ROLE[role];
}

export function wizardHasCapability(
  role: WizardAccessRole,
  capability: WizardCapabilityKey,
): boolean {
  return getWizardCapabilities(role)[capability];
}

export type WizardCapabilityDenied = {
  ok: false;
  error: "forbidden";
  capability: WizardCapabilityKey;
  role: WizardAccessRole;
  message: string;
};

/**
 * Garde API — à utiliser sur chaque route mutante / sensible (Phase B).
 */
export function assertWizardCapability(
  role: WizardAccessRole,
  capability: WizardCapabilityKey,
): { ok: true } | WizardCapabilityDenied {
  if (wizardHasCapability(role, capability)) {
    return { ok: true };
  }
  return {
    ok: false,
    error: "forbidden",
    capability,
    role,
    message: `Capability "${capability}" required (role=${role}).`,
  };
}

/** Étape Wizard autorisée pour ce rôle ? */
export function isWizardStepAllowedForRole(
  role: WizardAccessRole,
  step: number,
): boolean {
  if (role === "owner") {
    return Number.isInteger(step) && step >= 1 && step <= 7;
  }
  return (WIZARD_EDITOR_ALLOWED_STEPS as readonly number[]).includes(step);
}

/**
 * Clés `wizard_state` que l'éditeur peut patcher via autosave (Phase B).
 * Tout le reste (pricing, extensions, essentials, channel, …) est refusé.
 */
export const WIZARD_EDITOR_AUTOSAVE_ALLOWLIST = [
  "storyboard",
  "musicRightsAttestation",
] as const;

export type WizardEditorAutosaveKey =
  (typeof WIZARD_EDITOR_AUTOSAVE_ALLOWLIST)[number];

export function isWizardEditorAutosaveKey(
  key: string,
): key is WizardEditorAutosaveKey {
  return (WIZARD_EDITOR_AUTOSAVE_ALLOWLIST as readonly string[]).includes(key);
}
