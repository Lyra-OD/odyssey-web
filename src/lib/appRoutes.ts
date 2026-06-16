import type { Locale } from "@/i18n.config";

/** Chemins applicatifs canoniques (éviter dashboard / partner / partners). */
export const appRoutes = {
  /** Wizard hommage — famille & création B2C directe. */
  studio: (lang: Locale) => `/${lang}/studio`,
  /** Console funérarium — invitations B2B2C, jetons. */
  salon: (lang: Locale) => `/${lang}/salon`,
  /** Connexion famille — inscription autorisée. */
  studioConnexion: (lang: Locale) => `/${lang}/studio/connexion`,
  /** Connexion partenaire — provisionnement admin uniquement. */
  salonConnexion: (lang: Locale) => `/${lang}/salon/connexion`,
  /** @deprecated Alias → studioConnexion (redirect serveur). */
  login: (lang: Locale) => `/${lang}/login`,
  /** Page marketing « devenir partenaire » (≠ salon). */
  partnersMarketing: (lang: Locale) => `/${lang}/partners`,
  inviteAccept: (lang: Locale) => `/${lang}/invite/accept`,
  tributeWelcome: (lang: Locale) => `/${lang}/tribute/welcome`,
} as const;

export function defaultPostAuthPath(lang: Locale): string {
  return appRoutes.studio(lang);
}

export function defaultPartnerPostAuthPath(lang: Locale): string {
  return appRoutes.salon(lang);
}

export function connexionPathForAudience(
  lang: Locale,
  audience: "salon" | "studio",
): string {
  return audience === "salon"
    ? appRoutes.salonConnexion(lang)
    : appRoutes.studioConnexion(lang);
}
