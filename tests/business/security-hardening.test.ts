import { describe, expect, it } from "vitest";

import {
  isSafeAppRelativePath,
  sanitizeNextPath,
  sanitizeSalonNextPath,
} from "@/src/lib/auth/sanitizeNextPath";
import { defaultPostAuthPath } from "@/src/lib/appRoutes";
import {
  GUEST_MESSAGE_LIMIT_ERROR,
  isGuestMessageQuotaExceeded,
} from "@/src/lib/contribute/guestMessageQuota";
import {
  GUEST_CHECKOUT_PENDING_LIMIT_ERROR,
  isGuestPendingCheckoutQuotaExceeded,
} from "@/src/lib/contribute/guestCheckoutQuota";
import {
  SANCTUARY_GUEST_MESSAGE_MAX,
  SANCTUARY_GUEST_PENDING_CHECKOUT_MAX,
} from "@/src/lib/contribute/sanctuaryLimits";

describe("sanitizeNextPath (anti open-redirect)", () => {
  it("accepte les chemins /fr|/en relatifs", () => {
    expect(isSafeAppRelativePath("/fr/salon")).toBe(true);
    expect(sanitizeNextPath("/en/studio")).toBe("/en/studio");
  });

  it("rejette //evil.com et protocol-relative", () => {
    expect(isSafeAppRelativePath("//evil.com/salon")).toBe(false);
    expect(sanitizeNextPath("//evil.com/salon")).toBe(defaultPostAuthPath("fr"));
    expect(sanitizeSalonNextPath("//evil.com/salon")).toBeNull();
  });

  it("sanitizeSalonNextPath n’accepte que /…/salon hors connexion", () => {
    expect(sanitizeSalonNextPath("/fr/salon/acme")).toBe("/fr/salon/acme");
    expect(sanitizeSalonNextPath("/fr/studio")).toBeNull();
    expect(sanitizeSalonNextPath("/fr/salon/connexion")).toBeNull();
    expect(sanitizeSalonNextPath("/fr/salon/foo/connexion")).toBeNull();
  });
});

describe("guest message & checkout quotas", () => {
  it("plafonne les messages à 10", () => {
    expect(SANCTUARY_GUEST_MESSAGE_MAX).toBe(10);
    expect(isGuestMessageQuotaExceeded(9)).toBe(false);
    expect(isGuestMessageQuotaExceeded(10)).toBe(true);
    expect(GUEST_MESSAGE_LIMIT_ERROR).toBe("guest_message_limit_reached");
  });

  it("plafonne les checkouts pending à 5", () => {
    expect(SANCTUARY_GUEST_PENDING_CHECKOUT_MAX).toBe(5);
    expect(isGuestPendingCheckoutQuotaExceeded(4)).toBe(false);
    expect(isGuestPendingCheckoutQuotaExceeded(5)).toBe(true);
    expect(GUEST_CHECKOUT_PENDING_LIMIT_ERROR).toBe(
      "guest_checkout_pending_limit_reached",
    );
  });
});
