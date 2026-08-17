import type { InvitationLocale } from "@/src/lib/partner/invitationSchemas";

export type FollowUpEmailCopy = {
  subject: string;
  text: string;
};

/**
 * Canon copy : docs/COMMUNICATIONS_MVP.md §1.
 * Pas de prix, pas d’urgence, le salon signe.
 */
export function buildFollowUpEmailCopy(input: {
  locale: InvitationLocale;
  salonName: string;
  magicLinkUrl: string;
}): FollowUpEmailCopy {
  const salon = input.salonName.trim() || "Odyssey";

  if (input.locale === "en") {
    return {
      subject: `${salon} prepared a private space for your family`,
      text: [
        `Hello,`,
        ``,
        `There is no hurry. ${salon} opened a quiet place for you —`,
        `to tell a story when you are ready.`,
        ``,
        `This link is personal. It remains open for 14 days.`,
        ``,
        input.magicLinkUrl,
        ``,
        `With care,`,
        salon,
      ].join("\n"),
    };
  }

  return {
    subject: `${salon} vous a préparé un espace privé`,
    text: [
      `Bonjour,`,
      ``,
      `Il n’y a rien à précipiter. ${salon} a ouvert pour vous un lieu discret,`,
      `pour raconter une histoire quand vous serez prêts.`,
      ``,
      `Ce lien est personnel. Il demeure ouvert 14 jours.`,
      ``,
      input.magicLinkUrl,
      ``,
      `Avec soin,`,
      salon,
    ].join("\n"),
  };
}
