import type { InvitationLocale } from "@/src/lib/partner/invitationSchemas";

export type FollowUpEmailCopy = {
  subject: string;
  text: string;
};

export function buildFollowUpEmailCopy(input: {
  locale: InvitationLocale;
  salonName: string;
  magicLinkUrl: string;
}): FollowUpEmailCopy {
  const salon = input.salonName.trim() || "Odyssey";

  if (input.locale === "en") {
    return {
      subject: `${salon} prepared a digital sanctuary for your family`,
      text: [
        `Hello,`,
        ``,
        `${salon} opened a private space to tell a loved one's story.`,
        `This link is personal. It expires in 14 days.`,
        ``,
        input.magicLinkUrl,
      ].join("\n"),
    };
  }

  return {
    subject: `${salon} a préparé un écrin numérique pour votre famille`,
    text: [
      `Bonjour,`,
      ``,
      `${salon} vous a ouvert un espace privé pour raconter une histoire.`,
      `Ce lien est personnel. Il expire dans 14 jours.`,
      ``,
      input.magicLinkUrl,
    ].join("\n"),
  };
}
