"use client";

import { useEffect, useRef, useState } from "react";

import {
  VideoTrimModal,
  type VideoTrimModalCopy,
  type VideoTrimSelection,
} from "@/src/components/media/VideoTrimModal";
import {
  diagnoseVideoAudio,
  type VideoAudioDiagnosis,
} from "@/src/lib/media/diagnoseVideoAudio";
import {
  prepareVideoForUpload,
  type PrepareVideoResult,
} from "@/src/lib/media/prepareVideoForUpload";
import { VIDEO_TRIM_DURATION_SEC } from "@/src/lib/wizard/storyboardPacing";

/**
 * Lab S7 — prepareVideoForUpload + Commit 8 modale trim.
 * Dev only · `/[lang]/test-s7-prepare` · aucun upload Coffre.
 *
 * Diagnostic audio (pas de GO produit) : sépare preview muted vs piste absente.
 */
export function TestS7PrepareLab({
  trimCopy,
}: {
  trimCopy: VideoTrimModalCopy;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PrepareVideoResult | null>(null);
  const [status, setStatus] = useState(
    "Choisir une vidéo, puis Préparer (geste utilisateur requis).",
  );
  const [preparedUrl, setPreparedUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [trimOpen, setTrimOpen] = useState(false);
  const [sourceDurationSec, setSourceDurationSec] = useState<number | null>(
    null,
  );
  const [sourceDiag, setSourceDiag] = useState<VideoAudioDiagnosis | null>(
    null,
  );
  const [preparedDiag, setPreparedDiag] =
    useState<VideoAudioDiagnosis | null>(null);
  const [preparedMuted, setPreparedMuted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const preparedVideoRef = useRef<HTMLVideoElement | null>(null);
  const preparedUrlRef = useRef<string | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  preparedUrlRef.current = preparedUrl;
  sourceUrlRef.current = sourceUrl;

  // Unmount seulement. Ne pas abort quand l’URL preview change :
  // clearPreparedPreview() relançait l’effet et annulait la prépa en cours.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (preparedUrlRef.current) URL.revokeObjectURL(preparedUrlRef.current);
      if (sourceUrlRef.current) URL.revokeObjectURL(sourceUrlRef.current);
    };
  }, []);

  function clearPreparedPreview() {
    setPreparedUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreparedDiag(null);
  }

  function clearSourcePreview() {
    setSourceUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSourceDiag(null);
  }

  async function readSourceDurationSec(blob: Blob): Promise<number | null> {
    const url = URL.createObjectURL(blob);
    try {
      return await new Promise<number | null>((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        const timer = setTimeout(() => resolve(null), 12_000);
        video.onloadedmetadata = () => {
          clearTimeout(timer);
          const d = video.duration;
          resolve(Number.isFinite(d) && d > 0 ? d : null);
        };
        video.onerror = () => {
          clearTimeout(timer);
          resolve(null);
        };
        video.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function runPrepare(trimStartSec: number) {
    if (!file) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    clearPreparedPreview();
    setResult(null);
    setBusy(true);
    setStatus(`Préparation… (trimStart=${trimStartSec.toFixed(2)}s)`);

    try {
      const next = await prepareVideoForUpload(file, {
        signal: controller.signal,
        trimStartSec,
      });

      // Abort gagnant même si un résultat tardif arrive.
      if (controller.signal.aborted) {
        setResult({ ok: false, error: "video_prepare_cancelled" });
        setStatus("Annulé.");
        return;
      }

      setResult(next);
      if (next.ok) {
        const url = URL.createObjectURL(next.preparedFile);
        setPreparedUrl(url);
        setPreparedMuted(false);
        const diag = await diagnoseVideoAudio(next.preparedFile, {
          label: "prepared",
          fileName: next.preparedFile.name,
        });
        if (controller.signal.aborted) {
          clearPreparedPreview();
          setResult({ ok: false, error: "video_prepare_cancelled" });
          setStatus("Annulé.");
          return;
        }
        setPreparedDiag(diag);
        const audioN = diag.containerProbe?.audioTrackCount ?? "?";
        const audioCodec = diag.containerProbe?.audioCodec ?? "null";
        const fps = sourceDiag?.mediabunny?.bestGuessFrameRate;
        setStatus(
          `OK · path=${next.path} · effective=${next.effectiveDurationSec.toFixed(3)}s · prepared.audioTracks=${audioN} (${audioCodec}) · ${next.orientedWidth}×${next.orientedHeight}${fps ? ` · source~${Math.round(fps)}fps` : ""}`,
        );
      } else {
        setStatus(
          next.detail
            ? `Échec · ${next.error} · ${next.detail}`
            : `Échec · ${next.error}`,
        );
      }
    } catch (error) {
      if (controller.signal.aborted) {
        setResult({ ok: false, error: "video_prepare_cancelled" });
        setStatus("Annulé.");
      } else {
        setResult(null);
        setStatus(error instanceof Error ? error.message : "Erreur inattendue");
      }
    } finally {
      setBusy(false);
    }
  }

  async function onPrepare() {
    if (!file || busy) return;

    setStatus("Lecture de la durée…");
    setBusy(true);
    const duration = await readSourceDurationSec(file);
    setBusy(false);

    if (duration === null) {
      setStatus("Échec · video_duration_unknown (métadonnées)");
      setResult({ ok: false, error: "video_duration_unknown" });
      return;
    }

    setSourceDurationSec(duration);

    if (duration > VIDEO_TRIM_DURATION_SEC) {
      setTrimOpen(true);
      setStatus(
        `Durée ${duration.toFixed(2)}s · choisir la fenêtre de ${VIDEO_TRIM_DURATION_SEC}s · (modale : video.muted=true → silence attendu dans l’aperçu découpe)`,
      );
      return;
    }

    await runPrepare(0);
  }

  function onTrimConfirm(selection: VideoTrimSelection) {
    setTrimOpen(false);
    setStatus(
      `Extrait confirmé · trimStart=${selection.trimStartSec.toFixed(2)}s · durée demandée=${selection.durationSec}s`,
    );
    void runPrepare(selection.trimStartSec);
  }

  function onTrimCancel() {
    setTrimOpen(false);
    setStatus("Découpe annulée. Aucune préparation lancée.");
  }

  function onCancelEncode() {
    abortRef.current?.abort();
    setStatus("Annulation… (arrêt encode en cours)");
  }

  return (
    <div className="min-h-screen bg-[#050505] px-6 py-10 text-zinc-200">
      <div className="mx-auto max-w-3xl">
        <p className="text-[10px] font-light uppercase tracking-[0.28em] text-zinc-500">
          Lab S7 · prepareVideoForUpload · diagnostic audio
        </p>
        <h1 className="mt-3 font-serif text-3xl font-medium tracking-wide text-zinc-100">
          Test S7 Prepare
        </h1>
        <p className="mt-3 max-w-xl text-sm font-light leading-relaxed text-zinc-400">
          Isolé du Coffre. Diagnostic : 1) son source hors modale, 2) piste
          audio dans le MP4 préparé (path + probe). Pas de GO commit tant que
          le son n’est pas tranché.
        </p>

        <label className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center transition-colors hover:border-teal-400/30">
          <input
            type="file"
            accept="video/*"
            className="sr-only"
            disabled={busy || trimOpen}
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null;
              setFile(next);
              setResult(null);
              setSourceDurationSec(null);
              setTrimOpen(false);
              clearPreparedPreview();
              clearSourcePreview();
              if (!next) {
                setStatus("Choisir une vidéo, puis Préparer.");
                e.currentTarget.value = "";
                return;
              }
              const url = URL.createObjectURL(next);
              setSourceUrl(url);
              setStatus(
                `Fichier : ${next.name} (${Math.round(next.size / 1024)} Ko) · diagnostic…`,
              );
              void diagnoseVideoAudio(next, {
                label: "source",
                fileName: next.name,
              }).then((diag) => {
                setSourceDiag(diag);
                const v = diag.containerProbe?.videoCodec ?? diag.mediabunny?.videoCodec;
                const a = diag.containerProbe?.audioTrackCount;
                const ac =
                  diag.containerProbe?.audioCodec ??
                  diag.mediabunny?.audioCodec;
                setStatus(
                  `Source · ${next.name} · video=${v ?? "?"} · audioTracks=${a ?? (diag.mediabunny?.hasAudioTrack ? 1 : 0)} (${ac ?? "null"}) · hevc?=${diag.containerProbe?.looksHevc ?? "?"}`,
                );
              });
              e.currentTarget.value = "";
            }}
          />
          <span className="text-sm font-light text-zinc-300">
            {file ? file.name : "Choisir une vidéo"}
          </span>
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!file || busy || trimOpen}
            onClick={() => {
              void onPrepare();
            }}
            className="rounded-lg border border-teal-400/40 bg-teal-400/10 px-4 py-2 text-sm font-light text-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Préparation…" : "Préparer"}
          </button>
          <button
            type="button"
            disabled={!busy}
            onClick={onCancelEncode}
            className="rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-light text-zinc-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Annuler
          </button>
        </div>

        <p
          className="mt-4 text-sm font-light text-teal-300/90"
          aria-live="polite"
        >
          {status}
        </p>

        {sourceUrl ? (
          <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-black p-2">
            <p className="px-1 pb-2 text-[10px] font-light uppercase tracking-[0.2em] text-zinc-500">
              A · Source (hors modale) · contrôles natifs, non muted
            </p>
            <video
              src={sourceUrl}
              controls
              playsInline
              preload="auto"
              className="max-h-[40vh] w-full bg-black"
            />
            <p className="mt-2 px-1 text-xs font-light text-zinc-500">
              iPhone 60/120 fps : écran noir avant Play, normal (Safari ne
              décode la 1ʳᵉ frame qu’à la lecture). Son / image après Play =
              source OK. Échec Préparer ensuite = bug encode/preuve decode.
            </p>
          </div>
        ) : null}

        {sourceDiag || preparedDiag || result ? (
          <pre className="mt-4 overflow-x-auto rounded-xl border border-amber-400/20 bg-black/60 p-4 text-xs font-light leading-relaxed text-amber-100/90">
            {JSON.stringify(
              {
                note: {
                  trimModalPreview:
                    "Modale : muted au scrub ; Play démute (geste). Encode OK si prepared.audioTrackCount=1.",
                  preparedSilenceIfAudioTracks0:
                    "Si prepared.audioTrackCount=0, démuter ne sert à rien (perte encode).",
                },
                source: sourceDiag,
                prepare: result?.ok
                  ? {
                      ok: true,
                      path: result.path,
                      sourceDurationSec: result.sourceDurationSec,
                      effectiveDurationSec: result.effectiveDurationSec,
                      orientedWidth: result.orientedWidth,
                      orientedHeight: result.orientedHeight,
                      reusedOriginal: result.reusedOriginal,
                      preparedBytes: result.preparedFile.size,
                      preparedType: result.preparedFile.type,
                      preparedName: result.preparedFile.name,
                    }
                  : result,
                prepared: preparedDiag,
              },
              null,
              2,
            )}
          </pre>
        ) : null}

        {preparedUrl ? (
          <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-black p-2">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <p className="text-[10px] font-light uppercase tracking-[0.2em] text-zinc-500">
                B · MP4 préparé · path={result && result.ok ? result.path : "?"}
              </p>
              <label className="flex items-center gap-2 text-xs font-light text-zinc-400">
                <input
                  type="checkbox"
                  checked={preparedMuted}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setPreparedMuted(next);
                    const el = preparedVideoRef.current;
                    if (el) {
                      el.muted = next;
                      if (!next) el.volume = 1;
                    }
                  }}
                />
                muted={preparedMuted ? "true" : "false"}
              </label>
            </div>
            <video
              ref={preparedVideoRef}
              src={preparedUrl}
              controls
              muted={preparedMuted}
              playsInline
              className="max-h-[70vh] w-full"
              onPlay={(e) => {
                // Safari iOS : synchroniser le DOM (prop React muted parfois ignoré).
                const el = e.currentTarget;
                el.muted = preparedMuted;
                if (!preparedMuted) el.volume = 1;
              }}
            />
            <p className="mt-2 px-1 text-xs font-light text-zinc-500">
              audioTracks préparés :{" "}
              {preparedDiag?.containerProbe?.audioTrackCount ?? "?"} (
              {preparedDiag?.containerProbe?.audioCodec ?? "null"}). Encode OK
              si ≥ 1. Silence preview avec piste présente = lecture UI / iOS
              (pas perte encode).
            </p>
          </div>
        ) : null}
      </div>

      {file && sourceDurationSec !== null ? (
        <VideoTrimModal
          file={file}
          sourceDurationSec={sourceDurationSec}
          open={trimOpen}
          copy={trimCopy}
          onConfirm={onTrimConfirm}
          onCancel={onTrimCancel}
        />
      ) : null}
    </div>
  );
}
