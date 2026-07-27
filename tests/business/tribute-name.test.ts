import { describe, expect, it } from "vitest";

import {
  essentialsNameColumnsForSync,
  formatTributeDisplayName,
  resolveTributeNames,
} from "@/src/lib/contribute/tributeName";

describe("resolveTributeNames (Sanctuaire)", () => {
  it("priorise wizard_state.essentials sur les colonnes SQL", () => {
    const names = resolveTributeNames({
      first_name: "Je",
      last_name: null,
      wizard_state: {
        version: 1,
        essentials: { firstName: "Jean", lastName: "Dupont" },
      },
    });
    expect(names).toEqual({ firstName: "Jean", lastName: "Dupont" });
    expect(formatTributeDisplayName(names, "fr")).toBe("Jean Dupont");
  });

  it("retombe sur les colonnes SQL si essentials vides", () => {
    const names = resolveTributeNames({
      first_name: "Marie",
      last_name: "Martin",
      wizard_state: { version: 1 },
    });
    expect(names).toEqual({ firstName: "Marie", lastName: "Martin" });
  });

  it("fallback « un être cher » si tout est vide", () => {
    expect(
      formatTributeDisplayName(
        resolveTributeNames({ first_name: null, last_name: null }),
        "fr",
      ),
    ).toBe("un être cher");
    expect(
      formatTributeDisplayName(
        { firstName: null, lastName: null },
        "en",
      ),
    ).toBe("a loved one");
  });

  it("miroirs essentials → colonnes pour autosave", () => {
    expect(
      essentialsNameColumnsForSync({
        firstName: " Jean ",
        lastName: " Dupont ",
      }),
    ).toEqual({ first_name: "Jean", last_name: "Dupont" });
    expect(essentialsNameColumnsForSync({ firstName: "", lastName: "" })).toEqual(
      {},
    );
  });
});
