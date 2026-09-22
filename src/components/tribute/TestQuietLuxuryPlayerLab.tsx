"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  QuietLuxuryPlayer,
  requestNativeFullscreen,
  type QuietLuxuryAct,
} from "@/src/components/tribute/QuietLuxuryPlayer";
import type {
  QuietLuxuryExitHubCopy,
  QuietLuxuryViewerRole,
} from "@/src/components/tribute/QuietLuxuryExitHub";
import type { Locale } from "@/i18n.config";

/**
 * Lab C4/C8 — projection cinéma + hub de sortie (callbacks, overlays fullscreen-safe).
 * Dev only · `/[lang]/test-player`
 */

const PORTRAIT =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1600&h=900&fit=crop&crop=faces&q=80";
const PHOTO_LANDSCAPE =
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=80";
const PHOTO_FAMILY =
  "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1600&h=900&fit=crop&crop=faces&q=80";
const VIDEO_SHORT = "/video/test-video.mp4";
const AUDIO_ACT_1 = "/audio/test-1.mp3";
const AUDIO_ACT_2 = "/audio/test-2.mp3";

export type LabExitHubDictionary = QuietLuxuryExitHubCopy & {
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
  lueurModalTitle: string;
  lueurModalBody: string;
  lueurModalClose: string;
};

function buildMockActs(locale: Locale): QuietLuxuryAct[] {
  const chapterTwo =
    locale === "en"
      ? "Chapter II · Shared memories"
      : "Chapitre II · Les souvenirs partagés";

  return [
    {
      id: "chapitre-1",
      title:
        locale === "en"
          ? "Chapter I · First light"
          : "Chapitre I · Première lumière",
      audioUrl: AUDIO_ACT_1,
      clips: [
        {
          id: "p1",
          kind: "image",
          url: PHOTO_LANDSCAPE,
          durationSec: 5.2,
          label: "Paysage",
          kenBurns: "pull",
        },
        {
          id: "p2",
          kind: "image",
          url: PHOTO_FAMILY,
          durationSec: 5.2,
          label: "Présence",
          kenBurns: "push",
          objectPosition: "center 28%",
        },
        {
          id: "v1",
          kind: "video",
          url: VIDEO_SHORT,
          durationSec: 10,
          label: "Mouvement",
        },
      ],
    },
    {
      id: "chapitre-2",
      title: chapterTwo,
      audioUrl: AUDIO_ACT_2,
      clips: [
        {
          id: "p3",
          kind: "image",
          url: PORTRAIT,
          durationSec: 6.5,
          label: "Présence",
          kenBurns: "push",
          objectPosition: "center 18%",
        },
      ],
    },
  ];
}

type OverlayKind = "checkout" | "share" | "heritage" | "lueur" | null;

type Props = {
  locale: Locale;
  exitHubCopy: LabExitHubDictionary;
};

function LabOverlay({
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
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/70 px-6"
      role="dialog"
      aria-modal
      aria-label={title}
    >
      <div className="w-full max-w-md rounded-sm border border-white/15 bg-[#0a0a0a] px-6 py-6 text-left shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
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

export function TestQuietLuxuryPlayerLab({ locale, exitHubCopy }: Props) {
  const [entered, setEntered] = useState(false);
  const [viewerRole, setViewerRole] =
    useState<QuietLuxuryViewerRole>("organizer");
  const [overlay, setOverlay] = useState<OverlayKind>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [primedAudio, setPrimedAudio] = useState<HTMLAudioElement | null>(
    null,
  );
  const sessionAudioRef = useRef<HTMLAudioElement | null>(null);

  const sessionShareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${locale}/test-player`
      : `/${locale}/test-player`;

  useEffect(() => {
    if (!entered) {
      document.documentElement.removeAttribute("data-odyssey-cinema");
      return;
    }
    document.documentElement.setAttribute("data-odyssey-cinema", "1");
    return () => {
      document.documentElement.removeAttribute("data-odyssey-cinema");
    };
  }, [entered]);

  useEffect(() => {
    return () => {
      const audio = sessionAudioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
      }
      sessionAudioRef.current = null;
    };
  }, []);

  const enterSession = useCallback(async () => {
    await requestNativeFullscreen(document.documentElement);

    let audio = sessionAudioRef.current;
    if (!audio) {
      audio = new Audio();
      audio.preload = "auto";
      sessionAudioRef.current = audio;
    }
    audio.src = AUDIO_ACT_1;
    audio.volume = 0;
    try {
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
    } catch {
      /* */
    }

    try {
      const probe = document.createElement("video");
      probe.preload = "auto";
      probe.muted = true;
      probe.playsInline = true;
      probe.src = VIDEO_SHORT;
      probe.load();
    } catch {
      /* */
    }

    setPrimedAudio(audio);
    setEntered(true);
  }, []);

  const onUnlockMaster = useCallback(() => {
    console.info("[test-player] onUnlockMaster", { viewerRole });
    setOverlay("checkout");
  }, [viewerRole]);

  const onShareSession = useCallback(() => {
    console.info("[test-player] onShareSession");
    setShareCopied(false);
    setOverlay("share");
  }, []);

  const onUpgradePackage = useCallback(() => {
    console.info("[test-player] onUpgradePackage");
    setOverlay("heritage");
  }, []);

  const onLeaveLueur = useCallback(() => {
    console.info("[test-player] onLeaveLueur");
    setOverlay("lueur");
  }, []);

  const copyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sessionShareUrl);
      setShareCopied(true);
    } catch {
      setShareCopied(false);
    }
  }, [sessionShareUrl]);

  const nativeShare = useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: exitHubCopy.shareModalTitle,
        url: sessionShareUrl,
      });
    } catch {
      /* annulé */
    }
  }, [exitHubCopy.shareModalTitle, sessionShareUrl]);

  const salonBadge =
    locale === "en"
      ? "Session offered by Maison Urgel Bourgie"
      : "Séance offerte par Maison Urgel Bourgie";

  const hubCopy: QuietLuxuryExitHubCopy = {
    headline: exitHubCopy.headline,
    replay: exitHubCopy.replay,
    share: exitHubCopy.share,
    archiveTitle: exitHubCopy.archiveTitle,
    archiveBody: exitHubCopy.archiveBody,
    archiveCta: exitHubCopy.archiveCta,
    guestCopyTitle: exitHubCopy.guestCopyTitle,
    guestCopyBody: exitHubCopy.guestCopyBody,
    guestCopyCta: exitHubCopy.guestCopyCta,
    lueur: exitHubCopy.lueur,
    lineage: exitHubCopy.lineage,
    closeAria: exitHubCopy.closeAria,
  };

  if (!entered) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] text-zinc-100">
        <div className="flex flex-col items-center gap-8 px-8 text-center">
          <button
            type="button"
            onClick={() => void enterSession()}
            className="group flex flex-col items-center gap-5 outline-none"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] text-zinc-100 transition group-hover:border-white/35 group-hover:bg-white/[0.07]">
              <span className="ml-0.5 text-lg" aria-hidden>
                ▶
              </span>
            </span>
            <span className="font-editorial text-[clamp(1.1rem,2.4vw,1.45rem)] font-medium tracking-wide text-zinc-100">
              {locale === "en" ? "Enter the session" : "Entrer dans la séance"}
            </span>
            <span className="max-w-sm text-xs font-light leading-relaxed text-zinc-500">
              Madeleine Tremblay · 1938 — 2026
            </span>
          </button>

          <div className="flex items-center gap-3 text-[11px] font-light tracking-[0.14em] text-zinc-500">
            <span>{locale === "en" ? "Role" : "Rôle"}</span>
            <button
              type="button"
              onClick={() => setViewerRole("organizer")}
              className={`px-2 py-1 ${viewerRole === "organizer" ? "text-zinc-200" : "text-zinc-600 hover:text-zinc-400"}`}
            >
              organizer
            </button>
            <button
              type="button"
              onClick={() => setViewerRole("guest")}
              className={`px-2 py-1 ${viewerRole === "guest" ? "text-zinc-200" : "text-zinc-600 hover:text-zinc-400"}`}
            >
              guest
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-50 bg-[#000000] text-zinc-100">
      <div className="absolute inset-0 flex items-center justify-center bg-[#000000]">
        <div className="relative h-full w-full max-h-[100dvh] max-w-[100vw]">
          <QuietLuxuryPlayer
            key={`cinema-session-${viewerRole}`}
            cinema
            primedAudio={primedAudio}
            acts={buildMockActs(locale)}
            openingPortraitUrl={PORTRAIT}
            memoryCard={{
              displayName: "Madeleine Tremblay",
              yearsLine: "1938 — 2026",
            }}
            salonBadge={salonBadge}
            autoPlay
            showControls={false}
            exitHub={{
              copy: hubCopy,
              viewerRole,
              onUnlockMaster,
              onShareSession:
                viewerRole === "organizer" ? onShareSession : undefined,
              onUpgradePackage:
                viewerRole === "organizer" ? onUpgradePackage : undefined,
              onLeaveLueur: viewerRole === "guest" ? onLeaveLueur : undefined,
            }}
            copy={{
              play: locale === "en" ? "Play" : "Lecture",
              pause: locale === "en" ? "Pause" : "Pause",
              loading: locale === "en" ? "Loading…" : "Chargement…",
              enableSound:
                locale === "en"
                  ? "Click to enable sound"
                  : "Cliquez pour activer le son",
            }}
            className="h-full w-full"
            emptyLabel={locale === "en" ? "No media." : "Aucun média."}
          />

          {overlay === "checkout" ? (
            <LabOverlay
              title={exitHubCopy.checkoutModalTitle}
              body={exitHubCopy.checkoutModalBody}
              closeLabel={exitHubCopy.checkoutModalClose}
              onClose={() => setOverlay(null)}
            />
          ) : null}

          {overlay === "share" ? (
            <LabOverlay
              title={exitHubCopy.shareModalTitle}
              body={exitHubCopy.shareLinkLabel}
              closeLabel={exitHubCopy.shareClose}
              onClose={() => setOverlay(null)}
            >
              <p className="mt-4 break-all rounded-sm border border-white/10 bg-black/40 px-3 py-2 text-[11px] font-light text-zinc-400">
                {sessionShareUrl}
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => void copyShareLink()}
                  className="text-[12px] font-light tracking-[0.14em] text-zinc-200 underline decoration-white/25 underline-offset-4"
                >
                  {shareCopied
                    ? exitHubCopy.shareCopied
                    : exitHubCopy.shareCopy}
                </button>
                {typeof navigator !== "undefined" &&
                typeof navigator.share === "function" ? (
                  <button
                    type="button"
                    onClick={() => void nativeShare()}
                    className="text-[12px] font-light tracking-[0.14em] text-zinc-200 underline decoration-white/25 underline-offset-4"
                  >
                    {exitHubCopy.shareNative}
                  </button>
                ) : null}
              </div>
            </LabOverlay>
          ) : null}

          {overlay === "heritage" ? (
            <LabOverlay
              title={exitHubCopy.heritageModalTitle}
              body={exitHubCopy.heritageModalBody}
              closeLabel={exitHubCopy.heritageModalClose}
              onClose={() => setOverlay(null)}
            />
          ) : null}

          {overlay === "lueur" ? (
            <LabOverlay
              title={exitHubCopy.lueurModalTitle}
              body={exitHubCopy.lueurModalBody}
              closeLabel={exitHubCopy.lueurModalClose}
              onClose={() => setOverlay(null)}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
}
