import { z } from "zod";

import type { Locale } from "@/i18n.config";

const OPTIONAL_LINE = "—";

export const PartnerLeadBodySchema = z
  .object({
    organization: z.string().trim().min(1).max(200),
    contactName: z.string().trim().min(1).max(120),
    email: z
      .string()
      .trim()
      .min(3)
      .max(320)
      .email()
      .transform((value) => value.toLowerCase()),
    phone: z.string().trim().max(40).optional().default(""),
    region: z.string().trim().max(120).optional().default(""),
    context: z.string().trim().max(1000).optional().default(""),
    message: z.string().trim().min(1).max(4000),
    locale: z.enum(["fr", "en"]).default("fr"),
    website: z.string().max(200).optional().default(""),
  })
  .strict();

export type PartnerLeadBody = z.infer<typeof PartnerLeadBodySchema>;

export const PartnerLeadResponseSchema = z
  .object({
    ok: z.literal(true),
  })
  .strict();

export function isPartnerLeadHoneypot(website: string | undefined): boolean {
  return Boolean(website && website.trim().length > 0);
}

function dash(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : OPTIONAL_LINE;
}

export type PartnerLeadEmailCopy = {
  subject: string;
  text: string;
};

/**
 * Canon copy : docs/COMMUNICATIONS_MVP.md §4.
 * Interne HQ — pas un mail famille. Pas d’accusé auto vers le salon.
 */
export function buildPartnerLeadEmailCopy(
  lead: Omit<PartnerLeadBody, "website">,
  locale: Locale,
): PartnerLeadEmailCopy {
  const organization = lead.organization.trim() || OPTIONAL_LINE;
  const contactName = dash(lead.contactName);
  const email = dash(lead.email);
  const phone = dash(lead.phone);
  const region = dash(lead.region);
  const context = dash(lead.context);
  const message = lead.message.trim() || OPTIONAL_LINE;

  if (locale === "en") {
    return {
      subject: `Salon lead — ${organization}`,
      text: [
        `A salon wrote in from the partners form.`,
        ``,
        `Organization: ${organization}`,
        `Contact: ${contactName}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        `Region: ${region}`,
        `Context: ${context}`,
        ``,
        `Message:`,
        message,
      ].join("\n"),
    };
  }

  return {
    subject: `Lead salon — ${organization}`,
    text: [
      `Un salon a écrit depuis le formulaire partenaires.`,
      ``,
      `Organisation : ${organization}`,
      `Contact : ${contactName}`,
      `E-mail : ${email}`,
      `Téléphone : ${phone}`,
      `Région : ${region}`,
      `Contexte : ${context}`,
      ``,
      `Message :`,
      message,
    ].join("\n"),
  };
}

export function parseHqLeadRecipients(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.includes("@"));
}

export const PARTNER_LEAD_RATE_WINDOW_MS = 15 * 60 * 1000;
export const PARTNER_LEAD_RATE_MAX = 3;
