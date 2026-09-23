"use client";

/**
 * C8 — Hub de sortie Quiet Luxury (post-noir absolu).
 * Rôles organizer / guest · callbacks only (zéro navigation qui casse le fullscreen).
 */

import { useEffect, useState } from "react";
import { RotateCcw, Share2, X } from "lucide-react";

export type QuietLuxuryViewerRole = "organizer" | "guest";

export type QuietLuxuryExitHubCopy = {
  headline: string;
  replay: string;
  share: string;
  archiveTitle: string;
  archiveBody: string;
  archiveCta: string;
  archiveUnlocking: string;
  /** Mention Fonds quand Master déjà ouvert (N-buyer). */
  archiveFundHint?: string;
  archiveDownloadCta?: string;
  guestCopyTitle: string;
  guestCopyBody: string;
  guestCopyCta: string;
  lueur: string;
  lineage: string;
  closeAria: string;
};

export type QuietLuxuryExitHubProps = {
  copy: QuietLuxuryExitHubCopy;
  displayName: string;
  viewerRole?: QuietLuxuryViewerRole;
  /** Master déjà débloqué — CTA 49 $ reste actif (C11) + download optionnel. */
  masterUnlocked?: boolean;
  onReplaySession: () => void;
  onUnlockMaster: () => void | Promise<void>;
  onDownloadMaster?: () => void | Promise<void>;
  onGuestCopy?: () => void | Promise<void>;
  onShareSession?: () => void;
  onUpgradePackage?: () => void;
  onLeaveLueur?: () => void;
  onCloseFullscreen: () => void;
  className?: string;
};

const secondaryBtn =
  "group inline-flex items-center justify-center gap-2.5 text-[13px] font-light tracking-[0.14em] text-zinc-300 transition-colors hover:text-zinc-50";
const tertiaryBtn =
  "text-[11px] font-light tracking-[0.18em] text-zinc-500 transition-colors hover:text-zinc-300";
const softLinkBtn =
  "text-[12px] font-light tracking-[0.16em] text-zinc-400 transition-colors hover:text-zinc-200";

export function QuietLuxuryExitHub({
  copy,
  displayName,
  viewerRole = "organizer",
  masterUnlocked = false,
  onReplaySession,
  onUnlockMaster,
  onDownloadMaster,
  onGuestCopy,
  onShareSession,
  onUpgradePackage,
  onLeaveLueur,
  onCloseFullscreen,
  className = "",
}: QuietLuxuryExitHubProps) {
  const [visible, setVisible] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(true), 40);
    return () => window.clearTimeout(id);
  }, []);

  const headline = copy.headline.replace("{name}", displayName.trim() || "—");
  const isOrganizer = viewerRole === "organizer";

  // C11 — carte d'honneur = toujours Master 49 $ (organizer + guest mécène).
  const honorCard = {
    title: copy.archiveTitle,
    body:
      masterUnlocked && copy.archiveFundHint
        ? copy.archiveFundHint
        : copy.archiveBody,
    cta: copy.archiveCta,
  };

  const handleUnlockMaster = async () => {
    if (archiveBusy) return;
    setArchiveBusy(true);
    try {
      await Promise.resolve(onUnlockMaster());
    } catch {
      /* caller surfaces error */
    } finally {
      setArchiveBusy(false);
    }
  };

  return (
    <div
      className={`absolute inset-0 z-40 flex items-center justify-center bg-[#020202] px-6 py-16 transition-opacity duration-[1200ms] ease-out ${visible ? "opacity-100" : "opacity-0"} ${className}`}
      role="dialog"
      aria-label={headline}
    >
      <button
        type="button"
        onClick={onCloseFullscreen}
        aria-label={copy.closeAria}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-colors hover:border-white/25 hover:text-zinc-100 md:right-6 md:top-6"
      >
        <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      </button>

      <div className="flex w-full max-w-lg flex-col items-center text-center">
        <p className="font-editorial text-[clamp(1.35rem,3.6vw,2rem)] font-medium leading-snug tracking-[0.02em] text-zinc-100">
          {headline}
        </p>

        <nav
          className="mt-12 flex w-full flex-col items-stretch gap-6 md:mt-14 md:gap-7"
          aria-label={headline}
        >
          <div className="rounded-sm border border-white/[0.1] bg-white/[0.03] px-5 py-5 text-left md:px-6 md:py-6">
            <p className="text-[13px] font-light tracking-[0.12em] text-zinc-100">
              {honorCard.title}
            </p>
            <p className="mt-2.5 text-[12px] font-light leading-relaxed tracking-wide text-zinc-500">
              {honorCard.body}
            </p>
            <button
              type="button"
              onClick={() => {
                void handleUnlockMaster();
              }}
              disabled={archiveBusy}
              aria-busy={archiveBusy}
              className="mt-4 inline-flex items-center gap-2 text-[12px] font-light tracking-[0.16em] text-zinc-100 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60 disabled:cursor-wait disabled:text-zinc-400 disabled:no-underline disabled:opacity-70"
            >
              {archiveBusy ? copy.archiveUnlocking : honorCard.cta}
            </button>
            {masterUnlocked && onDownloadMaster ? (
              <button
                type="button"
                onClick={() => {
                  void onDownloadMaster();
                }}
                className="mt-3 block text-[12px] font-light tracking-[0.14em] text-zinc-400 underline decoration-white/20 underline-offset-4 transition-colors hover:text-zinc-200"
              >
                {copy.archiveDownloadCta ?? copy.archiveCta}
              </button>
            ) : null}
          </div>

          {!isOrganizer && onGuestCopy ? (
            <button
              type="button"
              onClick={() => {
                void onGuestCopy();
              }}
              className={softLinkBtn}
            >
              {copy.guestCopyCta}
            </button>
          ) : null}

          <button type="button" onClick={onReplaySession} className={secondaryBtn}>
            <RotateCcw
              className="h-3.5 w-3.5 opacity-70 transition-opacity group-hover:opacity-100"
              strokeWidth={1.5}
              aria-hidden
            />
            {copy.replay}
          </button>

          {isOrganizer && onShareSession ? (
            <button type="button" onClick={onShareSession} className={secondaryBtn}>
              <Share2
                className="h-3.5 w-3.5 opacity-70 transition-opacity group-hover:opacity-100"
                strokeWidth={1.5}
                aria-hidden
              />
              {copy.share}
            </button>
          ) : null}

          {!isOrganizer && onLeaveLueur ? (
            <button type="button" onClick={onLeaveLueur} className={softLinkBtn}>
              {copy.lueur}
            </button>
          ) : null}

          {isOrganizer && onUpgradePackage ? (
            <button type="button" onClick={onUpgradePackage} className={tertiaryBtn}>
              {copy.lineage}
            </button>
          ) : null}
        </nav>
      </div>
    </div>
  );
}
