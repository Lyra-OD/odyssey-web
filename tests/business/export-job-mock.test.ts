import { describe, expect, it } from "vitest";

import { buildMockCompletedMessage } from "@/src/lib/export/processExportJob";

describe("buildMockCompletedMessage", () => {
  it("annonce 4K + stingray master quand entitlements premium", () => {
    expect(
      buildMockCompletedMessage({
        allow_4k: true,
        allow_stingray_master: true,
      }),
    ).toContain("4K");
    expect(
      buildMockCompletedMessage({
        allow_4k: true,
        allow_stingray_master: true,
      }),
    ).toContain("stingray_master=yes");
  });

  it("annonce 1080p sans master pour Souvenir gated", () => {
    const msg = buildMockCompletedMessage({
      allow_4k: false,
      allow_stingray_master: false,
    });
    expect(msg).toContain("1080p");
    expect(msg).toContain("stingray_master=no");
    expect(msg).toContain("mock_staging");
  });
});
