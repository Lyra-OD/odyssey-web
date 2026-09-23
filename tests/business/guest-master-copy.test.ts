import { describe, expect, it } from "vitest";

import {
  GUEST_MASTER_COPY_CENTS,
  GUEST_MASTER_COPY_SKU,
} from "@/src/lib/wizard/guestMasterCopy";

describe("C12 guestMasterCopy", () => {
  it("SKU 15 $ = 1500 cents", () => {
    expect(GUEST_MASTER_COPY_SKU).toBe("guestMasterCopy");
    expect(GUEST_MASTER_COPY_CENTS).toBe(1500);
  });
});
