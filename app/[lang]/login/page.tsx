import { redirect } from "next/navigation";

import type { Locale } from "@/i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";

type PageProps = {
  params: Promise<{ lang: string }>;
};

/** Legacy `/[lang]/login` → connexion studio (famille). */
export default async function LoginPage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  redirect(appRoutes.studioConnexion(lang));
}
