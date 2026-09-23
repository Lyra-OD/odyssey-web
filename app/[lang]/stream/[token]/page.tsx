import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  StreamSessionPlayer,
  type StreamSessionCopy,
} from "@/src/components/tribute/StreamSessionPlayer";
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
    title: lang === "en" ? "Session · Odyssey" : "Séance · Odyssey",
    robots: { index: false, follow: false },
  };
}

/**
 * C14 MVP — séance privée lecture seule (`view_only` token).
 */
export default async function StreamSessionPage({ params }: PageProps) {
  const { lang: routeLang, token: rawToken } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  if (!token) notFound();

  const dictionary = await getDictionary(lang);
  const hub = dictionary.quietLuxuryExitHub;
  const tw = dictionary.tributeWizard;

  const copy: StreamSessionCopy = {
    ...hub,
    teaserPlay: tw.previewTeaserPlay,
    teaserPause: tw.previewTeaserPause,
    teaserLoading: tw.previewTeaserLoading,
    enableSound: tw.watchSessionEnableSound,
    watchSessionClose: tw.watchSessionClose,
  };

  return <StreamSessionPlayer token={token} locale={lang} copy={copy} />;
}
