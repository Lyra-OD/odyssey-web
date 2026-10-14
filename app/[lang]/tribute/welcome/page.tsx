import { redirect } from "next/navigation";

import { appRoutes } from "@/src/lib/appRoutes";
import type { Locale } from "@/i18n.config";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ projectId?: string | string[] }>;
};

/** Anciens liens post-invitation : le Studio est la seule coquille du wizard. */
export default async function TributeWelcomePage({
  params,
  searchParams,
}: PageProps) {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const raw = (await searchParams).projectId;
  const projectId = (Array.isArray(raw) ? raw[0] : raw)?.trim();

  redirect(
    projectId
      ? `${appRoutes.studio(lang)}?projectId=${encodeURIComponent(projectId)}`
      : appRoutes.studio(lang),
  );
}
