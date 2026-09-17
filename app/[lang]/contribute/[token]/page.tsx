import type { Metadata } from "next";
import { cookies } from "next/headers";

import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";
import { SanctuaryGuestEntry } from "@/src/components/contribute/SanctuaryGuestEntry";
import { GUEST_SKY_STILL_SRC } from "@/src/lib/contribute/guestSkyStill";
import { loadSanctuaryContext } from "@/src/lib/contribute/loadSanctuaryContext";
import {
  isSanctuarySkyPreview,
  isSanctuaryVisualPreview,
} from "@/src/lib/contribute/sanctuaryPreview";
import { getDictionary } from "@/lib/dictionaries";
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
    title: lang === "en" ? "Sanctuary · Odyssey" : "Sanctuaire · Odyssey",
    description:
      lang === "en"
        ? "Leave a memory in this tribute sanctuary."
        : "Laissez un souvenir dans ce sanctuaire d'hommage.",
    robots: { index: false, follow: false },
  };
}

/**
 * Page publique Sanctuaire — HTML ciel d’abord (comme Scanner).
 * Le rituel / WebGL part après le premier paint.
 */
export default async function ContributeSanctuaryPage({ params }: PageProps) {
  const { lang: routeLang, token: rawToken } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  const dictionary = await getDictionary(lang);
  const copy = dictionary.sanctuary;
  const [dictFr, dictEn] = await Promise.all([
    lang === "fr" ? Promise.resolve(dictionary) : getDictionary("fr"),
    lang === "en" ? Promise.resolve(dictionary) : getDictionary("en"),
  ]);

  if (!token) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#020202] px-6 text-zinc-100">
        <div className="mx-auto flex max-w-[16rem] origin-center scale-[0.82] justify-center">
          <OdysseyConnexionMark wordmark={copy.brandWordmark} animate />
        </div>
        <p className="mt-10 text-center text-sm font-light text-white/55">
          {copy.errorBody}
        </p>
      </main>
    );
  }

  const cookieHeader = cookies()
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const preview =
    isSanctuaryVisualPreview(token) || isSanctuarySkyPreview(token);
  const loaded = preview
    ? { ok: false as const }
    : await loadSanctuaryContext({
        token,
        locale: lang,
        cookieHeader,
      });

  return (
    <>
      <link rel="preload" as="image" href={GUEST_SKY_STILL_SRC} />
      <SanctuaryGuestEntry
        token={token}
        locale={lang}
        copyFr={dictFr.sanctuary}
        copyEn={dictEn.sanctuary}
        initial={loaded.ok ? loaded.data : null}
        errorMessage={loaded.ok || preview ? null : copy.errorBody}
      />
    </>
  );
}
