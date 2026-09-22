"use client";

/**
 * Tranche 1 — séance cinéma depuis le Wizard (draft réel).
 * Pont teaserHelpers / CinematicTeaser · fullscreen natif · zéro Stripe.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

import { CinematicTeaser } from "@/src/components/tribute/CinematicTeaser";
import type { QuietLuxuryExitHubCopy } from "@/src/components/tribute/QuietLuxuryExitHub";
import {
  exitNativeFullscreen,
  isNativeFullscreen,
} from "@/src/components/tribute/QuietLuxuryPlayer";
import { fetchProjectMedia } from "@/src/hooks/useMassMediaUpload";
import { mediaApiToMontageItems } from "@/src/lib/wizard/montageHelpers";
import { buildTeaserFromStoryboard } from "@/src/lib/wizard/teaserHelpers";
import type { CinemaChapterTitlesCopy } from "@/src/lib/wizard/teaserHelpers";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

export type WizardSessionHubCopy = QuietLuxuryExitHubCopy & {
  checkoutModalTitle: string;
  checkoutModalBody: string;
  checkoutModalClose: string;
  shareModalTitle: string;
  shareLinkLabel: string;
  shareCopy: string;
  shareCopied: string;
  shareNative: string;
  shareClose: string;
  heritageModalTitle: string;
  heritageModalBody: string;
  heritageModalClose: string;
};

type OverlayKind = "checkout" | "share" | "heritage" | null;

type Props = {
  projectId: string | null;
  storyboard: WizardStoryboardState;
  chapterTitles: CinemaChapterTitlesCopy;
  memoryCard: { displayName: string; yearsLine: string };
  openingPortraitUrl?: string | null;
  salonBadge?: string | null;
  primedAudio: HTMLAudioElement | null;
  locale: "fr" | "en";
  closeLabel: string;
  enableSound: string;
  emptyLabel: string;
  loadingLabel: string;
  teaserPlay: string;
  teaserPause: string;
  teaserLoading: string;
  hubCopy: WizardSessionHubCopy;
  onClose: () => void;
};

function SimOverlay({
  title,
  body,
  closeLabel,
  onClose,
  children,
}: {
  title: string;
  body: string;
  closeLabel: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <div
      className="absolute inset-0 z-[70] flex items-center justify-center bg-black/70 px-6"
      role="dialog"
      aria-modal
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-sm border border-white/15 bg-[#0a0a0a] px-6 py-6">
        <p className="font-editorial text-lg font-medium tracking-wide text-zinc-100">
          {title}
        </p>
        <p className="mt-3 text-[13px] font-light leading-relaxed text-zinc-400">
          {body}
        </p>
        {children}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 text-[12px] font-light tracking-[0.14em] text-zinc-300 underline decoration-white/25 underline-offset-4 hover:text-zinc-100"
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
}

export function WizardSessionProjection({
  projectId,
  storyboard,
  chapterTitles,
  memoryCard,
  openingPortraitUrl = null,
  salonBadge = null,
  primedAudio,
  locale,
  closeLabel,
  enableSound,
  emptyLabel,
  loadingLabel,
  teaserPlay,
  teaserPause,
  teaserLoading,
  hubCopy,
  onClose,
}: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [mediaById, setMediaById] = useState(
    () => new Map<string, ReturnType<typeof mediaApiToMontageItems>[number]>(),
  );
  const [overlay, setOverlay] = useState<OverlayKind>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined" ? window.location.href : `/${locale}/studio`;

  const { slides, tracks, chapterMeta } = useMemo(
    () => buildTeaserFromStoryboard(storyboard, mediaById, chapterTitles),
    [chapterTitles, mediaById, storyboard],
  );

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

  const closeProjection = useCallback(() => {
    void exitNativeFullscreen();
    onClose();
  }, [onClose]);

  useEffect(() => {
    document.documentElement.setAttribute("data-odyssey-cinema", "1");
    return () => {
      document.documentElement.removeAttribute("data-odyssey-cinema");
    };
  }, []);

  const didEnterFullscreenRef = useRef(false);

  useEffect(() => {
    didEnterFullscreenRef.current = isNativeFullscreen();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeProjection();
      }
    };
    const onFs = () => {
      if (isNativeFullscreen()) {
        didEnterFullscreenRef.current = true;
        return;
      }
      if (didEnterFullscreenRef.current) onClose();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("webkitfullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    };
  }, [closeProjection, onClose]);

  const hubFields: QuietLuxuryExitHubCopy = {
    headline: hubCopy.headline,
    replay: hubCopy.replay,
    share: hubCopy.share,
    archiveTitle: hubCopy.archiveTitle,
    archiveBody: hubCopy.archiveBody,
    archiveCta: hubCopy.archiveCta,
    guestCopyTitle: hubCopy.guestCopyTitle,
    guestCopyBody: hubCopy.guestCopyBody,
    guestCopyCta: hubCopy.guestCopyCta,
    lueur: hubCopy.lueur,
    lineage: hubCopy.lineage,
    closeAria: hubCopy.closeAria,
  };

  return (
    <div className="fixed inset-0 z-[80] bg-[#000000] text-zinc-100">
      <button
        type="button"
        onClick={closeProjection}
        aria-label={closeLabel}
        className="absolute right-4 top-4 z-[90] flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-zinc-300 transition-colors hover:border-white/30 hover:text-zinc-50 md:right-6 md:top-6"
      >
        <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      </button>

      {isLoading ? (
        <div className="flex h-full items-center justify-center px-6 text-sm font-light text-zinc-500">
          {loadingLabel}
        </div>
      ) : (
        <CinematicTeaser
          cinema
          primedAudio={primedAudio}
          autoPlay
          slides={slides}
          tracks={tracks}
          chapterMeta={chapterMeta}
          projectId={projectId}
          openingPortraitUrl={openingPortraitUrl}
          memoryCard={memoryCard}
          salonBadge={salonBadge}
          emptyLabel={emptyLabel}
          enableSound={enableSound}
          copy={{
            loading: teaserLoading,
            nowPlaying: "",
            play: teaserPlay,
            pause: teaserPause,
          }}
          exitHub={{
            copy: hubFields,
            viewerRole: "organizer",
            onUnlockMaster: () => {
              console.info("[wizard-session] onUnlockMaster (simulé)");
              setOverlay("checkout");
            },
            onShareSession: () => {
              console.info("[wizard-session] onShareSession (simulé)");
              setShareCopied(false);
              setOverlay("share");
            },
            onUpgradePackage: () => {
              console.info("[wizard-session] onUpgradePackage (simulé)");
              setOverlay("heritage");
            },
          }}
          className="h-full w-full"
        />
      )}

      {overlay === "checkout" ? (
        <SimOverlay
          title={hubCopy.checkoutModalTitle}
          body={hubCopy.checkoutModalBody}
          closeLabel={hubCopy.checkoutModalClose}
          onClose={() => setOverlay(null)}
        />
      ) : null}

      {overlay === "share" ? (
        <SimOverlay
          title={hubCopy.shareModalTitle}
          body={hubCopy.shareLinkLabel}
          closeLabel={hubCopy.shareClose}
          onClose={() => setOverlay(null)}
        >
          <p className="mt-4 break-all rounded-sm border border-white/10 bg-black/40 px-3 py-2 text-[11px] font-light text-zinc-400">
            {shareUrl}
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard
                  .writeText(shareUrl)
                  .then(() => setShareCopied(true))
                  .catch(() => setShareCopied(false));
              }}
              className="text-[12px] font-light tracking-[0.14em] text-zinc-200 underline decoration-white/25 underline-offset-4"
            >
              {shareCopied ? hubCopy.shareCopied : hubCopy.shareCopy}
            </button>
            {typeof navigator !== "undefined" &&
            typeof navigator.share === "function" ? (
              <button
                type="button"
                onClick={() => {
                  void navigator
                    .share({ title: hubCopy.shareModalTitle, url: shareUrl })
                    .catch(() => {
                      /* annulé */
                    });
                }}
                className="text-[12px] font-light tracking-[0.14em] text-zinc-200 underline decoration-white/25 underline-offset-4"
              >
                {hubCopy.shareNative}
              </button>
            ) : null}
          </div>
        </SimOverlay>
      ) : null}

      {overlay === "heritage" ? (
        <SimOverlay
          title={hubCopy.heritageModalTitle}
          body={hubCopy.heritageModalBody}
          closeLabel={hubCopy.heritageModalClose}
          onClose={() => setOverlay(null)}
        />
      ) : null}
    </div>
  );
}
