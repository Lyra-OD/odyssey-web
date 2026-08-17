import { describe, expect, it } from "vitest";

import {
  aggregateMyPerformance,
  maskFamilyEmail,
  PartnerMyPerformanceResponseSchema,
} from "@/src/lib/partner/partnerPerformance";

describe("maskFamilyEmail", () => {
  it("garde l’initiale et le domaine", () => {
    expect(maskFamilyEmail("Jean.Dupont@Urgel.com")).toBe("j***@urgel.com");
  });

  it("refuse les adresses vides ou sans domaine", () => {
    expect(maskFamilyEmail("")).toBe("***");
    expect(maskFamilyEmail("pas-un-email")).toBe("***");
    expect(maskFamilyEmail("@salon.com")).toBe("***");
  });
});

describe("aggregateMyPerformance", () => {
  const jeanInvites = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      invited_email: "a@famille.com",
      status: "accepted",
      created_at: "2026-08-01T00:00:00.000Z",
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      invited_email: "b@famille.com",
      status: "pending",
      created_at: "2026-08-02T00:00:00.000Z",
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      invited_email: "c@famille.com",
      status: "accepted",
      created_at: "2026-08-03T00:00:00.000Z",
    },
  ];

  it("n’agrège que les accruals confirmés des invitations du conseiller", () => {
    const kpis = aggregateMyPerformance(jeanInvites, [
      {
        invitation_id: jeanInvites[0].id,
        reason: "commission_accrual",
        status: "confirmed",
        commission_cents: 4833,
      },
      {
        invitation_id: jeanInvites[0].id,
        reason: "guest_commission_accrual",
        status: "confirmed",
        commission_cents: 186,
      },
      {
        invitation_id: jeanInvites[1].id,
        reason: "commission_accrual",
        status: "pending",
        commission_cents: 9999,
      },
      {
        invitation_id: "99999999-9999-4999-8999-999999999999",
        reason: "commission_accrual",
        status: "confirmed",
        commission_cents: 50_000,
      },
      {
        invitation_id: jeanInvites[2].id,
        reason: "payout",
        status: "confirmed",
        commission_cents: 2000,
      },
    ]);

    expect(kpis.invitationsSent).toBe(3);
    expect(kpis.invitationsAccepted).toBe(2);
    expect(kpis.upsells).toBe(1);
    expect(kpis.attributedCents).toBe(5019);
    expect(kpis.engagementRatePercent).toBe(67);
    expect(kpis.conversionRatePercent).toBe(33);
  });

  it("taux à 0 % s’il n’a envoyé aucune invitation", () => {
    const kpis = aggregateMyPerformance([], []);
    expect(kpis.engagementRatePercent).toBe(0);
    expect(kpis.conversionRatePercent).toBe(0);
  });

  it("ne compte pas une contribution invité seule comme upsell famille", () => {
    const kpis = aggregateMyPerformance(jeanInvites, [
      {
        invitation_id: jeanInvites[2].id,
        reason: "guest_commission_accrual",
        status: "confirmed",
        commission_cents: 186,
      },
    ]);

    expect(kpis.upsells).toBe(0);
    expect(kpis.attributedCents).toBe(186);
  });

  it("ne fuit pas le solde salon (pas d’accrued_cents tenant)", () => {
    const parsed = PartnerMyPerformanceResponseSchema.parse({
      tenantId: "00000000-0000-4000-8000-000000000001",
      kpis: {
        invitationsSent: 12,
        invitationsAccepted: 8,
        upsells: 4,
        attributedCents: 19332,
        engagementRatePercent: 67,
        conversionRatePercent: 33,
      },
      rows: [],
    });

    expect("balance" in parsed).toBe(false);
    expect("accrued_cents" in parsed.kpis).toBe(false);
  });
});
