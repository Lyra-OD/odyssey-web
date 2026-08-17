import type { InvitationLocale } from "@/src/lib/partner/invitationSchemas";

export function buildInvitationMagicLinkUrl(
  origin: string,
  locale: InvitationLocale,
  secret: string,
): string {
  return `${origin}/${locale}/invite/accept?token=${encodeURIComponent(secret)}`;
}

export function invitationLocaleFromMetadata(
  metadata: unknown,
): InvitationLocale {
  if (!metadata || typeof metadata !== "object") return "fr";
  const locale = (metadata as { locale?: unknown }).locale;
  return locale === "en" ? "en" : "fr";
}

export function hasInvitationFollowUpBeenSent(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const sentAt = (metadata as { follow_up_sent_at?: unknown }).follow_up_sent_at;
  return typeof sentAt === "string" && sentAt.length > 0;
}

export function mergeInvitationFollowUpMetadata(
  metadata: unknown,
  sentAtIso: string,
): Record<string, unknown> {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  return {
    ...base,
    follow_up_sent_at: sentAtIso,
  };
}
