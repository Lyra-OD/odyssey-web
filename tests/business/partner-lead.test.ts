import { describe, expect, it } from "vitest";

import {
  PartnerLeadBodySchema,
  buildPartnerLeadEmailCopy,
  isPartnerLeadHoneypot,
  parseHqLeadRecipients,
} from "@/src/lib/partners/partnerLead";

const valid = {
  organization: "Salon Urgel",
  contactName: "Marie Dupont",
  email: "marie@urgel.com",
  phone: "514-555-0100",
  region: "Montréal",
  context: "3 conseillers",
  message: "Nous aimerions un pilote.",
  locale: "fr" as const,
};

describe("PartnerLeadBodySchema", () => {
  it("normalise l’e-mail et accepte les champs optionnels vides", () => {
    const parsed = PartnerLeadBodySchema.parse({
      ...valid,
      email: "  Marie@Urgel.COM ",
      phone: "",
      website: "",
    });
    expect(parsed.email).toBe("marie@urgel.com");
    expect(parsed.phone).toBe("");
  });

  it("refuse un e-mail invalide et un message vide", () => {
    expect(() =>
      PartnerLeadBodySchema.parse({ ...valid, email: "pas-un-email" }),
    ).toThrow();
    expect(() =>
      PartnerLeadBodySchema.parse({ ...valid, message: "   " }),
    ).toThrow();
  });
});

describe("buildPartnerLeadEmailCopy", () => {
  it("suit le canon FR/EN sans prix ni urgence", () => {
    const fr = buildPartnerLeadEmailCopy(valid, "fr");
    const en = buildPartnerLeadEmailCopy({ ...valid, locale: "en" }, "en");
    const haystack = `${fr.subject}\n${fr.text}\n${en.subject}\n${en.text}`;

    expect(fr.subject).toBe("Lead salon — Salon Urgel");
    expect(en.subject).toBe("Salon lead — Salon Urgel");
    expect(fr.text).toContain("marie@urgel.com");
    expect(en.text).toContain("Organization: Salon Urgel");
    expect(haystack).not.toMatch(/\$/);
    expect(haystack).not.toMatch(/179/);
    expect(haystack).not.toMatch(/last chance/i);
    expect(haystack).not.toMatch(/upgrade/i);
  });

  it("met un tiret sur les champs optionnels vides", () => {
    const copy = buildPartnerLeadEmailCopy(
      { ...valid, phone: "", region: "", context: "" },
      "fr",
    );
    expect(copy.text).toContain("Téléphone : —");
    expect(copy.text).toContain("Région : —");
    expect(copy.text).toContain("Contexte : —");
  });
});

describe("isPartnerLeadHoneypot", () => {
  it("écarte un bot qui remplit website", () => {
    expect(isPartnerLeadHoneypot("https://spam.test")).toBe(true);
    expect(isPartnerLeadHoneypot("")).toBe(false);
    expect(isPartnerLeadHoneypot("  ")).toBe(false);
  });
});

describe("parseHqLeadRecipients", () => {
  it("sépare une liste d’e-mails HQ", () => {
    expect(parseHqLeadRecipients("ops@odyssey.test, hq@odyssey.test")).toEqual([
      "ops@odyssey.test",
      "hq@odyssey.test",
    ]);
    expect(parseHqLeadRecipients("")).toEqual([]);
    expect(parseHqLeadRecipients(undefined)).toEqual([]);
  });
});
