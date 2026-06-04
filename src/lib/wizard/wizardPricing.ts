/** Tarification wizard — alignée Stripe Checkout (centimes USD). */

export const WIZARD_BASE_PRICE_CENTS = 249_00;

export const EXTENSION_AI_RETOUCH_CENTS = 49_00;
export const EXTENSION_EXTENDED_LICENSE_CENTS = 39_00;
export const EXTENSION_COLLECTOR_USB_CENTS = 79_00;
export const EXTENSION_DIGITAL_VAULT_CENTS = 99_00;
export const EXTENSION_HERITAGE_PACK_CENTS = 149_00;

/** Somme individuelle a + b + d (49 + 39 + 99). */
export const HERITAGE_PACK_INDIVIDUAL_TOTAL_CENTS =
  EXTENSION_AI_RETOUCH_CENTS +
  EXTENSION_EXTENDED_LICENSE_CENTS +
  EXTENSION_DIGITAL_VAULT_CENTS;

export const HERITAGE_PACK_SAVINGS_CENTS =
  HERITAGE_PACK_INDIVIDUAL_TOTAL_CENTS - EXTENSION_HERITAGE_PACK_CENTS;

export type WizardExtensionsState = {
  aiRetouch?: boolean;
  extendedLicense?: boolean;
  collectorUsb?: boolean;
  digitalVault?: boolean;
  heritagePack?: boolean;
};

export type ExtensionLineKey =
  | "base"
  | "aiRetouch"
  | "extendedLicense"
  | "collectorUsb"
  | "digitalVault"
  | "heritagePack";

export type ExtensionLineItem = {
  key: ExtensionLineKey;
  cents: number;
};

export type WizardCartSnapshot = {
  baseCents: number;
  optionsCents: number;
  totalCents: number;
  lineItems: ExtensionLineItem[];
  extensions: WizardExtensionsState;
};

export function emptyExtensionsState(): WizardExtensionsState {
  return {};
}

export function hasExtensionSelection(
  extensions: WizardExtensionsState,
): boolean {
  return Boolean(
    extensions.aiRetouch ||
      extensions.extendedLicense ||
      extensions.collectorUsb ||
      extensions.digitalVault ||
      extensions.heritagePack,
  );
}

/** Bascule une extension en gérant le Pack Héritage (a + b + d). */
export function toggleWizardExtension(
  current: WizardExtensionsState,
  key: keyof WizardExtensionsState,
  enabled: boolean,
): WizardExtensionsState {
  if (key === "heritagePack") {
    if (enabled) {
      return {
        ...current,
        heritagePack: true,
        aiRetouch: true,
        extendedLicense: true,
        digitalVault: true,
      };
    }
    return {
      ...current,
      heritagePack: false,
      aiRetouch: false,
      extendedLicense: false,
      digitalVault: false,
    };
  }

  const next: WizardExtensionsState = {
    ...current,
    [key]: enabled,
  };

  if (
    !enabled &&
    (key === "aiRetouch" ||
      key === "extendedLicense" ||
      key === "digitalVault")
  ) {
    next.heritagePack = false;
  }

  if (
    next.aiRetouch &&
    next.extendedLicense &&
    next.digitalVault &&
    !next.heritagePack
  ) {
    const individualTotal =
      EXTENSION_AI_RETOUCH_CENTS +
      EXTENSION_EXTENDED_LICENSE_CENTS +
      EXTENSION_DIGITAL_VAULT_CENTS;
    if (individualTotal > EXTENSION_HERITAGE_PACK_CENTS) {
      return toggleWizardExtension(next, "heritagePack", true);
    }
  }

  return next;
}

export function computeWizardCart(
  extensions: WizardExtensionsState,
): WizardCartSnapshot {
  const normalized = { ...extensions };
  const lineItems: ExtensionLineItem[] = [
    { key: "base", cents: WIZARD_BASE_PRICE_CENTS },
  ];
  let optionsCents = 0;

  if (normalized.heritagePack) {
    lineItems.push({
      key: "heritagePack",
      cents: EXTENSION_HERITAGE_PACK_CENTS,
    });
    optionsCents += EXTENSION_HERITAGE_PACK_CENTS;
  } else {
    if (normalized.aiRetouch) {
      lineItems.push({
        key: "aiRetouch",
        cents: EXTENSION_AI_RETOUCH_CENTS,
      });
      optionsCents += EXTENSION_AI_RETOUCH_CENTS;
    }
    if (normalized.extendedLicense) {
      lineItems.push({
        key: "extendedLicense",
        cents: EXTENSION_EXTENDED_LICENSE_CENTS,
      });
      optionsCents += EXTENSION_EXTENDED_LICENSE_CENTS;
    }
    if (normalized.digitalVault) {
      lineItems.push({
        key: "digitalVault",
        cents: EXTENSION_DIGITAL_VAULT_CENTS,
      });
      optionsCents += EXTENSION_DIGITAL_VAULT_CENTS;
    }
  }

  if (normalized.collectorUsb) {
    lineItems.push({
      key: "collectorUsb",
      cents: EXTENSION_COLLECTOR_USB_CENTS,
    });
    optionsCents += EXTENSION_COLLECTOR_USB_CENTS;
  }

  return {
    baseCents: WIZARD_BASE_PRICE_CENTS,
    optionsCents,
    totalCents: WIZARD_BASE_PRICE_CENTS + optionsCents,
    lineItems,
    extensions: normalized,
  };
}

/** Labels Stripe (anglais) — l'UI utilise i18n. */
export const CHECKOUT_LINE_LABELS: Record<ExtensionLineKey, string> = {
  base: "Odyssey — Cinematic Tribute (Base)",
  aiRetouch: "Premium AI Retouch",
  extendedLicense: "Extended Broadcast License (Stingray)",
  collectorUsb: "Collector USB Key — Laser Engraving",
  digitalVault: "Digital Vault — 50-Year Secure Hosting",
  heritagePack: "Heritage Pack (AI Retouch + License + Vault)",
};

export function formatWizardPrice(
  cents: number,
  locale: "fr" | "en" = "fr",
): string {
  const amount = Math.round(cents / 100);
  return locale === "en" ? `$${amount}` : `${amount}$`;
}

/** @deprecated Utiliser computeWizardCart(extensions). */
export const UPSELL_AI_RETOUCH_CENTS = EXTENSION_AI_RETOUCH_CENTS;
/** @deprecated */
export const UPSELL_EXTENDED_LICENSE_CENTS = EXTENSION_EXTENDED_LICENSE_CENTS;
