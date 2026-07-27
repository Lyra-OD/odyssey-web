import { describe, expect, it } from "vitest";

import {
  GUEST_PHOTO_LIMIT_ERROR,
  guestContributeStoragePrefix,
  isGuestPhotoLimitDbError,
  isGuestPhotoQuotaExceeded,
} from "@/src/lib/contribute/guestPhotoQuota";
import { SANCTUARY_GUEST_PHOTO_MAX } from "@/src/lib/contribute/sanctuaryLimits";

describe("guest photo quota (Sanctuaire)", () => {
  it("autorise jusqu’à SANCTUARY_GUEST_PHOTO_MAX − 1", () => {
    expect(isGuestPhotoQuotaExceeded(0)).toBe(false);
    expect(isGuestPhotoQuotaExceeded(4)).toBe(false);
    expect(SANCTUARY_GUEST_PHOTO_MAX).toBe(5);
  });

  it("refuse dès que le compteur atteint 5", () => {
    expect(isGuestPhotoQuotaExceeded(5)).toBe(true);
    expect(isGuestPhotoQuotaExceeded(6)).toBe(true);
  });

  it("construit le préfixe storage scopé token", () => {
    const projectId = "11111111-1111-4111-8111-111111111111";
    const tokenId = "22222222-2222-4222-8222-222222222222";
    expect(guestContributeStoragePrefix(projectId, tokenId)).toBe(
      `projects/${projectId}/contribute/${tokenId}/`,
    );
  });

  it("détecte l’erreur SQL guest_photo_limit_reached", () => {
    expect(
      isGuestPhotoLimitDbError(
        `${GUEST_PHOTO_LIMIT_ERROR}: token x already has 5 guest photos`,
      ),
    ).toBe(true);
    expect(isGuestPhotoLimitDbError("media_quota_exceeded")).toBe(false);
  });
});
