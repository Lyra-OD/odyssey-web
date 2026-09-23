import { describe, expect, it } from "vitest";

import {
  SOCIAL_CUT_CENTS,
  SOCIAL_CUT_SKU,
  isSocialCutProductKey,
  socialCutPurchaseLabel,
} from "@/src/lib/wizard/socialCutPurchase";

describe("C13 socialCut", () => {
  it("SKU 19 $ = 1900 cents", () => {
    expect(SOCIAL_CUT_SKU).toBe("socialCut");
    expect(SOCIAL_CUT_CENTS).toBe(1900);
    expect(isSocialCutProductKey("socialCut")).toBe(true);
    expect(isSocialCutProductKey("cinemaMaster")).toBe(false);
  });

  it("labels FR/EN", () => {
    expect(socialCutPurchaseLabel("fr")).toContain("19");
    expect(socialCutPurchaseLabel("en")).toContain("19");
  });
});
