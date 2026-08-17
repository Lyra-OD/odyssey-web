"use client";

import { Camera, Check, ImagePlus, Loader2 } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";
import { parseApiJson } from "@/src/lib/http/parseApiJson";
import {
  sanctuaryGhostButton,
  sanctuaryHoverDashed,
  sanctuarySubmitButton,
} from "@/src/lib/contribute/sanctuaryChrome";
import type { Locale } from "@/i18n.config";

export type ScannerCaptureCopy = {
  title: string;
  subtitle: string;
  cameraCta: string;
  galleryCta: string;
  sending: string;
  added: string;
  nextHint: string;
  invalidTitle: string;
  invalidBody: string;
  errorGeneric: string;
  quota: string;
  tooLarge: string;
  unsupported: string;
  poweredBy: string;
};

type Props = {
  token: string;
  locale: Locale;
  copy: ScannerCaptureCopy;
};

type RowStatus = "uploading" | "ok" | "failed";

type QueueRow = {
  id: string;
  name: string;
  status: RowStatus;
};

function errorCopy(code: string | undefined, copy: ScannerCaptureCopy): string {
  if (code === "media_quota_exceeded" || code === "session_upload_limit") {
    return copy.quota;
  }
  if (code === "file_too_large") return copy.tooLarge;
  if (code === "unsupported_media_type") return copy.unsupported;
  return copy.errorGeneric;
}

export function ScannerCaptureClient({ token, locale, copy }: Props) {
  const cameraId = useId();
  const galleryId = useId();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [tributeName, setTributeName] = useState<string | null>(null);
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setInvalid(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/scan/sessions/${encodeURIComponent(token)}?lang=${locale}`,
        );
        const body = await parseApiJson<{
          ok?: boolean;
          tributeName?: string;
        }>(res);
        if (cancelled) return;
        if (!res.ok || !body.ok) {
          setInvalid(true);
          return;
        }
        setTributeName(body.tributeName ?? null);
        setReady(true);
      } catch {
        if (!cancelled) setInvalid(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, token]);

  const uploadFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return;
      setBusy(true);
      setBanner(null);
      const files = Array.from(list);

      for (const file of files) {
        const id = `${file.name}-${file.size}-${file.lastModified}`;
        setRows((prev) => [...prev, { id, name: file.name, status: "uploading" }]);

        const form = new FormData();
        form.set("file", file);

        try {
          const res = await fetch(
            `/api/scan/sessions/${encodeURIComponent(token)}/upload`,
            { method: "POST", body: form },
          );
          const body = await parseApiJson<{ ok?: boolean; error?: string }>(res);
          const ok = res.ok && body.ok === true;
          setRows((prev) =>
            prev.map((row) =>
              row.id === id
                ? { ...row, status: ok ? "ok" : "failed" }
                : row,
            ),
          );
          if (!ok) {
            setBanner(errorCopy(body.error, copy));
          } else {
            setBanner(copy.added);
          }
        } catch {
          setRows((prev) =>
            prev.map((row) =>
              row.id === id ? { ...row, status: "failed" } : row,
            ),
          );
          setBanner(copy.errorGeneric);
        }
      }

      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    },
    [copy, token],
  );

  if (invalid) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#020202] px-6 text-zinc-100">
        <div className="mx-auto flex max-w-[16rem] origin-center scale-[0.82] justify-center">
          <OdysseyConnexionMark wordmark="Odyssey" animate />
        </div>
        <h1 className="mt-10 text-center font-editorial text-2xl font-medium">
          {copy.invalidTitle}
        </h1>
        <p className="mt-3 max-w-sm text-center text-sm font-light text-white/55">
          {copy.invalidBody}
        </p>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020202] text-zinc-100">
        <Loader2 className="h-6 w-6 animate-spin text-teal-300/80" aria-hidden />
      </main>
    );
  }

  const subtitle = tributeName
    ? copy.subtitle.replace("{name}", tributeName)
    : copy.subtitle.replace("{name}", locale === "en" ? "this tribute" : "cet hommage");

  return (
    <main className="min-h-screen bg-[#020202] px-5 py-10 text-zinc-100">
      <div className="mx-auto flex max-w-md flex-col">
        <div className="mx-auto flex max-w-[12rem] origin-center scale-[0.72] justify-center">
          <OdysseyConnexionMark wordmark="Odyssey" animate={false} />
        </div>
        <h1 className="mt-6 text-center font-editorial text-2xl font-medium tracking-tight">
          {copy.title}
        </h1>
        <p className="mt-3 text-center text-sm font-light leading-relaxed text-white/50">
          {subtitle}
        </p>

        <input
          ref={cameraRef}
          id={cameraId}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => void uploadFiles(e.target.files)}
        />
        <input
          ref={galleryRef}
          id={galleryId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          className="sr-only"
          onChange={(e) => void uploadFiles(e.target.files)}
        />

        <button
          type="button"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          className={`mt-10 w-full ${sanctuarySubmitButton} disabled:opacity-40`}
        >
          <span className="inline-flex items-center gap-2">
            <Camera className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            {copy.cameraCta}
          </span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => galleryRef.current?.click()}
          className={`mt-3 w-full ${sanctuaryGhostButton} ${sanctuaryHoverDashed} disabled:opacity-40`}
        >
          <ImagePlus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          {copy.galleryCta}
        </button>

        {busy ? (
          <p className="mt-6 flex items-center justify-center gap-2 text-sm font-light text-teal-200/80">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {copy.sending}
          </p>
        ) : banner ? (
          <p className="mt-6 text-center text-sm font-light text-teal-200/85" role="status">
            {banner}
          </p>
        ) : (
          <p className="mt-6 text-center text-xs font-light text-zinc-500">
            {copy.nextHint}
          </p>
        )}

        {rows.length > 0 ? (
          <ul className="mt-8 space-y-2 border-t border-white/8 pt-5" aria-live="polite">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 text-sm font-light text-zinc-400"
              >
                <span className="min-w-0 truncate tracking-wide">{row.name}</span>
                {row.status === "uploading" ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                ) : row.status === "ok" ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-teal-300" aria-hidden />
                ) : (
                  <span className="text-[10px] uppercase tracking-[0.18em] text-fuchsia-300">
                    ×
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}

        <footer className="mt-16 flex flex-col items-center gap-1 text-center">
          <p className="text-[8px] font-medium uppercase tracking-[0.44em] text-white/26">
            {copy.poweredBy}
          </p>
          <p className="font-brand text-[10px] font-medium uppercase tracking-[0.28em] text-white/36">
            Odyssey
          </p>
        </footer>
      </div>
    </main>
  );
}
