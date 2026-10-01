import { describe, expect, it } from "vitest";

import { resolveOrganizerMasterHubMode } from "@/src/lib/wizard/organizerMasterHub";

describe("resolveOrganizerMasterHubMode", () => {
  it("Souvenir unpaid → buy Master 49$", () => {
    expect(
      resolveOrganizerMasterHubMode({
        grantedPackage: "essential",
        intendedPackage: "essential",
        projectStatus: "draft",
      }),
    ).toBe("buy_master");
  });

  it("Héritage draft → finalize Écrin (jamais 49$)", () => {
    expect(
      resolveOrganizerMasterHubMode({
        grantedPackage: "essential",
        intendedPackage: "signature",
        projectStatus: "draft",
      }),
    ).toBe("finalize_heritage");
  });

  it("Héritage submitted → download included", () => {
    expect(
      resolveOrganizerMasterHubMode({
        grantedPackage: "signature",
        intendedPackage: "signature",
        projectStatus: "submitted",
      }),
    ).toBe("download_included");
  });

  it("masterEntitled override → download", () => {
    expect(
      resolveOrganizerMasterHubMode({
        grantedPackage: "essential",
        intendedPackage: "essential",
        projectStatus: "draft",
        masterEntitled: true,
      }),
    ).toBe("download_included");
  });
});
