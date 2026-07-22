import { describe, it, expect } from "vitest";

import {
  formatCircleDisplayName,
  mergeCircleEntries,
  roleFromProductKey,
} from "@/src/lib/contribute/circle";
import {
  getGuestSupportPack,
  resolveGuestPackAmountCents,
} from "@/src/lib/wizard/guestSupportPacks";

describe("Sanctuaire — cercle & Mécène (Phase 3a API)", () => {
  it("formatCircleDisplayName : Prénom + initiale", () => {
    expect(formatCircleDisplayName("Marc Dupont")).toBe("Marc D.");
    expect(formatCircleDisplayName("Sophie")).toBe("Sophie");
    expect(formatCircleDisplayName(null, "alice@example.com")).toMatch(/^A/);
  });

  it("roleFromProductKey mappe les empreintes", () => {
    expect(roleFromProductKey("guest_voice")).toBe("voice");
    expect(roleFromProductKey("guest_video")).toBe("video");
    expect(roleFromProductKey("guest_heritage")).toBe("coproducer");
    expect(roleFromProductKey("guest_patron")).toBe("patron");
    expect(roleFromProductKey("guest_candle")).toBe("candle");
  });

  it("mergeCircleEntries déduplique en gardant le rôle le plus élevé", () => {
    const merged = mergeCircleEntries([
      { displayName: "Marc D.", role: "present", at: 1 },
      { displayName: "Marc D.", role: "voice", at: 2 },
      { displayName: "Sophie T.", role: "candle", at: 3 },
    ]);
    expect(merged.find((m) => m.displayName === "Marc D.")?.role).toBe("voice");
    expect(merged).toHaveLength(2);
  });

  it("Mécène : amountCents borné 150–1000 $", () => {
    const patron = getGuestSupportPack("guest_patron")!;
    expect(resolveGuestPackAmountCents(patron, 250_00)).toBe(250_00);
    expect(resolveGuestPackAmountCents(patron, 149_00)).toBeNull();
    expect(resolveGuestPackAmountCents(patron, 1001_00)).toBeNull();
    expect(resolveGuestPackAmountCents(patron)).toBeNull();
  });

  it("packs fixes ignorent amountCents et utilisent priceCents", () => {
    const voice = getGuestSupportPack("guest_voice")!;
    expect(resolveGuestPackAmountCents(voice)).toBe(69_00);
    expect(resolveGuestPackAmountCents(voice, 999_00)).toBe(69_00);
  });

  it("guest_hd déprécié reste résolvable (legacy) mais hors catalogue actif", () => {
    expect(getGuestSupportPack("guest_hd")?.deprecated).toBe(true);
  });
});
