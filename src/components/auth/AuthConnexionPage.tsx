import { Suspense, type ReactNode } from "react";

import { LoginForm, type LoginAudience } from "@/src/components/auth/LoginForm";
import type { LocaleSwitcherLabels } from "@/src/components/i18n/LocaleSwitcher";
import type { AppDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";

export function AuthConnexionPage({
  lang,
  copy,
  audience,
  brandSlot,
  localeSwitcher,
  animateConnexion = true,
}: {
  lang: Locale;
  copy: AppDictionary["auth"];
  audience: LoginAudience;
  /** En-tête brandé rendu côté serveur (évite l’hydratation client). */
  brandSlot?: ReactNode;
  localeSwitcher: LocaleSwitcherLabels;
  animateConnexion?: boolean;
}) {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[#020202]" aria-hidden />}
    >
      <LoginForm
        lang={lang}
        copy={copy}
        audience={audience}
        brandSlot={brandSlot}
        localeSwitcher={localeSwitcher}
        animateConnexion={animateConnexion}
      />
    </Suspense>
  );
}
