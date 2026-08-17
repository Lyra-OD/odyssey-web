import { describe, expect, it } from "vitest";

import {
  isHqAllowlistHit,
  isHqProtectedPath,
  localeFromPathname,
} from "@/src/lib/hq/isOdysseyOperator";

describe("isHqProtectedPath", () => {
  it("protège /hq et les sous-routes, pas la connexion", () => {
    expect(isHqProtectedPath("/fr/hq")).toBe(true);
    expect(isHqProtectedPath("/en/hq/salons/abc")).toBe(true);
    expect(isHqProtectedPath("/fr/hq/connexion")).toBe(false);
    expect(isHqProtectedPath("/fr/hq/connexion/")).toBe(false);
    expect(isHqProtectedPath("/fr/salon")).toBe(false);
    expect(isHqProtectedPath("/fr/studio")).toBe(false);
  });
});

describe("localeFromPathname", () => {
  it("lit le premier segment", () => {
    expect(localeFromPathname("/en/hq")).toBe("en");
    expect(localeFromPathname("/fr/hq/connexion")).toBe("fr");
  });
});

describe("isHqAllowlistHit", () => {
  const userId = "11111111-1111-4111-8111-111111111111";

  it("accepte uniquement la ligne de ce user", () => {
    expect(isHqAllowlistHit({ user_id: userId }, userId)).toBe(true);
    expect(
      isHqAllowlistHit(
        { user_id: "99999999-9999-4999-8999-999999999999" },
        userId,
      ),
    ).toBe(false);
    expect(isHqAllowlistHit(null, userId)).toBe(false);
    expect(isHqAllowlistHit({}, userId)).toBe(false);
  });
});
