"use client";

import { useEffect, useMemo, useState } from "react";

import { CinematicTeaser } from "@/src/components/tribute/CinematicTeaser";
import {
  SessionArchiveCompare,
  type SessionArchiveCompareCopy,
} from "@/src/components/tribute/SessionArchiveCompare";
import {
  sanctuaryFocusRing,
  wizardMiniCapsAction,
  wizardStepLead,
  wizardStepTitle,
} from "@/src/lib/contribute/sanctuaryChrome";
import { fetchProjectMedia } from "@/src/hooks/useMassMediaUpload";
import {
  mediaApiToMontageItems,
  type MontageMediaItem,
} from "@/src/lib/wizard/montageHelpers";
import {
  buildTeaserFromStoryboard,
  estimateStoryboardFilmDurationMinutes,
  type CinemaChapterTitlesCopy,
} from "@/src/lib/wizard/teaserHelpers";
import { hasPremiumMusicCatalogAccess } from "@/src/lib/wizard/wizardPricing";
import type {
  WizardBasePackage,
  WizardExtensionsState,
  WizardStoryboardState,
} from "@/src/lib/wizard/wizardState";

export type PreviewStepCopy = {
  title: string;
  description: string;
  loadingMedia: string;
  payCta: string;
  /** CTA quand Soft Cap / Héritage déjà engagé (Quiet Luxury). */
  payCtaSoftCap?: string;
  /** Note Soft Cap sous le teaser (valeur Héritage avant checkout). */
  softCapNote?: string;
  editLink: string;
  valueNote: string;
  valueAiRetouch: string;
  valueLicense: string;
  teaserLoading: string;
  teaserEmpty: string;
  teaserNowPlaying: string;
  teaserPlay: string;
  teaserPause: string;
  chapterTitleFallback: string;
  /** Titres cinéma universels + crédit musical. */
  cinemaChapter1: string;
  cinemaChapter2: string;
  cinemaChapter3: string;
  cinemaChapter4: string;
  cinemaChapter5Plus: string;
  trackCredit: string;
  trackCreditTitleOnly: string;
  /** C3 — comparatif Séance vs Archive (Souvenir). */
  sessionArchiveCompare?: SessionArchiveCompareCopy;
  /** Étape 6 — lancer la séance officielle (hub C8). */
  launchSession?: string;
  launchSessionAria?: string;
};

type Props = {
  copy: PreviewStepCopy;
  locale?: "fr" | "en";
  projectId: string | null;
  storyboard: WizardStoryboardState;
  extensions: WizardExtensionsState;
  basePackage?: WizardBasePackage;
  /** Affiche l’ancre Soft Cap (freemium Souvenir + engagement ou dépassement). */
  softCapActive?: boolean;
  /** C3 : montrer Séance vs Archive (typiquement freemium Souvenir). */
  showSessionArchiveCompare?: boolean;
  /** Master inclus (Héritage+) ou déjà sélectionné. */
  archiveIncluded?: boolean;
  salonBadge?: string | null;
  openingPortraitUrl?: string | null;
  memoryCard?: { displayName: string; yearsLine: string } | null;
  onPlaybackComplete?: () => void;
  onProceedToPayment: () => void;
  onKeepArchiveMaster?: () => void;
  onEdit: () => void;
  /** Étape 6 — ouvre la séance officielle (WizardSessionProjection + hub). */
  onLaunchOfficialSession?: () => void;
};

function buildValueNote(
  copy: PreviewStepCopy,
  minutes: number,
  extensions: WizardExtensionsState,
  basePackage: WizardBasePackage = "signature",
): string {
  const hasAi = Boolean(extensions.aiRetouch || extensions.heritagePack);
  const hasLicense = hasPremiumMusicCatalogAccess(basePackage, extensions);

  let note = copy.valueNote.replace("{minutes}", String(minutes));
  if (hasAi) note += copy.valueAiRetouch;
  if (hasLicense) note += copy.valueLicense;
  if (hasAi || hasLicense) note += ".";
  return note;
}

function teaserIdentity(storyboard: WizardStoryboardState): string {
  return storyboard.chapters
    .map((chapter) => {
      const songKey =
        chapter.song?.source === "stingray"
          ? chapter.song.trackId
          : chapter.song?.source === "upload"
            ? chapter.song.storagePath
            : "";
      return `${chapter.id}:${songKey}:${chapter.mediaIds.join(",")}`;
    })
    .join("|");
}

export function PreviewStep({
  copy,
  locale = "fr",
  projectId,
  storyboard,
  extensions,
  basePackage = "signature",
  softCapActive = false,
  showSessionArchiveCompare = false,
  archiveIncluded = false,
  salonBadge = null,
  openingPortraitUrl = null,
  memoryCard = null,
  onPlaybackComplete,
  onProceedToPayment,
  onKeepArchiveMaster,
  onEdit,
  onLaunchOfficialSession,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [mediaById, setMediaById] = useState<Map<string, MontageMediaItem>>(
    () => new Map(),
  );

  const chapterTitles = useMemo((): CinemaChapterTitlesCopy => {
    return {
      chapter1: copy.cinemaChapter1,
      chapter2: copy.cinemaChapter2,
      chapter3: copy.cinemaChapter3,
      chapter4: copy.cinemaChapter4,
      chapter5Plus: copy.cinemaChapter5Plus,
      trackCredit: copy.trackCredit,
      trackCreditTitleOnly: copy.trackCreditTitleOnly,
    };
  }, [
    copy.cinemaChapter1,
    copy.cinemaChapter2,
    copy.cinemaChapter3,
    copy.cinemaChapter4,
    copy.cinemaChapter5Plus,
    copy.trackCredit,
    copy.trackCreditTitleOnly,
  ]);

  const { slides, tracks, chapterMeta } = useMemo(
    () => buildTeaserFromStoryboard(storyboard, mediaById, chapterTitles),
    [chapterTitles, mediaById, storyboard],
  );

  const durationMinutes = useMemo(
    () => estimateStoryboardFilmDurationMinutes(storyboard),
    [storyboard],
  );

  const valueNote = useMemo(
    () => buildValueNote(copy, durationMinutes, extensions, basePackage),
    [basePackage, copy, durationMinutes, extensions],
  );

  const teaserKey = useMemo(() => teaserIdentity(storyboard), [storyboard]);

  const compareActive =
    showSessionArchiveCompare && Boolean(copy.sessionArchiveCompare);

  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      setMediaById(new Map());
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void fetchProjectMedia(projectId)
      .then((items) => {
        if (cancelled) return;
        const mediaItems = mediaApiToMontageItems(items);
        setMediaById(new Map(mediaItems.map((item) => [item.assetId, item])));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <div className="space-y-10 pb-44">
      <header className="space-y-3 text-center md:text-left">
        <h2 className={wizardStepTitle}>{copy.title}</h2>
        <p className={`mx-auto max-w-2xl ${wizardStepLead} md:mx-0`}>
          {copy.description}
        </p>
        {onLaunchOfficialSession && copy.launchSession ? (
          <div className="pt-2">
            <button
              type="button"
              onClick={onLaunchOfficialSession}
              aria-label={copy.launchSessionAria ?? copy.launchSession}
              className={`${wizardMiniCapsAction} mx-auto min-h-[52px] w-full max-w-md rounded-2xl border border-white/20 bg-white/[0.06] px-6 text-base font-medium text-zinc-50 transition-[colors,box-shadow,transform] hover:border-white/35 hover:bg-white/[0.1] hover:shadow-[0_0_28px_rgba(255,255,255,0.08)] active:scale-[0.985] ${sanctuaryFocusRing} md:mx-0`}
            >
              {copy.launchSession}
            </button>
          </div>
        ) : null}
      </header>

      <section className="space-y-5">
        {isLoading ? (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div
              className="pointer-events-none absolute inset-0"
              aria-hidden
              style={{
                background:
                  "radial-gradient(ellipse 80% 70% at 50% 18%, rgba(34,211,238,0.14) 0%, transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.24) 100%)",
              }}
            />
            <div className="flex aspect-video min-h-[18rem] items-center justify-center px-6 text-center">
              <p className="max-w-md text-sm font-light leading-relaxed text-zinc-400 md:text-base">
                {copy.loadingMedia}
              </p>
            </div>
          </div>
        ) : (
          <CinematicTeaser
            key={teaserKey}
            slides={slides}
            tracks={tracks}
            chapterMeta={chapterMeta}
            projectId={projectId}
            copy={{
              loading: copy.teaserLoading,
              nowPlaying: copy.teaserNowPlaying,
              play: copy.teaserPlay,
              pause: copy.teaserPause,
            }}
            emptyLabel={copy.teaserEmpty}
            salonBadge={salonBadge}
            openingPortraitUrl={openingPortraitUrl}
            memoryCard={memoryCard}
            onPlaybackComplete={onPlaybackComplete}
          />
        )}

        <p className="text-center text-sm font-light leading-relaxed text-zinc-400 md:text-left">
          {valueNote}
        </p>
      </section>

      {softCapActive && copy.softCapNote ? (
        <div
          className="rounded-2xl border border-amber-300/20 bg-amber-200/[0.05] px-5 py-4 text-center md:text-left"
          role="status"
        >
          <p className="font-serif text-base leading-snug text-amber-50/95">
            {copy.softCapNote}
          </p>
          <p className="mt-1.5 text-xs font-light text-amber-100/55">
            Odyssey
          </p>
        </div>
      ) : null}

      {compareActive && copy.sessionArchiveCompare ? (
        <SessionArchiveCompare
          copy={copy.sessionArchiveCompare}
          locale={locale}
          archiveIncluded={archiveIncluded}
          onKeepArchive={() => {
            if (onKeepArchiveMaster) onKeepArchiveMaster();
            else onProceedToPayment();
          }}
          onContinue={onProceedToPayment}
        />
      ) : (
        <div className="flex flex-col items-center gap-4 pt-2">
          <button
            type="button"
            onClick={onProceedToPayment}
            className={`${wizardMiniCapsAction} min-h-[56px] w-full max-w-md rounded-2xl border border-teal-400/45 bg-gradient-to-r from-teal-600/35 via-teal-500/30 to-cyan-400/25 px-6 text-base font-semibold text-white shadow-[0_0_56px_rgba(45,212,191,0.3),0_0_40px_rgba(34,211,238,0.2)] transition-all hover:scale-[1.01] hover:shadow-[0_0_64px_rgba(45,212,191,0.38),0_0_48px_rgba(34,211,238,0.28)] ${sanctuaryFocusRing}`}
          >
            {softCapActive && copy.payCtaSoftCap
              ? copy.payCtaSoftCap
              : copy.payCta}
          </button>
        </div>
      )}

      <div className="flex flex-col items-center gap-4 pt-1">
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-light tracking-wide text-zinc-400 underline decoration-zinc-800 underline-offset-4 transition-colors hover:text-zinc-300"
        >
          {copy.editLink}
        </button>
      </div>
    </div>
  );
}
