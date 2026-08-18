import "server-only";

import {
  buildPartnerLeadEmailCopy,
  parseHqLeadRecipients,
  type PartnerLeadBody,
} from "@/src/lib/partners/partnerLead";
import type { Locale } from "@/i18n.config";

export async function sendPartnerLeadEmail(input: {
  lead: Omit<PartnerLeadBody, "website">;
  locale: Locale;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to = parseHqLeadRecipients(process.env.ODYSSEY_HQ_LEAD_EMAIL);

  if (!apiKey || !from || to.length === 0) {
    return { ok: false, error: "email_not_configured" };
  }

  const copy = buildPartnerLeadEmailCopy(input.lead, input.locale);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: copy.subject,
      text: copy.text,
    }),
  });

  if (!response.ok) {
    console.error("[partner lead email] Resend failed:", response.status);
    return { ok: false, error: "email_send_failed" };
  }

  return { ok: true };
}
