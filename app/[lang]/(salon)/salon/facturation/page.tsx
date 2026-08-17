import { redirect } from "next/navigation";

import type { Locale } from "@/i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
};

/** Jetons morts — l’ancienne facturation pointe vers le dashboard commissions. */
export default async function SalonFacturationRedirectPage({ params }: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";

  redirect(appRoutes.salonCommissions(lang));
}
