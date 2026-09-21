"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  QuietLuxuryPlayer,
  requestNativeFullscreen,
  type QuietLuxuryAct,
} from "@/src/components/tribute/QuietLuxuryPlayer";
import type { Locale } from "@/i18n.config";

/**
 * Lab C4 — projection cinéma plein viewport + Fullscreen API.
 * Dev only · `/[lang]/test-player`
 */

/** Portrait lab — crop faces + marge haute pour éviter la coupe du front. */
const PORTRAIT =
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=1600&h=900&fit=crop&crop=faces&q=80";
const PHOTO_LANDSCAPE =
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=80";
const PHOTO_FAMILY =
  "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1600&h=900&fit=crop&crop=faces&q=80";
/** Clip vie CC0 (fleur / MDN) — H.264 local 10 s, sans boucle HTML. */
const VIDEO_SHORT = "/video/test-video.mp4";

/** Assets locaux fiables (pas d’URL externes audio). */
const AUDIO_ACT_1 = "/audio/test-1.mp3";
const AUDIO_ACT_2 = "/audio/test-2.mp3";

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

type Props = {
  locale: Locale;
};

export function TestQuietLuxuryPlayerLab({ locale }: Props) {
  const [entered, setEntered] = useState(false);
  const [primedAudio, setPrimedAudio] = useState<HTMLAudioElement | null>(
    null,
  );
  const sessionAudioRef = useRef<HTMLAudioElement | null>(null);

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

    // Une seule instance Audio pour toute la séance (jamais recreée dans le player).
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
      /* pastille enableSound si besoin */
    }

    // Précharge la vidéo locale pendant le geste.
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

  const salonBadge =
    locale === "en"
      ? "Session offered by Maison Urgel Bourgie"
      : "Séance offerte par Maison Urgel Bourgie";

  if (!entered) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] text-zinc-100">
        <button
          type="button"
          onClick={() => void enterSession()}
          className="group flex flex-col items-center gap-5 px-8 text-center outline-none"
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
            <br />
            {locale === "en"
              ? "Space · pause · F / Esc · fullscreen"
              : "Espace · pause · F / Échap · plein écran"}
          </span>
        </button>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-50 bg-[#000000] text-zinc-100">
      <div className="absolute inset-0 flex items-center justify-center bg-[#000000]">
        <div className="relative h-full w-full max-h-[100dvh] max-w-[100vw]">
          <QuietLuxuryPlayer
            key="cinema-session"
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
        </div>
      </div>
    </main>
  );
}
