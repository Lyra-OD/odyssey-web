import { describe, expect, it } from "vitest";

import { buildHqDirectorRows } from "@/src/lib/hq/hqDirectors";

const jean = "11111111-1111-4111-8111-111111111111";
const marie = "22222222-2222-4222-8222-222222222222";
const invA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const invB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const invC = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("buildHqDirectorRows", () => {
  it("agrège par invited_by_user_id avec les mêmes formules que Mes performances", () => {
    const rows = buildHqDirectorRows(
      [
        {
          id: invA,
          invited_email: "famille-a@example.com",
          status: "accepted",
          created_at: "2026-08-01T00:00:00.000Z",
          invited_by_user_id: jean,
        },
        {
          id: invB,
          invited_email: "famille-b@example.com",
          status: "pending",
          created_at: "2026-08-02T00:00:00.000Z",
          invited_by_user_id: jean,
        },
        {
          id: invC,
          invited_email: "famille-c@example.com",
          status: "accepted",
          created_at: "2026-08-03T00:00:00.000Z",
          invited_by_user_id: marie,
        },
      ],
      [
        {
          invitation_id: invA,
          reason: "commission_accrual",
          status: "confirmed",
          commission_cents: 4833,
        },
        {
          invitation_id: invC,
          reason: "commission_accrual",
          status: "confirmed",
          commission_cents: 9423,
        },
      ],
      { unassigned: "Sans conseiller", unknown: "Directeur" },
      new Map([
        [jean, { label: "jean@salon.com", role: "partner" }],
        [marie, { label: "marie@salon.com", role: "partner_admin" }],
      ]),
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.label).toBe("marie@salon.com");
    expect(rows[0]?.attributedCents).toBe(9423);
    expect(rows[0]?.conversionRatePercent).toBe(100);
    expect(rows[1]?.label).toBe("jean@salon.com");
    expect(rows[1]?.invitationsSent).toBe(2);
    expect(rows[1]?.attributedCents).toBe(4833);
    expect(rows[1]?.conversionRatePercent).toBe(50);
    expect(JSON.stringify(rows)).not.toContain("famille-a@example.com");
  });

  it("regroupe les invitations sans conseiller", () => {
    const rows = buildHqDirectorRows(
      [
        {
          id: invA,
          invited_email: "famille@example.com",
          status: "pending",
          created_at: "2026-08-01T00:00:00.000Z",
          invited_by_user_id: null,
        },
      ],
      [],
      { unassigned: "Sans conseiller", unknown: "Directeur" },
      new Map(),
    );

    expect(rows).toEqual([
      expect.objectContaining({
        userId: null,
        label: "Sans conseiller",
        role: "unassigned",
        invitationsSent: 1,
        attributedCents: 0,
      }),
    ]);
  });
});
