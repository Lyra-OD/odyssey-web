"use client";

/**
 * Séance cinéma wizard — aperçu craft (étape 5) ou cérémonie + hub C8 (étape 6).
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
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";
import type { OrganizerMasterHubMode } from "@/src/lib/wizard/organizerMasterHub";
import {
  buildTeaserFromStoryboard,
  storyboardPlaybackFingerprint,
  type CinemaChapterTitlesCopy,
} from "@/src/lib/wizard/teaserHelpers";
import {
  manifestPackageFromWizardBasePackage,
  type PackageId,
} from "@/src/lib/wizard/wizardDeliverables";
import type {
  WizardBasePackage,
  WizardStoryboardState,
} from "@/src/lib/wizard/wizardState";

export type WizardSessionHubCopy = QuietLuxuryExitHubCopy & {
  checkoutModalTitle: string;
  checkoutModalBody: string;
  checkoutModalClose: string;
  archiveUnlockError: string;
  archiveIncludedTitle: string;
  archiveIncludedBody: string;
  archiveIncludedCta: string;
  archiveIncludedUnlocking: string;
  archiveFinalizeTitle: string;
  archiveFinalizeBody: string;
  archiveFinalizeCta: string;
  archiveFinalizeUnlocking: string;
  masterSuccessNotice: string;
  masterCancelNotice: string;
  noticeDismiss: string;
  shareModalTitle: string;
  shareLinkLabel: string;
  shareLinkLoading: string;
  shareLinkError: string;
  shareCopy: string;
  shareCopied: string;
  shareNative: string;
  shareClose: string;
  heritageModalTitle: string;
  heritageModalBody: string;
  heritageModalClose: string;
};

export type WizardSessionIntent = "craft_preview" | "official_session";

type OverlayKind = "share" | "heritage" | null;

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
  /**
   * `craft_preview` (étape 5) et `official_session` (étape 6) = **même** cinéma
   * (focale, titres, pistes, médias). Seul le hub C8 / commerce change.
   */
  intent: WizardSessionIntent;
  hubCopy?: WizardSessionHubCopy | null;
  masterHubMode?: OrganizerMasterHubMode;
  onClose: () => void;
  /** CTA carte d’honneur — Stripe 49 $ / export / checkout Héritage. */
  onHonorPrimary?: () => Promise<void>;
  /**
   * Médias déjà hydratés (Livre Ouvert / PreviewStep) — SOURCE DE VÉRITÉ.
   * Un force-fetch ne fait qu’un merge non-destructif des URLs manquantes.
   */
  seedMediaItems?: MontageMediaItem[] | null;
  /** Forfait pour le tempo photo (`storyboardPacing`). */
  basePackage?: WizardBasePackage;
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

function honorFieldsForMode(
  hubCopy: WizardSessionHubCopy,
  mode: OrganizerMasterHubMode,
): Pick<
  QuietLuxuryExitHubCopy,
  "archiveTitle" | "archiveBody" | "archiveCta" | "archiveUnlocking"
> {
  if (mode === "download_included") {
    return {
      archiveTitle: hubCopy.archiveIncludedTitle,
      archiveBody: hubCopy.archiveIncludedBody,
      archiveCta: hubCopy.archiveIncludedCta,
      archiveUnlocking: hubCopy.archiveIncludedUnlocking,
    };
  }
  if (mode === "finalize_heritage") {
    return {
      archiveTitle: hubCopy.archiveFinalizeTitle,
      archiveBody: hubCopy.archiveFinalizeBody,
      archiveCta: hubCopy.archiveFinalizeCta,
      archiveUnlocking: hubCopy.archiveFinalizeUnlocking,
    };
  }
  return {
    archiveTitle: hubCopy.archiveTitle,
    archiveBody: hubCopy.archiveBody,
    archiveCta: hubCopy.archiveCta,
    archiveUnlocking: hubCopy.archiveUnlocking,
  };
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
  intent,
  hubCopy = null,
  masterHubMode = "buy_master",
  onClose,
  onHonorPrimary,
  seedMediaItems = null,
  basePackage = "essential",
}: Props) {
  const isOfficial = intent === "official_session" && Boolean(hubCopy);
  const packageId: PackageId = useMemo(
    () => manifestPackageFromWizardBasePackage(basePackage),
    [basePackage],
  );
  const [isLoading, setIsLoading] = useState(() => !seedMediaItems?.length);
  const [mediaById, setMediaById] = useState(
    () =>
      new Map(
        (seedMediaItems ?? []).map((item) => [item.assetId, item] as const),
      ),
  );
  const [overlay, setOverlay] = useState<OverlayKind>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const seedKey = useMemo(
    () =>
      (seedMediaItems ?? [])
        .map(
          (item) =>
            `${item.assetId}:${item.fullPreviewUrl ?? ""}:${item.previewUrl ?? ""}`,
        )
        .join("|"),
    [seedMediaItems],
  );

  useEffect(() => {
    if (!seedMediaItems?.length) return;
    setMediaById(
      new Map(seedMediaItems.map((item) => [item.assetId, item] as const)),
    );
    setIsLoading(false);
  }, [seedKey, seedMediaItems]);

  const { slides, tracks, chapterMeta, chapterOrder } = useMemo(
    () =>
      buildTeaserFromStoryboard(
        storyboard,
        mediaById,
        chapterTitles,
        packageId,
      ),
    [chapterTitles, mediaById, packageId, storyboard],
  );

  const playbackKey = useMemo(
    () => `${storyboardPlaybackFingerprint(storyboard)}|pkg=${packageId}`,
    [packageId, storyboard],
  );

  useEffect(() => {
    if (!projectId) {
      if (!seedMediaItems?.length) {
        setIsLoading(false);
        setMediaById(new Map());
      }
      return;
    }
    let cancelled = false;
    if (!seedMediaItems?.length) setIsLoading(true);
    void fetchProjectMedia(projectId, { force: true })
      .then((items) => {
        if (cancelled) return;
        const fetched = mediaApiToMontageItems(items);
        setMediaById((prev) => {
          if (prev.size === 0) {
            return new Map(fetched.map((item) => [item.assetId, item]));
          }
          // Seed = vérité absolue : merge non-destructif des URLs manquantes.
          const next = new Map(prev);
          for (const item of fetched) {
            const existing = next.get(item.assetId);
            if (!existing) continue;
            const needsPreview =
              !existing.previewUrl && Boolean(item.previewUrl);
            const needsFull =
              !existing.fullPreviewUrl && Boolean(item.fullPreviewUrl);
            if (!needsPreview && !needsFull) continue;
            next.set(item.assetId, {
              ...existing,
              ...(needsPreview ? { previewUrl: item.previewUrl } : {}),
              ...(needsFull ? { fullPreviewUrl: item.fullPreviewUrl } : {}),
            });
          }
          return next;
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, seedKey, seedMediaItems?.length]);

  const closeProjection = useCallback(() => {
    void exitNativeFullscreen();
    onClose();
  }, [onClose]);

  useEffect(() => {
    const root = document.documentElement;
    const prevHtmlOverflow = root.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    root.setAttribute("data-odyssey-cinema", "1");
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.removeAttribute("data-odyssey-cinema");
      root.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
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

  const honor = hubCopy
    ? honorFieldsForMode(hubCopy, masterHubMode)
    : null;

  const hubFields: QuietLuxuryExitHubCopy | null =
    hubCopy && honor
      ? {
          headline: hubCopy.headline,
          replay: hubCopy.replay,
          share: hubCopy.share,
          archiveTitle: honor.archiveTitle,
          archiveBody: honor.archiveBody,
          archiveCta: honor.archiveCta,
          archiveUnlocking: honor.archiveUnlocking,
          guestCopyTitle: hubCopy.guestCopyTitle,
          guestCopyBody: hubCopy.guestCopyBody,
          guestCopyCta: hubCopy.guestCopyCta,
          lueur: hubCopy.lueur,
          lineage: hubCopy.lineage,
          closeAria: hubCopy.closeAria,
        }
      : null;

  const handleHonorPrimary = useCallback(async () => {
    if (!onHonorPrimary || !hubCopy) return;
    setUnlockError(null);
    try {
      await onHonorPrimary();
    } catch {
      setUnlockError(hubCopy.archiveUnlockError);
      throw new Error("honor_primary_failed");
    }
  }, [hubCopy, onHonorPrimary]);

  const openShare = useCallback(async () => {
    if (!hubCopy) return;
    setOverlay("share");
    setShareCopied(false);
    setShareError(null);
    if (!projectId) {
      setShareError(hubCopy.shareLinkError);
      return;
    }
    if (shareUrl) return;
    setShareBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stream-link`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        shareUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.shareUrl) {
        setShareError(hubCopy.shareLinkError);
        return;
      }
      setShareUrl(data.shareUrl);
    } catch {
      setShareError(hubCopy.shareLinkError);
    } finally {
      setShareBusy(false);
    }
  }, [hubCopy, locale, projectId, shareUrl]);

  return (
    <div className="fixed inset-0 z-[80] h-dvh w-screen overflow-hidden bg-[#000000] text-zinc-100">
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
          key={playbackKey}
          cinema
          primedAudio={primedAudio}
          autoPlay
          slides={slides}
          tracks={tracks}
          chapterMeta={chapterMeta}
          chapterOrder={chapterOrder}
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
          onPlaybackComplete={
            isOfficial
              ? undefined
              : () => {
                  closeProjection();
                }
          }
          exitHub={
            isOfficial && hubFields
              ? {
                  copy: hubFields,
                  viewerRole: "organizer",
                  onUnlockMaster: handleHonorPrimary,
                  onShareSession: () => {
                    void openShare();
                  },
                  onUpgradePackage:
                    masterHubMode === "buy_master"
                      ? () => {
                          setOverlay("heritage");
                        }
                      : undefined,
                  onDismiss: closeProjection,
                }
              : null
          }
          className="h-full w-full"
        />
      )}

      {unlockError ? (
        <p
          className="pointer-events-none absolute bottom-8 left-1/2 z-[85] w-[min(92vw,24rem)] -translate-x-1/2 text-center text-[12px] font-light tracking-wide text-zinc-400"
          role="status"
        >
          {unlockError}
        </p>
      ) : null}

      {isOfficial && hubCopy && overlay === "share" ? (
        <SimOverlay
          title={hubCopy.shareModalTitle}
          body={hubCopy.shareLinkLabel}
          closeLabel={hubCopy.shareClose}
          onClose={() => setOverlay(null)}
        >
          <p className="mt-4 break-all rounded-sm border border-white/10 bg-black/40 px-3 py-2 text-[11px] font-light text-zinc-400">
            {shareBusy
              ? hubCopy.shareLinkLoading
              : shareError
                ? shareError
                : (shareUrl ?? "—")}
          </p>
          {shareUrl ? (
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
          ) : null}
        </SimOverlay>
      ) : null}

      {isOfficial && hubCopy && overlay === "heritage" ? (
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
