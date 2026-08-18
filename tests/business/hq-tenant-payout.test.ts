import { describe, expect, it } from "vitest";

import {
  buildHqTenantListRow,
  filterHqTenantsByVertical,
  presentHqVerticalTabs,
} from "@/src/lib/hq/hqTenantsList";
import { normalizeHqVertical } from "@/src/lib/hq/hqNetworkOverview";

describe("buildHqTenantListRow", () => {
  it("calcule payable = accrued − paid", () => {
    const row = buildHqTenantListRow({
      tenant: { id: "t1", name: "Salon Lavoie", slug: "lavoie", vertical: "human" },
      balance: { accrued_cents: 20_412, pending_cents: 1_053, paid_cents: 10_000 },
      invitationsSent: 8,
      upsells: 2,
    });

    expect(row.payable_cents).toBe(10_412);
    expect(row.accrued_cents).toBe(20_412);
    expect(row.paid_cents).toBe(10_000);
    expect(row.conversionRatePercent).toBe(25);
  });

  it("0 invitation → conversion 0 %", () => {
    const row = buildHqTenantListRow({
      tenant: { id: "t2", name: "Salon Vide", slug: null, vertical: "human" },
      balance: { accrued_cents: 0, pending_cents: 0, paid_cents: 0 },
      invitationsSent: 0,
      upsells: 0,
    });

    expect(row.conversionRatePercent).toBe(0);
    expect(row.payable_cents).toBe(0);
  });

  it("payable à zéro après versement intégral", () => {
    const row = buildHqTenantListRow({
      tenant: { id: "t3", name: "Salon Payé", slug: "paye", vertical: "pet" },
      balance: { accrued_cents: 4_833, pending_cents: 0, paid_cents: 4_833 },
      invitationsSent: 1,
      upsells: 1,
    });

    expect(row.payable_cents).toBe(0);
  });
});

describe("HQ vertical tabs", () => {
  it("normalise une verticale inconnue vers other", () => {
    expect(normalizeHqVertical("human")).toBe("human");
    expect(normalizeHqVertical("PET")).toBe("pet");
    expect(normalizeHqVertical(null)).toBe("other");
    expect(normalizeHqVertical("funeral")).toBe("other");
  });

  it("filtre le tableau sans toucher au réseau entier", () => {
    const rows = [
      buildHqTenantListRow({
        tenant: { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", name: "H", slug: "h", vertical: "human" },
        balance: { accrued_cents: 100, pending_cents: 0, paid_cents: 0 },
        invitationsSent: 1,
        upsells: 0,
      }),
      buildHqTenantListRow({
        tenant: { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", name: "P", slug: "p", vertical: "pet" },
        balance: { accrued_cents: 0, pending_cents: 0, paid_cents: 0 },
        invitationsSent: 0,
        upsells: 0,
      }),
    ];

    expect(presentHqVerticalTabs(rows)).toEqual(["all", "human", "pet"]);
    expect(filterHqTenantsByVertical(rows, "pet")).toHaveLength(1);
    expect(filterHqTenantsByVertical(rows, "pet")[0]?.name).toBe("P");
    expect(filterHqTenantsByVertical(rows, "all")).toHaveLength(2);
  });
});
