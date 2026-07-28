import { describe, expect, it } from "vitest";

import { parseTenantViralSettings } from "@/src/lib/wizard/tenantViralSettings";

describe("parseTenantViralSettings (pilote Boucle Virale)", () => {
  it("défaut OFF si settings vides ou absents", () => {
    expect(parseTenantViralSettings(undefined)).toEqual({
      viralLoopEnabled: false,
      ownerFloorCents: 0,
    });
    expect(parseTenantViralSettings({})).toEqual({
      viralLoopEnabled: false,
      ownerFloorCents: 0,
    });
  });

  it("n’accepte que le booléen strict true", () => {
    expect(
      parseTenantViralSettings({ viral_loop_enabled: true }).viralLoopEnabled,
    ).toBe(true);
    expect(
      parseTenantViralSettings({ viral_loop_enabled: "true" }).viralLoopEnabled,
    ).toBe(false);
    expect(
      parseTenantViralSettings({ viral_loop_enabled: 1 }).viralLoopEnabled,
    ).toBe(false);
  });

  it("lit owner_floor_cents non négatif", () => {
    expect(
      parseTenantViralSettings({
        viral_loop_enabled: true,
        owner_floor_cents: 2000,
      }),
    ).toEqual({ viralLoopEnabled: true, ownerFloorCents: 2000 });
    expect(
      parseTenantViralSettings({ owner_floor_cents: -5 }).ownerFloorCents,
    ).toBe(0);
  });
});
