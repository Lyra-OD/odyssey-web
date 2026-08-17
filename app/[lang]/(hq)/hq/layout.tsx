import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import type { Locale } from "@/i18n.config";
import { getDictionary } from "@/lib/dictionaries";
import { appRoutes } from "@/src/lib/appRoutes";
import { sanitizeHqNextPath } from "@/src/lib/auth/sanitizeNextPath";
import { isListedOnHqAllowlist } from "@/src/lib/hq/isOdysseyOperator";
import { resolveSalonLayoutAccess } from "@/src/lib/partner/resolveSalonLayoutAccess";
import { createClient } from "@/utils/supabase/server";

import { HqShell } from "./components/HqShell";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function HqLayout({ children, params }: LayoutProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const pathname = headers().get("x-odyssey-pathname");
    const nextPath = sanitizeHqNextPath(pathname) ?? appRoutes.hq(lang);
    redirect(appRoutes.hqConnexionWithParams(lang, { next: nextPath }));
  }

  if (!(await isListedOnHqAllowlist(supabase, user.id))) {
    const salonAccess = await resolveSalonLayoutAccess(supabase, user.id);
    if (salonAccess.ok) {
      redirect(appRoutes.salon(lang));
    }
    redirect(`/${lang}`);
  }

  return (
    <HqShell
      lang={lang}
      signOutLabel={dictionary.dashboard.signOut}
      localeSwitcher={{
        languageLabel: dictionary.header.languageLabel,
        langOptionFr: dictionary.header.langOptionFr,
        langOptionEn: dictionary.header.langOptionEn,
      }}
    >
      {children}
    </HqShell>
  );
}
