"use client";

/**
 * C14 — Hydrateur `/stream/[token]` → WizardSessionProjection (guest · prebuilt).
 */

import { useCallback, useEffect, useState } from "react";

import {
  WizardSessionProjection,
  type WizardSessionHubCopy,
  type WizardSessionPrebuiltPayload,
} from "@/src/components/tribute/WizardSessionProjection";
import type { QuietLuxuryExitHubCopy } from "@/src/components/tribute/QuietLuxuryExitHub";
import type {
  TeaserChapterMeta,
  TeaserSlide,
  TeaserTracks,
} from "@/src/lib/wizard/teaserHelpers";

export type StreamSessionCopy = QuietLuxuryExitHubCopy & {
  guestCopyUnlocking: string;
  guestCopyStubBody: string;
  lueurModalTitle: string;
  lueurModalBody: string;
  lueurModalClose: string;
  streamLoading: string;
  streamUnavailable: string;
  streamEmpty: string;
  teaserPlay: string;
  teaserPause: string;
  teaserLoading: string;
  enableSound: string;
  watchSessionClose: string;
};

type StreamPayload = WizardSessionPrebuiltPayload & {
  memoryCard: { displayName: string; yearsLine: string };
  openingPortraitUrl: string | null;
  slides: TeaserSlide[];
  tracks: TeaserTracks;
  chapterMeta: Record<string, TeaserChapterMeta>;
  chapterOrder?: string[];
};

type Props = {
  token: string;
  locale: "fr" | "en";
  copy: StreamSessionCopy;
};

function placeholderOrganizerFields(
  copy: StreamSessionCopy,
): Pick<
  WizardSessionHubCopy,
  | "checkoutModalTitle"
  | "checkoutModalBody"
  | "checkoutModalClose"
  | "archiveUnlockError"
  | "archiveIncludedTitle"
  | "archiveIncludedBody"
  | "archiveIncludedCta"
  | "archiveIncludedUnlocking"
  | "archiveFinalizeTitle"
  | "archiveFinalizeBody"
  | "archiveFinalizeCta"
  | "archiveFinalizeUnlocking"
  | "masterSuccessNotice"
  | "masterCancelNotice"
  | "noticeDismiss"
  | "shareModalTitle"
  | "shareLinkLabel"
  | "shareLinkLoading"
  | "shareLinkError"
  | "shareCopy"
  | "shareCopied"
  | "shareNative"
  | "shareClose"
  | "heritageModalTitle"
  | "heritageModalBody"
  | "heritageModalClose"
> {
  // Invité : champs organiseur non affichés — valeurs neutres pour typer le hub.
  const dash = "—";
  return {
    checkoutModalTitle: dash,
    checkoutModalBody: dash,
    checkoutModalClose: copy.closeAria,
    archiveUnlockError: dash,
    archiveIncludedTitle: dash,
    archiveIncludedBody: dash,
    archiveIncludedCta: dash,
    archiveIncludedUnlocking: copy.guestCopyUnlocking,
    archiveFinalizeTitle: dash,
    archiveFinalizeBody: dash,
    archiveFinalizeCta: dash,
    archiveFinalizeUnlocking: copy.guestCopyUnlocking,
    masterSuccessNotice: dash,
    masterCancelNotice: dash,
    noticeDismiss: copy.closeAria,
    shareModalTitle: dash,
    shareLinkLabel: dash,
    shareLinkLoading: dash,
    shareLinkError: dash,
    shareCopy: dash,
    shareCopied: dash,
    shareNative: dash,
    shareClose: copy.closeAria,
    heritageModalTitle: dash,
    heritageModalBody: dash,
    heritageModalClose: copy.closeAria,
  };
}

export function StreamSessionPlayer({ token, locale, copy }: Props) {
  const [payload, setPayload] = useState<StreamPayload | null>(null);
  const [error, setError] = useState<"unavailable" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/stream/${encodeURIComponent(token)}?lang=${locale}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("unavailable");
        return (await res.json()) as StreamPayload & { ok?: boolean };
      })
      .then((data) => {
        if (cancelled) return;
        setPayload(data);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError("unavailable");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale, token]);

  const onClose = useCallback(() => {
    window.history.length > 1
      ? window.history.back()
      : (window.location.href = `/${locale}`);
  }, [locale]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#000000] px-6 text-sm font-light text-zinc-500">
        {copy.streamLoading}
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#000000] px-6 text-center text-sm font-light text-zinc-400">
        {copy.streamUnavailable}
      </div>
    );
  }

  if (payload.slides.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#000000] px-6 text-center text-sm font-light text-zinc-400">
        {copy.streamEmpty}
      </div>
    );
  }

  const hubCopy: WizardSessionHubCopy = {
    headline: copy.headline,
    replay: copy.replay,
    share: copy.share,
    archiveTitle: copy.archiveTitle,
    archiveBody: copy.archiveBody,
    archiveCta: copy.archiveCta,
    archiveUnlocking: copy.guestCopyUnlocking,
    guestCopyTitle: copy.guestCopyTitle,
    guestCopyBody: copy.guestCopyBody,
    guestCopyCta: copy.guestCopyCta,
    lueur: copy.lueur,
    lineage: copy.lineage,
    closeAria: copy.closeAria,
    guestCopyStubBody: copy.guestCopyStubBody,
    lueurModalTitle: copy.lueurModalTitle,
    lueurModalBody: copy.lueurModalBody,
    lueurModalClose: copy.lueurModalClose,
    ...placeholderOrganizerFields(copy),
  };

  return (
    <WizardSessionProjection
      intent="official_session"
      playback="prebuilt"
      viewerRole="guest"
      locale={locale}
      memoryCard={payload.memoryCard}
      openingPortraitUrl={payload.openingPortraitUrl}
      primedAudio={null}
      closeLabel={copy.watchSessionClose}
      enableSound={copy.enableSound}
      emptyLabel={copy.streamEmpty}
      loadingLabel={copy.streamLoading}
      teaserPlay={copy.teaserPlay}
      teaserPause={copy.teaserPause}
      teaserLoading={copy.teaserLoading}
      hubCopy={hubCopy}
      prebuilt={{
        slides: payload.slides,
        tracks: payload.tracks,
        chapterMeta: payload.chapterMeta,
        chapterOrder: payload.chapterOrder,
      }}
      onClose={onClose}
    />
  );
}
