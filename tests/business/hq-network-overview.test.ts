import { describe, expect, it } from "vitest";

import {
  buildHqNetworkOverview,
  EMPTY_HQ_NETWORK_OVERVIEW,
} from "@/src/lib/hq/hqNetworkOverview";

describe("buildHqNetworkOverview", () => {
  it("0 invitation → taux 0 %", () => {
    const overview = buildHqNetworkOverview({
      accruals: [],
      invitationsSent: 0,
      invitationsAccepted: 0,
    });

    expect(overview).toEqual(EMPTY_HQ_NETWORK_OVERVIEW);
    expect(overview.pilotage.openingRatePercent).toBe(0);
    expect(overview.pilotage.conversionRatePercent).toBe(0);
  });

  it("un accrual Héritage 179 $ → GMV, commission, marge Odyssey et fee canon", () => {
    const overview = buildHqNetworkOverview({
      accruals: [
        {
          gross_payment_cents: 17_900,
          net_distributable_cents: 16_110,
          commission_cents: 4_833,
          platform_fee_cents: 1_790,
          invitation_id: "inv-heritage-1",
        },
      ],
      invitationsSent: 4,
      invitationsAccepted: 3,
    });

    expect(overview.gmvTotalCents).toBe(17_900);
    expect(overview.salonShareCents).toBe(4_833);
    expect(overview.odysseyMarginCents).toBe(11_277);
    expect(overview.platformFeeCents).toBe(1_790);
    expect(overview.gmvTotalCents).not.toBe(overview.salonShareCents);
    expect(
      overview.platformFeeCents +
        overview.salonShareCents +
        overview.odysseyMarginCents,
    ).toBe(17_900);
    expect(overview.pilotage.upsells).toBe(1);
    expect(overview.pilotage.conversionRatePercent).toBe(25);
    expect(overview.pilotage.openingRatePercent).toBe(75);
  });

  it("ne compte qu’une conversion par invitation distincte", () => {
    const overview = buildHqNetworkOverview({
      accruals: [
        {
          gross_payment_cents: 17_900,
          net_distributable_cents: 16_110,
          commission_cents: 4_833,
          platform_fee_cents: 1_790,
          invitation_id: "same-inv",
        },
        {
          gross_payment_cents: 4_900,
          net_distributable_cents: 4_410,
          commission_cents: 1_323,
          platform_fee_cents: 490,
          invitation_id: "same-inv",
        },
      ],
      invitationsSent: 2,
      invitationsAccepted: 2,
    });

    expect(overview.pilotage.upsells).toBe(1);
    expect(overview.pilotage.conversionRatePercent).toBe(50);
  });
});
