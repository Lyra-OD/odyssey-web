"use client";

/**
 * C14 — Hydrateur `/stream/[token]` → WizardSessionProjection (guest · prebuilt).
 * C12 — Checkout `guestMasterCopy` + download post-success.
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
  guestCopyMasterLockedBody: string;
  guestCopyCheckoutError: string;
  guestCopyDownloadReady: string;
  guestCopyArchivePending: string;
  guestCopyDownloadCta: string;
  socialCutTitle: string;
  socialCutBody: string;
  socialCutCta: string;
  socialCutUnlocking: string;
  socialCutMasterLockedBody: string;
  socialCutCheckoutError: string;
  socialCutSuccessNotice: string;
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
  masterUnlocked?: boolean;
};

type OverlayKind =
  | "guest_copy"
  | "lueur"
  | "master_locked"
  | "checkout_error"
  | "download_ready"
  | "archive_pending"
  | "social_cut_success"
  | null;

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
  const dash = "—";
  return {
    checkoutModalTitle: dash,
    checkoutModalBody: dash,
    checkoutModalClose: copy.closeAria,
    archiveUnlockError: copy.guestCopyCheckoutError,
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
  const [overlay, setOverlay] = useState<OverlayKind>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

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

  // Retour Stripe C12 — tenter le download Master.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "social_cut_success") {
      setOverlay("social_cut_success");
      return;
    }
    if (checkout !== "guest_success") return;
    const sessionId = params.get("session_id")?.trim();
    if (!sessionId) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/stream/${encodeURIComponent(token)}/download?session_id=${encodeURIComponent(sessionId)}`,
        );
        const data = (await res.json().catch(() => ({}))) as {
          downloadUrl?: string;
          error?: string;
        };
        if (cancelled) return;
        if (res.ok && data.downloadUrl) {
          setDownloadUrl(data.downloadUrl);
          setOverlay("download_ready");
          return;
        }
        if (res.status === 409 || data.error === "archive_pending") {
          setOverlay("archive_pending");
          return;
        }
        setOverlay("checkout_error");
      } catch {
        if (!cancelled) setOverlay("checkout_error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const onClose = useCallback(() => {
    window.history.length > 1
      ? window.history.back()
      : (window.location.href = `/${locale}`);
  }, [locale]);

  const startMasterGiftCheckout = useCallback(async () => {
    const res = await fetch(
      `/api/stream/${encodeURIComponent(token)}/master-checkout`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    if (!res.ok || !data.url) {
      setOverlay("checkout_error");
      throw new Error(data.error ?? "master_checkout_failed");
    }
    window.location.href = data.url;
  }, [locale, token]);

  const startGuestCopyCheckout = useCallback(async () => {
    const res = await fetch(`/api/stream/${encodeURIComponent(token)}/checkout`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    if (res.status === 422 && data.error === "master_not_unlocked") {
      setOverlay("master_locked");
      return;
    }
    if (!res.ok || !data.url) {
      setOverlay("checkout_error");
      throw new Error(data.error ?? "checkout_failed");
    }
    window.location.href = data.url;
  }, [locale, token]);

  const startSocialCutCheckout = useCallback(async () => {
    const res = await fetch(
      `/api/stream/${encodeURIComponent(token)}/social-cut-checkout`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    if (res.status === 422 && data.error === "master_not_unlocked") {
      setOverlay("master_locked");
      return;
    }
    if (!res.ok || !data.url) {
      setOverlay("checkout_error");
      throw new Error(data.error ?? "social_cut_checkout_failed");
    }
    window.location.href = data.url;
  }, [locale, token]);

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
    socialCutTitle: copy.socialCutTitle,
    socialCutBody: copy.socialCutBody,
    socialCutCta: copy.socialCutCta,
    socialCutUnlocking: copy.socialCutUnlocking,
    lueur: copy.lueur,
    lineage: copy.lineage,
    closeAria: copy.closeAria,
    guestCopyStubBody: copy.guestCopyStubBody,
    lueurModalTitle: copy.lueurModalTitle,
    lueurModalBody: copy.lueurModalBody,
    lueurModalClose: copy.lueurModalClose,
    ...placeholderOrganizerFields(copy),
  };

  const overlayTitle =
    overlay === "master_locked"
      ? copy.guestCopyTitle
      : overlay === "download_ready"
        ? copy.guestCopyDownloadReady
        : overlay === "archive_pending"
          ? copy.guestCopyArchivePending
          : overlay === "checkout_error"
            ? copy.guestCopyCheckoutError
            : overlay === "social_cut_success"
              ? copy.socialCutTitle
              : overlay === "lueur"
                ? copy.lueurModalTitle
                : copy.guestCopyTitle;

  const overlayBody =
    overlay === "master_locked"
      ? copy.guestCopyMasterLockedBody
      : overlay === "download_ready"
        ? copy.guestCopyBody
        : overlay === "archive_pending"
          ? copy.guestCopyArchivePending
          : overlay === "checkout_error"
            ? copy.guestCopyCheckoutError
            : overlay === "social_cut_success"
              ? copy.socialCutSuccessNotice
              : overlay === "lueur"
                ? copy.lueurModalBody
                : copy.guestCopyStubBody;

  return (
    <>
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
        onHonorPrimary={startMasterGiftCheckout}
        onGuestCopy={startGuestCopyCheckout}
        onSocialCut={startSocialCutCheckout}
        masterUnlocked={payload.masterUnlocked === true}
      />

      {overlay &&
      overlay !== "guest_copy" &&
      overlay !== "lueur" ? (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 px-6"
          role="dialog"
          aria-modal
        >
          <div className="w-full max-w-md rounded-sm border border-white/15 bg-[#0a0a0a] px-6 py-6 text-center">
            <p className="font-editorial text-lg font-medium tracking-wide text-zinc-100">
              {overlayTitle}
            </p>
            <p className="mt-3 text-[13px] font-light leading-relaxed text-zinc-400">
              {overlayBody}
            </p>
            {overlay === "download_ready" && downloadUrl ? (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block text-[12px] font-light tracking-[0.14em] text-zinc-100 underline decoration-white/30 underline-offset-4"
              >
                {copy.guestCopyDownloadCta}
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => setOverlay(null)}
              className="mt-6 block w-full text-[12px] font-light tracking-[0.14em] text-zinc-300 underline decoration-white/25 underline-offset-4 hover:text-zinc-100"
            >
              {copy.closeAria}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
