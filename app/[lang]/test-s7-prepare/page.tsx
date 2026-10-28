import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/dictionaries";
import { TestS7PrepareLab } from "@/src/components/media/TestS7PrepareLab";
import type { Locale } from "@/i18n.config";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  return {
    title:
      lang === "en"
        ? "Test S7 prepare · Odyssey"
        : "Test S7 prepare · Odyssey",
    robots: { index: false, follow: false },
  };
}

/**
 * Lab S7 — prepareVideoForUpload + Commit 8 modale trim.
 * URL : `/fr/test-s7-prepare` · dev only (404 en production).
 * Isolé : pas de Coffre / upload.
 */
export default async function TestS7PreparePage({ params }: PageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const { lang: routeLang } = await params;
  const lang: Locale = routeLang === "en" ? "en" : "fr";
  const dictionary = await getDictionary(lang);
  const tw = dictionary.tributeWizard;

  return (
    <TestS7PrepareLab
      trimCopy={{
        title: tw.videoTrimTitle,
        hint: tw.videoTrimHint,
        previewHint: tw.videoTrimPreviewHint,
        filmstripLabel: tw.videoTrimFilmstripLabel,
        startLabel: tw.videoTrimStartLabel,
        endLabel: tw.videoTrimEndLabel,
        fixedDurationLabel: tw.videoTrimFixedDuration,
        confirm: tw.videoTrimConfirm,
        cancel: tw.videoTrimCancel,
        closeAria: tw.videoTrimCloseAria,
        filmstripAria: tw.videoTrimFilmstripAria,
        play: tw.videoTrimPlay,
        pause: tw.videoTrimPause,
        playAria: tw.videoTrimPlayAria,
        pauseAria: tw.videoTrimPauseAria,
      }}
    />
  );
}
