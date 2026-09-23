import { describe, expect, it } from "vitest";

import {
  CINEMA_MASTER_GIFT_SKU,
  CINEMA_MASTER_PURCHASE_CENTS,
  CINEMA_MASTER_SKU,
  isCinemaMasterProductKey,
} from "@/src/lib/wizard/cinemaMasterPurchase";
import { extensionCents } from "@/src/lib/wizard/pricingConfig";

describe("C11 cinemaMaster multi-buyer", () => {
  it("SKU 49 $ aligné grille", () => {
    expect(CINEMA_MASTER_SKU).toBe("cinemaMaster");
    expect(CINEMA_MASTER_GIFT_SKU).toBe("cinemaMasterGift");
    expect(CINEMA_MASTER_PURCHASE_CENTS).toBe(extensionCents("cinemaMaster"));
    expect(CINEMA_MASTER_PURCHASE_CENTS).toBe(4900);
  });

  it("détecte les product_key Master", () => {
    expect(isCinemaMasterProductKey("cinemaMaster")).toBe(true);
    expect(isCinemaMasterProductKey("cinemaMasterGift")).toBe(true);
    expect(isCinemaMasterProductKey("guestMasterCopy")).toBe(false);
  });
});
