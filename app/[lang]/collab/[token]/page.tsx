import type { Metadata } from "next";

import { CollabRedeemClient } from "@/src/components/collab/CollabRedeemClient";
import type { Locale } from "@/i18n.config";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string; token: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  return {
    title:
      lang === "en"
        ? "Co-creator access — Odyssey"
        : "Accès Co-Créateur — Odyssey",
    robots: { index: false, follow: false },
  };
}

/**
 * Entrée Co-Créateur — redeem token → cookie httpOnly → redirect /studio.
 * URL Studio reste propre (pas de ?collab_token=).
 */
export default async function CollabRedeemPage({ params }: PageProps) {
  const { lang: routeLang, token: rawToken } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const token = typeof rawToken === "string" ? rawToken.trim() : "";

  return <CollabRedeemClient token={token} locale={lang} />;
}
