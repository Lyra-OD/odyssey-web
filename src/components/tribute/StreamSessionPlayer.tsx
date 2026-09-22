"use client";

/**
 * C14 MVP — séance Quiet Luxury guest via `/stream/[token]`.
 */

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

import { CinematicTeaser } from "@/src/components/tribute/CinematicTeaser";
import type { QuietLuxuryExitHubCopy } from "@/src/components/tribute/QuietLuxuryExitHub";
import type {
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
};

type StreamPayload = {
  memoryCard: { displayName: string; yearsLine: string };
  openingPortraitUrl: string | null;
  slides: TeaserSlide[];
  tracks: TeaserTracks;
  chapterMeta: Record<
    string,
    { title: string; musicCredit: string | null; chapterIndex: number }
  >;
};

type OverlayKind = "guest_copy" | "lueur" | null;

type Props = {
  token: string;
  locale: "fr" | "en";
  copy: StreamSessionCopy;
};

export function StreamSessionPlayer({ token, locale, copy }: Props) {
  const [payload, setPayload] = useState<StreamPayload | null>(null);
  const [error, setError] = useState<"unavailable" | null>(null);
  const [loading, setLoading] = useState(true);
  const [overlay, setOverlay] = useState<OverlayKind>(null);

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

  useEffect(() => {
    const root = document.documentElement;
    const prevHtml = root.style.overflow;
    const prevBody = document.body.style.overflow;
    root.setAttribute("data-odyssey-cinema", "1");
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.removeAttribute("data-odyssey-cinema");
      root.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  const hubCopy: QuietLuxuryExitHubCopy = {
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
  };

  const onClose = useCallback(() => {
    window.history.length > 1 ? window.history.back() : (window.location.href = `/${locale}`);
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

  return (
    <div className="fixed inset-0 z-[80] h-dvh w-screen overflow-hidden bg-[#000000] text-zinc-100">
      <button
        type="button"
        onClick={onClose}
        aria-label={copy.closeAria}
        className="absolute right-4 top-4 z-[90] flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-zinc-300 transition-colors hover:border-white/30 hover:text-zinc-50 md:right-6 md:top-6"
      >
        <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      </button>
      <CinematicTeaser
        cinema
        autoPlay
        slides={payload.slides}
        tracks={payload.tracks}
        chapterMeta={payload.chapterMeta}
        openingPortraitUrl={payload.openingPortraitUrl}
        memoryCard={payload.memoryCard}
        emptyLabel={copy.streamEmpty}
        enableSound={copy.enableSound}
        copy={{
          loading: copy.teaserLoading,
          nowPlaying: "",
          play: copy.teaserPlay,
          pause: copy.teaserPause,
        }}
        exitHub={{
          copy: hubCopy,
          viewerRole: "guest",
          onUnlockMaster: () => {
            setOverlay("guest_copy");
          },
          onLeaveLueur: () => {
            setOverlay("lueur");
          },
        }}
        className="h-full w-full"
      />

      {overlay ? (
        <div
          className="absolute inset-0 z-[90] flex items-center justify-center bg-black/70 px-6"
          role="dialog"
          aria-modal
        >
          <div className="w-full max-w-md rounded-sm border border-white/15 bg-[#0a0a0a] px-6 py-6 text-center">
            <p className="font-editorial text-lg font-medium tracking-wide text-zinc-100">
              {overlay === "guest_copy" ? copy.guestCopyTitle : copy.lueurModalTitle}
            </p>
            <p className="mt-3 text-[13px] font-light leading-relaxed text-zinc-400">
              {overlay === "guest_copy"
                ? copy.guestCopyStubBody
                : copy.lueurModalBody}
            </p>
            <button
              type="button"
              onClick={() => setOverlay(null)}
              className="mt-6 text-[12px] font-light tracking-[0.14em] text-zinc-300 underline decoration-white/25 underline-offset-4 hover:text-zinc-100"
            >
              {overlay === "guest_copy" ? copy.closeAria : copy.lueurModalClose}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
