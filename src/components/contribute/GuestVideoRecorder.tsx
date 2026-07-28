"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Video, Square, RotateCcw } from "lucide-react";

import {
  sanctuaryFieldInput,
  sanctuaryGhostButton,
  sanctuarySecondaryButton,
  sanctuarySelectBreathe,
  sanctuarySubmitButton,
} from "@/src/lib/contribute/sanctuaryChrome";
import { isSanctuaryVisualPreview } from "@/src/lib/contribute/sanctuaryPreview";
import { SANCTUARY_GUEST_VIDEO_MAX_SECONDS } from "@/src/lib/contribute/sanctuaryLimits";
import { parseApiJson } from "@/src/lib/http/parseApiJson";

export type GuestVideoRecorderProps = {
  token: string;
  locale: "fr" | "en";
  contributorName: string;
  contributorEmail?: string | null;
  /** media_assets.id une fois uploadé. */
  mediaId: string | null;
  onMediaIdChange: (mediaId: string | null) => void;
  /** Dans une carte empreinte : pas de chrome / titre (copy déjà au-dessus). */
  embedded?: boolean;
};

type Phase =
  | "idle"
  | "recording"
  | "preview"
  | "uploading"
  | "ready"
  | "error";

const copy = {
  fr: {
    title: "Enregistrez votre témoignage",
    lead: "Quelques secondes face caméra. Vous pourrez revoir et recommencer avant de payer.",
    start: "Filmer",
    stop: "Arrêter",
    play: "Revoir",
    pause: "Pause",
    retake: "Recommencer",
    keep: "Garder ce témoignage",
    ready: "Témoignage prêt. Vous pouvez continuer vers le paiement.",
    uploading: "Envoi de votre témoignage…",
    needName: "Indiquez d’abord votre prénom dans le dépôt souvenir, ou ici.",
    nameLabel: "Votre prénom",
    namePlaceholder: "Prénom",
    camDenied:
      "Caméra inaccessible. Autorisez la caméra et le micro dans le navigateur, puis réessayez.",
    unsupported: "Votre navigateur ne permet pas l’enregistrement vidéo.",
    uploadFailed: "Impossible d’envoyer le témoignage. Réessayez.",
    previewBlocked: "Aperçu local : l’enregistrement nécessite un vrai lien.",
    frameLive: "Aperçu caméra en direct",
    framePlayback: "Aperçu de votre témoignage",
  },
  en: {
    title: "Record your testimony",
    lead: "A few seconds on camera. You can review and re-record before paying.",
    start: "Film",
    stop: "Stop",
    play: "Watch",
    pause: "Pause",
    retake: "Re-record",
    keep: "Keep this testimony",
    ready: "Testimony ready. You may continue to payment.",
    uploading: "Sending your testimony…",
    needName: "Add your first name from the memory deposit, or here.",
    nameLabel: "Your first name",
    namePlaceholder: "First name",
    camDenied:
      "Camera unavailable. Allow camera and microphone in the browser, then try again.",
    unsupported: "Your browser cannot record video.",
    uploadFailed: "We could not upload the testimony. Please try again.",
    previewBlocked: "Local preview: recording needs a real Sanctuary link.",
    frameLive: "Live camera preview",
    framePlayback: "Preview of your testimony",
  },
} as const;

function pickVideoRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m));
}

function formatMemoTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/**
 * Témoignage live Sanctuaire. Caméra selfie + micro, gate checkout guest_video.
 */
export function GuestVideoRecorder({
  token,
  locale,
  contributorName,
  contributorEmail,
  mediaId,
  onMediaIdChange,
  embedded = false,
}: GuestVideoRecorderProps) {
  const t = copy[locale];
  const maxSec = SANCTUARY_GUEST_VIDEO_MAX_SECONDS;
  const [phase, setPhase] = useState<Phase>(mediaId ? "ready" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [localName, setLocalName] = useState(contributorName);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const playbackRef = useRef<HTMLVideoElement | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const stoppedRef = useRef(false);
  const elapsedRef = useRef(0);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
  }, []);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => {
    setLocalName(contributorName);
  }, [contributorName]);

  useEffect(() => {
    return () => {
      clearTick();
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [clearTick, previewUrl, stopStream]);

  const resetPreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    blobRef.current = null;
    setPlaying(false);
    setDurationSec(0);
    if (playbackRef.current) {
      playbackRef.current.pause();
      playbackRef.current.removeAttribute("src");
      playbackRef.current.load();
    }
  }, [previewUrl]);

  const startRecording = async () => {
    setError(null);
    onMediaIdChange(null);
    if (isSanctuaryVisualPreview(token)) {
      setError(t.previewBlocked);
      return;
    }
    if (!localName.trim()) {
      setError(t.needName);
      return;
    }
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(t.unsupported);
      return;
    }
    const mime = pickVideoRecorderMime();
    if (!mime && typeof MediaRecorder === "undefined") {
      setError(t.unsupported);
      return;
    }

    resetPreview();
    stoppedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 960 },
        },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        void liveVideoRef.current.play().catch(() => undefined);
      }

      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined,
      );
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        clearTick();
        stopStream();
        const type = recorder.mimeType || mime || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setDurationSec(elapsedRef.current);
        setPhase("preview");
      };
      recorder.start(400);
      setElapsed(0);
      elapsedRef.current = 0;
      setPhase("recording");
      tickRef.current = setInterval(() => {
        setElapsed((s) => {
          const next = s + 1;
          elapsedRef.current = Math.min(next, maxSec);
          if (next >= maxSec && !stoppedRef.current) {
            stoppedRef.current = true;
            if (recorder.state !== "inactive") recorder.stop();
          }
          return Math.min(next, maxSec);
        });
      }, 1000);
    } catch {
      stopStream();
      setPhase("error");
      setError(t.camDenied);
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      stoppedRef.current = true;
      rec.stop();
    }
  };

  const togglePlay = () => {
    const video = playbackRef.current;
    if (!video || !previewUrl) return;
    if (playing) {
      video.pause();
      setPlaying(false);
    } else {
      void video.play().then(() => setPlaying(true)).catch(() => {
        setPlaying(false);
      });
    }
  };

  const retake = () => {
    onMediaIdChange(null);
    resetPreview();
    setPhase("idle");
    setElapsed(0);
    setError(null);
  };

  const upload = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    if (isSanctuaryVisualPreview(token)) {
      setError(t.previewBlocked);
      return;
    }
    setPhase("uploading");
    setError(null);
    try {
      const rawType = blob.type.split(";")[0] || "video/webm";
      const ext = rawType.includes("mp4")
        ? "mp4"
        : rawType.includes("quicktime")
          ? "mov"
          : "webm";
      const file = new File([blob], `testimony.${ext}`, { type: rawType });
      const form = new FormData();
      form.set("kind", "video");
      form.set("file", file);
      form.set("contributorName", localName.trim());
      if (contributorEmail?.trim()) {
        form.set("contributorEmail", contributorEmail.trim());
      }
      const res = await fetch(
        `/api/contribute/${encodeURIComponent(token)}/deposit`,
        { method: "POST", body: form },
      );
      const body = await parseApiJson<{
        ok?: boolean;
        deposit?: { id?: string };
        error?: string;
      }>(res);
      if (!res.ok || !body.ok || !body.deposit?.id) {
        setPhase("preview");
        setError(t.uploadFailed);
        return;
      }
      onMediaIdChange(body.deposit.id);
      setPhase("ready");
    } catch {
      setPhase("preview");
      setError(t.uploadFailed);
    }
  };

  const showLive = phase === "recording";
  const showPlayback =
    phase === "preview" || phase === "uploading" || phase === "ready";
  const displayCurrent =
    phase === "recording"
      ? formatMemoTime(elapsed)
      : showPlayback
        ? formatMemoTime(durationSec > 0 ? durationSec : elapsed)
        : formatMemoTime(0);
  const displayMax = formatMemoTime(maxSec);

  return (
    <div
      className={
        embedded
          ? "space-y-4"
          : "space-y-4 rounded-sm border border-teal-400/25 bg-teal-400/[0.04] px-4 py-5 md:px-5"
      }
    >
      {!embedded ? (
        <div className="space-y-2 text-center">
          <p className="font-editorial text-lg text-zinc-50">{t.title}</p>
          <p className="text-sm font-light leading-relaxed text-white/55">
            {t.lead}
          </p>
        </div>
      ) : null}

      {!contributorName.trim() ? (
        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">
            {t.nameLabel}
          </span>
          <input
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            placeholder={t.namePlaceholder}
            className={`${sanctuaryFieldInput} mt-1 [color-scheme:dark] [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#020202] [&:-webkit-autofill]:[-webkit-text-fill-color:#fafafa]`}
            autoComplete="given-name"
          />
        </label>
      ) : null}

      <div
        className={`relative overflow-hidden rounded-xl border bg-black/60 ${
          showLive || phase === "ready"
            ? `${sanctuarySelectBreathe} border-teal-400/40`
            : "border-teal-400/25"
        }`}
      >
        {/* Live always mounted so srcObject can attach before first paint of recording. */}
        <video
          ref={liveVideoRef}
          className={`aspect-[3/4] w-full object-cover ${
            showLive ? "block -scale-x-100" : "hidden"
          }`}
          autoPlay
          playsInline
          muted
          aria-label={t.frameLive}
        />
        {showPlayback && previewUrl ? (
          <video
            ref={playbackRef}
            src={previewUrl}
            className="aspect-[3/4] w-full object-cover"
            playsInline
            controls={false}
            onEnded={() => setPlaying(false)}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setDurationSec(d);
            }}
            aria-label={t.framePlayback}
          />
        ) : null}
        {!showLive && !showPlayback ? (
          <div className="flex aspect-[3/4] w-full items-center justify-center bg-black/40">
            <Video
              className="h-8 w-8 text-teal-400/40"
              strokeWidth={1.25}
              aria-hidden
            />
          </div>
        ) : null}
      </div>

      <div className="flex items-baseline justify-between px-0.5">
        <p className="font-editorial text-base font-medium tracking-tight text-teal-200/90 tabular-nums">
          {displayCurrent}
        </p>
        <p className="font-editorial text-base tabular-nums text-teal-500/50">
          {displayMax}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {phase === "idle" || phase === "error" ? (
          <button
            type="button"
            onClick={() => void startRecording()}
            className={`${sanctuarySecondaryButton} w-full`}
          >
            <Video className="h-3.5 w-3.5" aria-hidden />
            {t.start}
          </button>
        ) : null}

        {phase === "recording" ? (
          <button
            type="button"
            onClick={stopRecording}
            className={`${sanctuarySubmitButton} inline-flex w-full items-center justify-center gap-2`}
          >
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
            {t.stop}
          </button>
        ) : null}

        {phase === "preview" ? (
          <>
            <button
              type="button"
              onClick={togglePlay}
              className={`${sanctuaryGhostButton} w-full`}
            >
              {playing ? t.pause : t.play}
            </button>
            <button
              type="button"
              onClick={() => void upload()}
              className={`${sanctuarySecondaryButton} w-full`}
            >
              {t.keep}
            </button>
            <button
              type="button"
              onClick={retake}
              className={`${sanctuaryGhostButton} w-full`}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              {t.retake}
            </button>
          </>
        ) : null}

        {phase === "uploading" ? (
          <p className="inline-flex items-center justify-center gap-2 text-sm font-light text-teal-200/80">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t.uploading}
          </p>
        ) : null}

        {phase === "ready" ? (
          <>
            <p className="text-center text-sm font-light text-teal-100/85">
              {t.ready}
            </p>
            <button
              type="button"
              onClick={retake}
              className={`${sanctuaryGhostButton} w-full`}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              {t.retake}
            </button>
          </>
        ) : null}
      </div>

      {error ? (
        <p className="text-center text-sm font-light text-amber-200/90" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
