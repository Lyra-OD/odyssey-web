"use client";

/**
 * Séance cinéma — Studio (étape 5/6) ou `/stream/[token]` invité.
 * Même moteur Quiet Luxury ; seul le hub / le chargement médias changent.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

import { CinematicTeaser } from "@/src/components/tribute/CinematicTeaser";
import type {
  QuietLuxuryExitHubCopy,
  QuietLuxuryViewerRole,
} from "@/src/components/tribute/QuietLuxuryExitHub";
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
  type TeaserChapterMeta,
  type TeaserSlide,
  type TeaserTracks,
} from "@/src/lib/wizard/teaserHelpers";
import {
  manifestPackageFromWizardBasePackage,
  type PackageId,
} from "@/src/lib/wizard/wizardDeliverables";
import type {
  WizardBasePackage,
  WizardStoryboardState,
} from "@/src/lib/wizard/wizardState";
import { emptyStoryboardState } from "@/src/lib/wizard/wizardState";

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
  /** C11 — body N-buyer (Fonds). */
  archiveFundHint?: string;
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
  /** Stub C12 — overlay copie invité avant Stripe. */
  guestCopyStubBody?: string;
  /** C13 — Social Cut. */
  socialCutTitle?: string;
  socialCutBody?: string;
  socialCutCta?: string;
  socialCutUnlocking?: string;
  socialCutSuccessNotice?: string;
  socialCutCancelNotice?: string;
  socialCutMasterLockedBody?: string;
  socialCutCheckoutError?: string;
  lueurModalTitle?: string;
  lueurModalBody?: string;
  lueurModalClose?: string;
};

export type WizardSessionIntent = "craft_preview" | "official_session";

export type WizardSessionPlayback = "studio" | "prebuilt";

export type WizardSessionPrebuiltPayload = {
  slides: TeaserSlide[];
  tracks: TeaserTracks;
  chapterMeta: Record<string, TeaserChapterMeta>;
  chapterOrder?: string[];
};

type OverlayKind = "share" | "heritage" | "guest_copy" | "lueur" | null;

type Props = {
  projectId?: string | null;
  /** Obligatoire en `playback="studio"`. */
  storyboard?: WizardStoryboardState;
  /** Obligatoire en `playback="studio"`. */
  chapterTitles?: CinemaChapterTitlesCopy;
  memoryCard: { displayName: string; yearsLine: string };
  openingPortraitUrl?: string | null;
  salonBadge?: string | null;
  primedAudio?: HTMLAudioElement | null;
  locale: "fr" | "en";
  closeLabel: string;
  enableSound: string;
  emptyLabel: string;
  loadingLabel: string;
  teaserPlay: string;
  teaserPause: string;
  teaserLoading: string;
  /**
   * `craft_preview` (étape 5) et `official_session` (étape 6 / stream) =
   * même cinéma. Seul le hub C8 / commerce change.
   */
  intent: WizardSessionIntent;
  /**
   * `studio` = storyboard + seed + fetch non-destructif.
   * `prebuilt` = payload `/api/stream/[token]` (aucun fetchProjectMedia).
   */
  playback?: WizardSessionPlayback;
  /** Rôle hub — organiseur (share) vs invité (copie 15 $). */
  viewerRole?: QuietLuxuryViewerRole;
  /** Payload déjà signé — requis si `playback="prebuilt"`. */
  prebuilt?: WizardSessionPrebuiltPayload | null;
  hubCopy?: WizardSessionHubCopy | null;
  masterHubMode?: OrganizerMasterHubMode;
  onClose: () => void;
  /** CTA carte d’honneur — Stripe Master 49 $ / checkout Héritage / gift. */
  onHonorPrimary?: () => Promise<void>;
  /** C11 — télécharger l’archive si Master déjà unlocked. */
  onDownloadMaster?: () => Promise<void>;
  /** C12 — copie 15 $ (guest stream). */
  onGuestCopy?: () => Promise<void>;
  /** C13 — Social Cut 9:16 post-Master. */
  onSocialCut?: () => Promise<void>;
  /**
   * Master déjà unlocked (stream guest) — expose Social Cut.
   * Studio : déduit de masterHubMode / onDownloadMaster.
   */
  masterUnlocked?: boolean;
  /**
   * Médias déjà hydratés (Livre Ouvert / PreviewStep) — SOURCE DE VÉRITÉ.
   * Un force-fetch ne fait qu’un merge non-destructif des URLs manquantes.
   */
  seedMediaItems?: MontageMediaItem[] | null;
  /** Forfait pour le tempo photo (`storyboardPacing`) — studio only. */
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
  | "archiveTitle"
  | "archiveBody"
  | "archiveCta"
  | "archiveUnlocking"
  | "archiveFundHint"
  | "archiveDownloadCta"
> {
  // C11 — CTA 49 $ toujours visible. finalize_heritage garde son parcours Écrin.
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
    archiveFundHint: hubCopy.archiveFundHint,
    archiveDownloadCta: hubCopy.archiveIncludedCta,
  };
}

const EMPTY_CHAPTER_TITLES: CinemaChapterTitlesCopy = {
  chapter1: "",
  chapter2: "",
  chapter3: "",
  chapter4: "",
  chapter5Plus: "",
  trackCredit: "{title} — {artist}",
  trackCreditTitleOnly: "{title}",
};

export function WizardSessionProjection({
  projectId = null,
  storyboard,
  chapterTitles,
  memoryCard,
  openingPortraitUrl = null,
  salonBadge = null,
  primedAudio = null,
  locale,
  closeLabel,
  enableSound,
  emptyLabel,
  loadingLabel,
  teaserPlay,
  teaserPause,
  teaserLoading,
  intent,
  playback = "studio",
  viewerRole = "organizer",
  prebuilt = null,
  hubCopy = null,
  masterHubMode = "buy_master",
  onClose,
  onHonorPrimary,
  onDownloadMaster,
  onGuestCopy,
  onSocialCut,
  masterUnlocked: masterUnlockedProp,
  seedMediaItems = null,
  basePackage = "essential",
}: Props) {
  const isPrebuilt = playback === "prebuilt";
  const isGuest = viewerRole === "guest";
  const isOfficial = intent === "official_session" && Boolean(hubCopy);

  const packageId: PackageId = useMemo(
    () => manifestPackageFromWizardBasePackage(basePackage),
    [basePackage],
  );
  const [isLoading, setIsLoading] = useState(() => {
    if (isPrebuilt) return !prebuilt?.slides?.length;
    return !seedMediaItems?.length;
  });
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
    if (isPrebuilt) {
      setIsLoading(!prebuilt?.slides?.length);
      return;
    }
    if (!seedMediaItems?.length) return;
    setMediaById(
      new Map(seedMediaItems.map((item) => [item.assetId, item] as const)),
    );
    setIsLoading(false);
  }, [isPrebuilt, prebuilt?.slides?.length, seedKey, seedMediaItems]);

  const studioBuilt = useMemo(() => {
    if (isPrebuilt) {
      return {
        slides: [] as TeaserSlide[],
        tracks: {} as TeaserTracks,
        chapterMeta: {} as Record<string, TeaserChapterMeta>,
        chapterOrder: [] as string[],
      };
    }
    return buildTeaserFromStoryboard(
      storyboard ?? emptyStoryboardState(),
      mediaById,
      chapterTitles ?? EMPTY_CHAPTER_TITLES,
      packageId,
    );
  }, [
    chapterTitles,
    isPrebuilt,
    mediaById,
    packageId,
    storyboard,
  ]);

  const slides = isPrebuilt ? (prebuilt?.slides ?? []) : studioBuilt.slides;
  const tracks = isPrebuilt ? (prebuilt?.tracks ?? {}) : studioBuilt.tracks;
  const chapterMeta = isPrebuilt
    ? (prebuilt?.chapterMeta ?? {})
    : studioBuilt.chapterMeta;
  const chapterOrder = isPrebuilt
    ? (prebuilt?.chapterOrder ?? Object.keys(chapterMeta))
    : studioBuilt.chapterOrder;

  const playbackKey = useMemo(() => {
    if (isPrebuilt) {
      return `prebuilt|${slides.map((s) => s.imageUrl).join("|")}|${chapterOrder.join(",")}`;
    }
    return `${storyboardPlaybackFingerprint(storyboard ?? emptyStoryboardState())}|pkg=${packageId}`;
  }, [chapterOrder, isPrebuilt, packageId, slides, storyboard]);

  useEffect(() => {
    // Invité / prebuilt : jamais de fetch owner medias.
    if (isPrebuilt) return;
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
  }, [isPrebuilt, projectId, seedKey, seedMediaItems?.length]);

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
          archiveFundHint: honor.archiveFundHint,
          archiveDownloadCta: honor.archiveDownloadCta,
          guestCopyTitle: hubCopy.guestCopyTitle,
          guestCopyBody: hubCopy.guestCopyBody,
          guestCopyCta: hubCopy.guestCopyCta,
          socialCutTitle: hubCopy.socialCutTitle,
          socialCutBody: hubCopy.socialCutBody,
          socialCutCta: hubCopy.socialCutCta,
          socialCutUnlocking: hubCopy.socialCutUnlocking,
          lueur: hubCopy.lueur,
          lineage: hubCopy.lineage,
          closeAria: hubCopy.closeAria,
        }
      : null;

  const handleHonorPrimary = useCallback(async () => {
    if (isGuest) {
      if (onHonorPrimary) {
        await onHonorPrimary();
        return;
      }
      setOverlay("guest_copy");
      return;
    }
    if (!onHonorPrimary || !hubCopy) return;
    setUnlockError(null);
    try {
      await onHonorPrimary();
    } catch {
      setUnlockError(hubCopy.archiveUnlockError);
      throw new Error("honor_primary_failed");
    }
  }, [hubCopy, isGuest, onHonorPrimary]);

  const openShare = useCallback(async () => {
    if (!hubCopy || isGuest) return;
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
  }, [hubCopy, isGuest, locale, projectId, shareUrl]);

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
          projectId={isPrebuilt ? null : projectId}
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
                  viewerRole,
                  masterUnlocked:
                    masterUnlockedProp === true ||
                    (!isGuest &&
                      (masterHubMode === "download_included" ||
                        Boolean(onDownloadMaster))),
                  onUnlockMaster: handleHonorPrimary,
                  onDownloadMaster:
                    !isGuest && onDownloadMaster
                      ? () => onDownloadMaster()
                      : undefined,
                  onGuestCopy:
                    isGuest && onGuestCopy ? () => onGuestCopy() : undefined,
                  onSocialCut: onSocialCut ? () => onSocialCut() : undefined,
                  onShareSession: isGuest
                    ? undefined
                    : () => {
                        void openShare();
                      },
                  onUpgradePackage:
                    !isGuest && masterHubMode === "buy_master"
                      ? () => {
                          setOverlay("heritage");
                        }
                      : undefined,
                  onLeaveLueur: isGuest
                    ? () => {
                        setOverlay("lueur");
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

      {isOfficial && hubCopy && !isGuest && overlay === "share" ? (
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

      {isOfficial && hubCopy && !isGuest && overlay === "heritage" ? (
        <SimOverlay
          title={hubCopy.heritageModalTitle}
          body={hubCopy.heritageModalBody}
          closeLabel={hubCopy.heritageModalClose}
          onClose={() => setOverlay(null)}
        />
      ) : null}

      {isOfficial && hubCopy && isGuest && overlay === "guest_copy" ? (
        <SimOverlay
          title={hubCopy.guestCopyTitle}
          body={hubCopy.guestCopyStubBody ?? hubCopy.guestCopyBody}
          closeLabel={hubCopy.closeAria}
          onClose={() => setOverlay(null)}
        />
      ) : null}

      {isOfficial && hubCopy && isGuest && overlay === "lueur" ? (
        <SimOverlay
          title={hubCopy.lueurModalTitle ?? hubCopy.lueur}
          body={hubCopy.lueurModalBody ?? hubCopy.lineage}
          closeLabel={hubCopy.lueurModalClose ?? hubCopy.closeAria}
          onClose={() => setOverlay(null)}
        />
      ) : null}
    </div>
  );
}
