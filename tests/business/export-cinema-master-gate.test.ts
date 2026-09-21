import { describe, expect, it } from "vitest";

import {
  assertExportAllowed,
  hasCinemaMasterExportEntitlement,
  type ProjectPaidEntitlementsRow,
} from "@/src/lib/wizard/exportGate";

/**
 * C2 — Gate export Creatomate.
 * Souvenir stream seul = refus · cinemaMaster 49 $ ou Héritage+ = OK.
 */

function ent(
  partial: Partial<ProjectPaidEntitlementsRow> &
    Pick<ProjectPaidEntitlementsRow, "paid_package">,
): ProjectPaidEntitlementsRow {
  return {
    project_id: "p1",
    music_license: false,
    export_resolution: "1080p",
    extensions: null,
    paid_at: "2026-09-21T12:00:00.000Z",
    ...partial,
  };
}

describe("C2 — export exige cinemaMaster ou Héritage+", () => {
  it("hasCinemaMasterExportEntitlement : Héritage+ sans flag", () => {
    expect(
      hasCinemaMasterExportEntitlement(ent({ paid_package: "signature" })),
    ).toBe(true);
    expect(
      hasCinemaMasterExportEntitlement(ent({ paid_package: "heritage" })),
    ).toBe(true);
  });

  it("hasCinemaMasterExportEntitlement : Souvenir + cinemaMaster", () => {
    expect(
      hasCinemaMasterExportEntitlement(
        ent({
          paid_package: "essential",
          extensions: { cinemaMaster: true },
        }),
      ),
    ).toBe(true);
  });

  it("Souvenir freemium_free sans cinemaMaster → refus", () => {
    const denied = assertExportAllowed({
      entitlements: ent({ paid_package: "essential" }),
      locale: "fr",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("cinema_master_required");
  });

  it("Souvenir + musicLicense seule → refus Creatomate (≠ Master)", () => {
    const denied = assertExportAllowed({
      entitlements: ent({
        paid_package: "essential",
        music_license: true,
        extensions: { musicLicense: true },
      }),
      locale: "en",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.code).toBe("cinema_master_required");
  });

  it("Souvenir + cinemaMaster → export OK", () => {
    const allowed = assertExportAllowed({
      entitlements: ent({
        paid_package: "essential",
        extensions: { cinemaMaster: true },
      }),
    });
    expect(allowed.ok).toBe(true);
  });

  it("Héritage → export OK sans cinemaMaster", () => {
    const allowed = assertExportAllowed({
      entitlements: ent({ paid_package: "signature" }),
    });
    expect(allowed.ok).toBe(true);
  });
});
