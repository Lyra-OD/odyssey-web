import { describe, expect, it } from "vitest";

import {
  CreatePartnerInvitationBodySchema,
  FREEMIUM_INVITATION_GRANTED_PACKAGE,
} from "@/src/lib/partner/invitationSchemas";

const TENANT_ID = "00000000-0000-4000-8000-000000000001";

describe("Invitation Salon Souvenir-only", () => {
  it("accepte un body sans grantedPackage", () => {
    const parsed = CreatePartnerInvitationBodySchema.parse({
      familyEmail: "Famille@Exemple.com",
      tenantId: TENANT_ID,
      locale: "fr",
    });

    expect(parsed.familyEmail).toBe("famille@exemple.com");
    expect(parsed.tenantId).toBe(TENANT_ID);
    expect("grantedPackage" in parsed).toBe(false);
  });

  it("ignore grantedPackage client (heritage / signature)", () => {
    const parsed = CreatePartnerInvitationBodySchema.parse({
      familyEmail: "a@b.com",
      tenantId: TENANT_ID,
      grantedPackage: "heritage",
      locale: "en",
    });

    expect("grantedPackage" in parsed).toBe(false);
    expect(FREEMIUM_INVITATION_GRANTED_PACKAGE).toBe("essential");
  });
});
