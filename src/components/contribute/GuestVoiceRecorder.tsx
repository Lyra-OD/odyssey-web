"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, RotateCcw } from "lucide-react";

import {
  emptyWaveLevels,
  normalizeWaveLevels,
  peaksFromAudioBuffer,
  VoiceMemoWaveform,
  VOICE_MEMO_BAR_COUNT,
} from "@/src/components/contribute/VoiceMemoWaveform";
import {
  sanctuaryFieldInput,
  sanctuaryGhostButton,
  sanctuarySecondaryButton,
  sanctuarySubmitButton,
} from "@/src/lib/contribute/sanctuaryChrome";
import { isSanctuaryVisualPreview } from "@/src/lib/contribute/sanctuaryPreview";
import { SANCTUARY_GUEST_VOICE_MAX_SECONDS } from "@/src/lib/contribute/sanctuaryLimits";
import { parseApiJson } from "@/src/lib/http/parseApiJson";
import type { AppDictionary } from "@/lib/dictionaries";

export type GuestVoiceRecorderProps = {
  token: string;
  locale: "fr" | "en";
  contributorName: string;
  contributorEmail?: string | null;
  /** media_assets.id une fois uploadé. */
  mediaId: string | null;
  onMediaIdChange: (mediaId: string | null) => void;
  copy: AppDictionary["sanctuary"]["voice"];
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

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m));
}

/** Format mémo iPhone : 0:05 · 1:30 */
function formatMemoTime(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/**
 * Enregistrement voix Sanctuaire — waveform type Voice Memo + checkout gate.
 */
export function GuestVoiceRecorder({
  token,
  locale,
  contributorName,
  contributorEmail,
  mediaId,
  onMediaIdChange,
  copy: t,
  embedded = false,
}: GuestVoiceRecorderProps) {
  const maxSec = SANCTUARY_GUEST_VOICE_MAX_SECONDS;
  const [phase, setPhase] = useState<Phase>(mediaId ? "ready" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [localName, setLocalName] = useState(contributorName);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [levels, setLevels] = useState<number[]>(() => emptyWaveLevels());
  const [progress, setProgress] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const liveSamplesRef = useRef<number[]>([]);
  const stoppedRef = useRef(false);

  const stopAnalyser = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
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
      stopAnalyser();
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [clearTick, previewUrl, stopAnalyser, stopStream]);

  const resetPreview = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    blobRef.current = null;
    setPlaying(false);
    setProgress(null);
    setDurationSec(0);
    setLevels(emptyWaveLevels());
    liveSamplesRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [previewUrl]);

  const buildPeaksFromBlob = useCallback(async (blob: Blob) => {
    try {
      const ctx = new AudioContext();
      const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
      setLevels(peaksFromAudioBuffer(buf, VOICE_MEMO_BAR_COUNT));
      setDurationSec(buf.duration);
      await ctx.close();
    } catch {
      setLevels(normalizeWaveLevels(liveSamplesRef.current, VOICE_MEMO_BAR_COUNT));
    }
  }, []);

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
    const mime = pickRecorderMime();
    if (!mime && typeof MediaRecorder === "undefined") {
      setError(t.unsupported);
      return;
    }

    resetPreview();
    stoppedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      liveSamplesRef.current = [];

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);

      const pump = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = ((data[i] ?? 128) - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        // Gain modéré : murmure visible, sans saturations permanentes.
        const level = Math.min(1, Math.pow(rms * 5.0, 0.72));
        liveSamplesRef.current.push(level);
        if (liveSamplesRef.current.length > VOICE_MEMO_BAR_COUNT * 4) {
          liveSamplesRef.current = liveSamplesRef.current.slice(
            -VOICE_MEMO_BAR_COUNT * 4,
          );
        }
        const window = liveSamplesRef.current.slice(-VOICE_MEMO_BAR_COUNT);
        setLevels(normalizeWaveLevels(window, VOICE_MEMO_BAR_COUNT));
        rafRef.current = requestAnimationFrame(pump);
      };
      rafRef.current = requestAnimationFrame(pump);

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
        stopAnalyser();
        stopStream();
        const type = recorder.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPhase("preview");
        void buildPeaksFromBlob(blob);
      };
      recorder.start(250);
      setElapsed(0);
      setPhase("recording");
      tickRef.current = setInterval(() => {
        setElapsed((s) => {
          const next = s + 1;
          if (next >= maxSec && !stoppedRef.current) {
            stoppedRef.current = true;
            if (recorder.state !== "inactive") recorder.stop();
          }
          return Math.min(next, maxSec);
        });
      }, 1000);
    } catch {
      stopAnalyser();
      stopStream();
      setPhase("error");
      setError(t.micDenied);
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
    if (!previewUrl) return;
    if (!audioRef.current) {
      const audio = new Audio(previewUrl);
      audioRef.current = audio;
      audio.ontimeupdate = () => {
        if (!audio.duration || !Number.isFinite(audio.duration)) return;
        setProgress(audio.currentTime / audio.duration);
        setElapsed(Math.floor(audio.currentTime));
      };
      audio.onended = () => {
        setPlaying(false);
        setProgress(1);
      };
    }
    const audio = audioRef.current;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play().then(() => setPlaying(true)).catch(() => {
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
      const ext = blob.type.includes("mp4")
        ? "m4a"
        : blob.type.includes("ogg")
          ? "ogg"
          : "webm";
      const file = new File([blob], `voice.${ext}`, {
        type: blob.type.split(";")[0] || "audio/webm",
      });
      const form = new FormData();
      form.set("kind", "voice");
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
      setProgress(null);
    } catch {
      setPhase("preview");
      setError(t.uploadFailed);
    }
  };

  const displayCurrent =
    phase === "recording"
      ? formatMemoTime(elapsed)
      : phase === "preview" || phase === "uploading" || phase === "ready"
        ? formatMemoTime(
            playing ? elapsed : durationSec > 0 ? durationSec : elapsed,
          )
        : formatMemoTime(0);
  const displayMax = formatMemoTime(maxSec);
  const showWave =
    phase === "recording" ||
    phase === "preview" ||
    phase === "uploading" ||
    phase === "ready";

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

      {showWave ? (
        <div className="space-y-2">
          <VoiceMemoWaveform
            levels={levels}
            live={phase === "recording"}
            progress={
              phase === "preview" || phase === "uploading" || phase === "ready"
                ? progress
                : null
            }
            aria-label={
              phase === "recording" ? t.waveLive : t.wavePlayback
            }
          />
          <div className="flex items-baseline justify-between px-0.5">
            <p className="font-editorial text-base font-medium tracking-tight text-teal-200/90 tabular-nums">
              {displayCurrent}
            </p>
            <p className="font-editorial text-base tabular-nums text-teal-500/50">
              {displayMax}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-center font-editorial text-sm tabular-nums text-teal-500/50">
          {formatMemoTime(0)} · {displayMax}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {phase === "idle" || phase === "error" ? (
          <button
            type="button"
            onClick={() => void startRecording()}
            className={`${sanctuarySecondaryButton} w-full`}
          >
            <Mic className="h-3.5 w-3.5" aria-hidden />
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
          <p className="inline-flex items-center justify-center gap-2 text-sm font-light text-teal-100/80">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {t.uploading}
          </p>
        ) : null}

        {phase === "ready" ? (
          <>
            <p
              className="text-center text-sm font-light text-teal-200/90"
              role="status"
            >
              {t.ready}
            </p>
            {previewUrl ? (
              <button
                type="button"
                onClick={togglePlay}
                className={`${sanctuaryGhostButton} w-full`}
              >
                {playing ? t.pause : t.play}
              </button>
            ) : null}
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
