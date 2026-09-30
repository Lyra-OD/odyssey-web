"use client";

import { useCallback, useState } from "react";

import {
  detectImageFocalFromBlob,
  type DetectedFocalPoint,
} from "@/src/lib/media/detectImageFocal";

/**
 * Lab C5 — drop une photo, voir si FaceDetector pose une focale.
 * Dev only · `/[lang]/test-focal`
 */
export function TestFocalLab() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [point, setPoint] = useState<DetectedFocalPoint | null>(null);
  const [status, setStatus] = useState<string>("Dépose un portrait JPEG/PNG/WebP.");
  const [busy, setBusy] = useState(false);

  const onFile = useCallback(async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setPoint(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStatus("Analyse…");

    const hasApi =
      typeof window !== "undefined" &&
      typeof (
        window as unknown as { FaceDetector?: unknown }
      ).FaceDetector === "function";

    if (!hasApi) {
      setStatus(
        "FaceDetector indisponible dans ce navigateur (Chrome/Edge recommandé). Résultat : null.",
      );
      setBusy(false);
      return;
    }

    try {
      const pt = await detectImageFocalFromBlob(file);
      setPoint(pt);
      setStatus(
        pt
          ? `Focale détectée · x=${pt.x.toFixed(3)} · y=${pt.y.toFixed(3)}`
          : "Aucun visage détecté (null).",
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Erreur de détection",
      );
    } finally {
      setBusy(false);
    }
  }, [previewUrl]);

  return (
    <div className="min-h-screen bg-[#050505] px-6 py-10 text-zinc-200">
      <div className="mx-auto max-w-3xl">
        <p className="text-[10px] font-light uppercase tracking-[0.28em] text-zinc-500">
          Lab C5 · focale auto
        </p>
        <h1 className="mt-3 font-serif text-3xl font-medium tracking-wide text-zinc-100">
          Test Focal
        </h1>
        <p className="mt-3 max-w-xl text-sm font-light leading-relaxed text-zinc-400">
          Vérifie la détection visage client avant / après upload wizard.
          Chrome ou Edge requis pour{" "}
          <code className="text-zinc-300">FaceDetector</code>.
        </p>

        <label className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-12 text-center transition-colors hover:border-teal-400/30">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              void onFile(file);
              e.currentTarget.value = "";
            }}
          />
          <span className="text-sm font-light text-zinc-300">
            {busy ? "Analyse…" : "Choisir une image"}
          </span>
        </label>

        <p className="mt-4 text-sm font-light text-teal-300/90" aria-live="polite">
          {status}
        </p>

        {previewUrl ? (
          <div className="mt-8 flex justify-center overflow-hidden rounded-xl border border-white/10 bg-black p-2">
            <div className="relative inline-block max-h-[70vh] max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt=""
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
              {point ? (
                <span
                  className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-teal-300 bg-teal-400/40 shadow-[0_0_12px_rgba(45,212,191,0.8)]"
                  style={{
                    left: `${point.x * 100}%`,
                    top: `${point.y * 100}%`,
                  }}
                  aria-hidden
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
