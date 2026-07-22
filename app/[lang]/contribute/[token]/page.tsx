import type { Metadata } from "next";

import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";
import { SanctuaryLanding } from "@/src/components/contribute/SanctuaryLanding";
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
        ? "Sanctuary — Odyssey"
        : "Sanctuaire — Odyssey",
    description:
      lang === "en"
        ? "Leave a memory in this tribute sanctuary."
        : "Laissez un souvenir dans ce sanctuaire d'hommage.",
    robots: { index: false, follow: false },
  };
}

/**
 * Page publique Sanctuaire (Boucle Virale) — token opaque, sans auth.
 * Tunnel Quiet Luxury : dépôt gratuit d'abord, empreintes ensuite.
 */
export default async function ContributeSanctuaryPage({ params }: PageProps) {
  const { lang: routeLang, token: rawToken } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const token = typeof rawToken === "string" ? rawToken.trim() : "";

  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#020202] px-6 text-zinc-100">
        <div className="mx-auto flex max-w-[16rem] scale-[0.82] origin-center justify-center">
          <OdysseyConnexionMark wordmark="Odyssey" animate />
        </div>
        <p className="mt-10 text-center text-sm font-light text-white/55">
          {lang === "en"
            ? "This Sanctuary link is incomplete."
            : "Ce lien de Sanctuaire est incomplet."}
        </p>
        <footer className="mt-16 flex flex-col items-center gap-1 text-center">
          <p className="text-[8px] font-medium uppercase tracking-[0.44em] text-white/26">
            {lang === "en" ? "Powered by" : "Propulsé par"}
          </p>
          <p className="font-brand text-[10px] font-medium uppercase tracking-[0.28em] text-white/36">
            Odyssey
          </p>
        </footer>
      </main>
    );
  }

  return <SanctuaryLanding token={token} locale={lang} />;
}
