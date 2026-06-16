import type { ReactNode } from "react";

import { LoginForm, type LoginAudience } from "@/src/components/auth/LoginForm";
import type { AppDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";

export function AuthConnexionPage({
  lang,
  copy,
  audience,
  brandSlot,
  animateConnexion = true,
}: {
  lang: Locale;
  copy: AppDictionary["auth"];
  audience: LoginAudience;
  /** En-tête brandé rendu côté serveur (évite l’hydratation client). */
  brandSlot?: ReactNode;
  animateConnexion?: boolean;
}) {
  return (
    <LoginForm
      lang={lang}
      copy={copy}
      audience={audience}
      brandSlot={brandSlot}
      animateConnexion={animateConnexion}
    />
  );
}
