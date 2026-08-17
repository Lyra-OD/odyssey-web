import { describe, expect, it } from "vitest";

import {
  buildSalonPilotage,
  percentRate,
} from "@/src/lib/partner/partnerCommissionTypes";

describe("percentRate", () => {
  it("retourne 0 si le dénominateur est 0 ou invalide", () => {
    expect(percentRate(4, 0)).toBe(0);
    expect(percentRate(0, 0)).toBe(0);
    expect(percentRate(1, -2)).toBe(0);
    expect(percentRate(Number.NaN, 10)).toBe(0);
  });

  it("arrondit un ratio 0–100", () => {
    expect(percentRate(1, 2)).toBe(50);
    expect(percentRate(1, 3)).toBe(33);
    expect(percentRate(4, 4)).toBe(100);
  });
});

describe("buildSalonPilotage", () => {
  it("agrège GMV, ouverture et conversion salon", () => {
    const pilotage = buildSalonPilotage({
      invitationsSent: 12,
      invitationsAccepted: 8,
      upsells: 4,
      grossVolumeCents: 75_600,
    });

    expect(pilotage.grossVolumeCents).toBe(75_600);
    expect(pilotage.openingRatePercent).toBe(67);
    expect(pilotage.conversionRatePercent).toBe(33);
  });

  it("ne confond pas le brut avec la commission 30 % Net", () => {
    const pilotage = buildSalonPilotage({
      invitationsSent: 1,
      invitationsAccepted: 1,
      upsells: 1,
      grossVolumeCents: 17_900,
    });

    expect(pilotage.grossVolumeCents).toBe(17_900);
    expect(pilotage.grossVolumeCents).not.toBe(4_833);
  });
});
