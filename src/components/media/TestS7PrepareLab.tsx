"use client";

import { useEffect, useRef, useState } from "react";

import {
  VideoTrimModal,
  type VideoTrimModalCopy,
  type VideoTrimSelection,
} from "@/src/components/media/VideoTrimModal";
import {
  prepareVideoForUpload,
  type PrepareVideoResult,
} from "@/src/lib/media/prepareVideoForUpload";
import { VIDEO_TRIM_DURATION_SEC } from "@/src/lib/wizard/storyboardPacing";

/**
 * Lab S7 — prepareVideoForUpload + Commit 8 modale trim.
 * Dev only · `/[lang]/test-s7-prepare` · aucun upload Coffre.
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
  const [trimOpen, setTrimOpen] = useState(false);
  const [sourceDurationSec, setSourceDurationSec] = useState<number | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (preparedUrl) URL.revokeObjectURL(preparedUrl);
    };
  }, [preparedUrl]);

  function clearPreparedPreview() {
    setPreparedUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
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
          resolve(
            Number.isFinite(d) && d > 0 ? d : null,
          );
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
    setStatus(
      `Préparation… (trimStart=${trimStartSec.toFixed(2)}s)`,
    );

    try {
      const next = await prepareVideoForUpload(file, {
        signal: controller.signal,
        trimStartSec,
      });
      setResult(next);
      if (next.ok) {
        const url = URL.createObjectURL(next.preparedFile);
        setPreparedUrl(url);
        setStatus(
          `OK · path=${next.path} · effective=${next.effectiveDurationSec.toFixed(3)}s · ${next.orientedWidth}×${next.orientedHeight} · reused=${next.reusedOriginal}`,
        );
      } else {
        setStatus(
          next.detail
            ? `Échec · ${next.error} · ${next.detail}`
            : `Échec · ${next.error}`,
        );
      }
    } catch (error) {
      setResult(null);
      setStatus(
        error instanceof Error ? error.message : "Erreur inattendue",
      );
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
        `Durée ${duration.toFixed(2)}s · choisir la fenêtre de ${VIDEO_TRIM_DURATION_SEC}s`,
      );
      return;
    }

    await runPrepare(0);
  }

  function onTrimConfirm(selection: VideoTrimSelection) {
    setTrimOpen(false);
    void runPrepare(selection.trimStartSec);
  }

  function onTrimCancel() {
    setTrimOpen(false);
    setStatus("Découpe annulée. Aucune préparation lancée.");
  }

  function onCancelEncode() {
    abortRef.current?.abort();
    setStatus("Annulation demandée…");
  }

  return (
    <div className="min-h-screen bg-[#050505] px-6 py-10 text-zinc-200">
      <div className="mx-auto max-w-3xl">
        <p className="text-[10px] font-light uppercase tracking-[0.28em] text-zinc-500">
          Lab S7 · prepareVideoForUpload · Commit 8 trim
        </p>
        <h1 className="mt-3 font-serif text-3xl font-medium tracking-wide text-zinc-100">
          Test S7 Prepare
        </h1>
        <p className="mt-3 max-w-xl text-sm font-light leading-relaxed text-zinc-400">
          Isolé du Coffre. Si la vidéo dépasse 10 s, la modale de découpe
          s’ouvre. Échec de préparation : jamais l’original présenté comme
          succès.
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
              setStatus(
                next
                  ? `Fichier : ${next.name} (${Math.round(next.size / 1024)} Ko)`
                  : "Choisir une vidéo, puis Préparer.",
              );
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

        {result ? (
          <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-4 text-xs font-light leading-relaxed text-zinc-300">
            {JSON.stringify(
              result.ok
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
              null,
              2,
            )}
          </pre>
        ) : null}

        {preparedUrl ? (
          <div className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-black p-2">
            <video
              src={preparedUrl}
              controls
              muted
              playsInline
              className="max-h-[70vh] w-full"
            />
            <p className="mt-2 px-1 text-xs font-light text-zinc-500">
              Preview muted par défaut. Démuter pour vérifier le silence ou
              l’audio (test HEVC + son à consigner).
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
