import { describe, expect, it } from "vitest";

import { guestDepositHasSouvenir } from "@/src/lib/contribute/guestDepositSouvenir";

describe("guestDepositHasSouvenir — photos ET/OU mot", () => {
  it("accepte photos seules", () => {
    expect(guestDepositHasSouvenir({ photoCount: 2, messageText: "" })).toBe(
      true,
    );
  });

  it("accepte un mot seul", () => {
    expect(
      guestDepositHasSouvenir({ photoCount: 0, messageText: "  pour toi  " }),
    ).toBe(true);
  });

  it("accepte les deux ensemble", () => {
    expect(
      guestDepositHasSouvenir({ photoCount: 1, messageText: "un mot" }),
    ).toBe(true);
  });

  it("refuse le vide", () => {
    expect(guestDepositHasSouvenir({ photoCount: 0, messageText: "   " })).toBe(
      false,
    );
  });
});
