import "server-only";

import { buildFollowUpEmailCopy } from "@/src/lib/email/partnerFollowUpCopy";
import type { InvitationLocale } from "@/src/lib/partner/invitationSchemas";

export async function sendPartnerFollowUpEmail(input: {
  to: string;
  locale: InvitationLocale;
  salonName: string;
  magicLinkUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    return { ok: false, error: "email_not_configured" };
  }

  const copy = buildFollowUpEmailCopy({
    locale: input.locale,
    salonName: input.salonName,
    magicLinkUrl: input.magicLinkUrl,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: copy.subject,
      text: copy.text,
    }),
  });

  if (!response.ok) {
    console.error("[follow-up email] Resend failed:", response.status);
    return { ok: false, error: "email_send_failed" };
  }

  return { ok: true };
}
