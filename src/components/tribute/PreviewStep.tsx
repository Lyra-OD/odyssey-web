"use client";

import { useEffect, useMemo, useState } from "react";

import { CinematicTeaser } from "@/src/components/tribute/CinematicTeaser";
import { fetchProjectMedia } from "@/src/hooks/useMassMediaUpload";
import { mediaApiToMontageItems } from "@/src/lib/wizard/montageHelpers";
import {
  buildTeaserSlides,
  estimateFilmDurationMinutes,
} from "@/src/lib/wizard/teaserHelpers";
import type {
  WizardActTracks,
  WizardExtensionsState,
  WizardMontageState,
} from "@/src/lib/wizard/wizardState";

export type PreviewStepCopy = {
  title: string;
  description: string;
  loadingMedia: string;
  payCta: string;
  editLink: string;
  valueNote: string;
  valueAiRetouch: string;
  valueLicense: string;
  teaserLoading: string;
  teaserEmpty: string;
  teaserNowPlaying: string;
  teaserPlay: string;
  teaserPause: string;
};

type Props = {
  copy: PreviewStepCopy;
  projectId: string | null;
  montage: WizardMontageState;
  actTracks: WizardActTracks;
  extensions: WizardExtensionsState;
  onProceedToPayment: () => void;
  onEdit: () => void;
};

function buildValueNote(
  copy: PreviewStepCopy,
  minutes: number,
  extensions: WizardExtensionsState,
): string {
  const hasAi = Boolean(extensions.aiRetouch || extensions.heritagePack);
  const hasLicense = Boolean(
    extensions.extendedLicense || extensions.heritagePack,
  );

  let note = copy.valueNote.replace("{minutes}", String(minutes));
  if (hasAi) note += copy.valueAiRetouch;
  if (hasLicense) note += copy.valueLicense;
  if (hasAi || hasLicense) note += ".";
  return note;
}

export function PreviewStep({
  copy,
  projectId,
  montage,
  actTracks,
  extensions,
  onProceedToPayment,
  onEdit,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [slides, setSlides] = useState(() =>
    buildTeaserSlides(montage, new Map()),
  );

  const durationMinutes = useMemo(
    () => estimateFilmDurationMinutes(montage),
    [montage],
  );

  const valueNote = useMemo(
    () => buildValueNote(copy, durationMinutes, extensions),
    [copy, durationMinutes, extensions],
  );

  useEffect(() => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void fetchProjectMedia(projectId)
      .then((items) => {
        if (cancelled) return;
        const mediaItems = mediaApiToMontageItems(items);
        const byId = new Map(mediaItems.map((item) => [item.assetId, item]));
        setSlides(buildTeaserSlides(montage, byId));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, montage]);

  return (
    <div className="space-y-10 pb-44">
      <header className="space-y-3 text-center md:text-left">
        <h2 className="font-[family-name:var(--font-label)] text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {copy.title}
        </h2>
        <p className="mx-auto max-w-2xl text-sm font-light leading-relaxed text-zinc-400 md:mx-0 md:text-base">
          {copy.description}
        </p>
      </header>

      {isLoading ? (
        <div className="flex aspect-video items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02]">
          <p className="text-sm font-light text-zinc-500">{copy.loadingMedia}</p>
        </div>
      ) : (
        <CinematicTeaser
          slides={slides}
          tracks={actTracks}
          copy={{
            loading: copy.teaserLoading,
            empty: copy.teaserEmpty,
            nowPlaying: copy.teaserNowPlaying,
            play: copy.teaserPlay,
            pause: copy.teaserPause,
          }}
        />
      )}

      <p className="text-center text-sm font-light leading-relaxed text-zinc-400 md:text-left">
        {valueNote}
      </p>

      <div className="flex flex-col items-center gap-4 pt-2">
        <button
          type="button"
          onClick={onProceedToPayment}
          className="font-[family-name:var(--font-label)] min-h-[56px] w-full max-w-md rounded-2xl border border-teal-400/45 bg-gradient-to-r from-violet-600/35 via-teal-500/30 to-teal-400/25 px-6 text-base font-semibold text-white shadow-[0_0_56px_rgba(139,92,246,0.3),0_0_40px_rgba(45,212,191,0.25)] transition-all hover:scale-[1.01] hover:shadow-[0_0_64px_rgba(139,92,246,0.38),0_0_48px_rgba(45,212,191,0.32)]"
        >
          {copy.payCta}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-light text-zinc-500 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-zinc-300"
        >
          {copy.editLink}
        </button>
      </div>
    </div>
  );
}
