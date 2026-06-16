import { Suspense } from "react";

import { LoginForm, type LoginAudience } from "@/src/components/auth/LoginForm";
import type { AppDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";
import type { PartnerPublicBranding } from "@/src/lib/partner/partnerBrandingTypes";

export function AuthConnexionPage({
  lang,
  copy,
  audience,
  salonBranding = null,
  defaultWordmark = "Odyssey",
}: {
  lang: Locale;
  copy: AppDictionary["auth"];
  audience: LoginAudience;
  salonBranding?: PartnerPublicBranding | null;
  defaultWordmark?: string;
}) {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[#020202]" aria-hidden />}
    >
      <LoginForm
        lang={lang}
        copy={copy}
        audience={audience}
        salonBranding={salonBranding}
        defaultWordmark={defaultWordmark}
      />
    </Suspense>
  );
}
