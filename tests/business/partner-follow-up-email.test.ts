import { describe, expect, it } from "vitest";

import { buildFollowUpEmailCopy } from "@/src/lib/email/partnerFollowUpCopy";
import {
  hasInvitationFollowUpBeenSent,
  mergeInvitationFollowUpMetadata,
} from "@/src/lib/partner/invitationMagicLink";

describe("buildFollowUpEmailCopy", () => {
  const copy = buildFollowUpEmailCopy({
    locale: "fr",
    salonName: "Salon Urgel",
    magicLinkUrl: "https://odyssey.test/fr/invite/accept?token=abc",
  });

  it("n’inclut ni prix ni montant", () => {
    const haystack = `${copy.subject}\n${copy.text}`;
    expect(haystack).not.toMatch(/\$/);
    expect(haystack).not.toMatch(/179/);
    expect(haystack).not.toMatch(/CAD/i);
    expect(haystack).not.toMatch(/last chance/i);
    expect(haystack).not.toMatch(/n’enverra pas/i);
    expect(haystack).not.toMatch(/will not send another/i);
  });

  it("porte le nom du salon et le lien", () => {
    expect(copy.subject).toContain("Salon Urgel");
    expect(copy.text).toContain(
      "https://odyssey.test/fr/invite/accept?token=abc",
    );
  });
});

describe("invitation follow-up metadata", () => {
  it("détecte un rappel déjà envoyé", () => {
    expect(hasInvitationFollowUpBeenSent(null)).toBe(false);
    expect(hasInvitationFollowUpBeenSent({})).toBe(false);
    expect(
      hasInvitationFollowUpBeenSent({
        follow_up_sent_at: "2026-08-17T12:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("préserve locale et packageId", () => {
    const merged = mergeInvitationFollowUpMetadata(
      { locale: "fr", packageId: "SOUVENIR", createdBy: "user-1" },
      "2026-08-17T12:00:00.000Z",
    );
    expect(merged.locale).toBe("fr");
    expect(merged.packageId).toBe("SOUVENIR");
    expect(merged.follow_up_sent_at).toBe("2026-08-17T12:00:00.000Z");
  });
});
