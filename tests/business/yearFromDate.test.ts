import { describe, expect, it } from "vitest";

import { essentialsFromWizard } from "@/src/lib/creatomate/buildPlan";
import {
  formatYearsLine,
  yearFromDate,
} from "@/src/lib/creatomate/yearFromDate";
import type { WizardStateV1 } from "@/src/lib/wizard/wizardState";

describe("yearFromDate", () => {
  it("extrait YYYY depuis ISO", () => {
    expect(yearFromDate("1948-03-15")).toBe("1948");
    expect(yearFromDate("2024-01-01")).toBe("2024");
    expect(yearFromDate("1960")).toBe("1960");
  });

  it("extrait YYYY depuis texte libre", () => {
    expect(yearFromDate("né en 1942")).toBe("1942");
    expect(yearFromDate("1948 · 2024")).toBe("1948");
  });

  it("retourne null si vide ou invalide", () => {
    expect(yearFromDate(null)).toBeNull();
    expect(yearFromDate("")).toBeNull();
    expect(yearFromDate("   ")).toBeNull();
    expect(yearFromDate("abc")).toBeNull();
  });
});

describe("formatYearsLine", () => {
  it("compose naissance - départ", () => {
    expect(formatYearsLine("1940", "2026")).toBe("1940 - 2026");
    expect(formatYearsLine("1940", null)).toBe("1940");
    expect(formatYearsLine(null, "2026")).toBe("2026");
    expect(formatYearsLine(null, null)).toBeNull();
  });
});

describe("essentialsFromWizard (étape 1)", () => {
  it("remplit years et laisse portraitUrl null", () => {
    const state = {
      version: 2,
      essentials: {
        firstName: "Jean-Paul",
        lastName: "Gaudreault",
        birthDate: "1940-06-01",
        deathDate: "2026-01-10",
        avatarPath: "projects/x/avatar/primary.jpg",
      },
    } as WizardStateV1;

    const e = essentialsFromWizard(state);
    expect(e.displayName).toBe("Jean-Paul Gaudreault");
    expect(e.birthYear).toBe("1940");
    expect(e.deathYear).toBe("2026");
    expect(e.datesLine).toBe("1940-06-01 · 2026-01-10");
    expect(e.portraitUrl).toBeNull();
  });
});
