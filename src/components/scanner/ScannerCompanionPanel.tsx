"use client";

import { Camera, Copy, Loader2, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";

import { useFinePointer } from "@/src/hooks/useFinePointer";
import { parseApiJson } from "@/src/lib/http/parseApiJson";
import {
  sanctuaryCardSurface,
  sanctuaryGhostButton,
} from "@/src/lib/contribute/sanctuaryChrome";
import type { Locale } from "@/i18n.config";

export type ScannerCompanionPanelCopy = {
  eyebrow: string;
  title: string;
  description: string;
  /** Sur téléphone, le QR n'a pas de sens : on photographie directement. */
  mobileDescription: string;
  openCapture: string;
  badge: string;
  hint: string;
  instructions: string;
  generating: string;
  copyLink: string;
  copied: string;
  qrAlt: string;
  errorGeneric: string;
  unavailable: string;
  waitingPhone: string;
  photosReceived: string;
};

type CachedSession = {
  scanUrl: string;
  expiresAt: string;
};

type Props = {
  projectId: string;
  locale: Locale;
  copy: ScannerCompanionPanelCopy;
  className?: string;
};

function cacheKey(projectId: string): string {
  return `odyssey.scanSession.v1.${projectId}`;
}

function readCachedSession(projectId: string): CachedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(cacheKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSession;
    if (!parsed.scanUrl || !parsed.expiresAt) return null;
    if (new Date(parsed.expiresAt).getTime() - Date.now() < 2 * 60 * 1000) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedSession(projectId: string, session: CachedSession): void {
  try {
    window.sessionStorage.setItem(cacheKey(projectId), JSON.stringify(session));
  } catch {
    /* quota / private mode */
  }
}

/**
 * QR Scanner Compagnon — Étape 3 Coffre.
 * Canon : docs/SCANNER_COMPANION.md Phase A.
 */
export function ScannerCompanionPanel({
  projectId,
  locale,
  copy,
  className = "",
}: Props) {
  const [scanUrl, setScanUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const finePointer = useFinePointer();

  const mintSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cached = readCachedSession(projectId);
      let nextUrl = cached?.scanUrl ?? null;

      if (!nextUrl) {
        const res = await fetch("/api/scan/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, locale }),
        });
        const body = await parseApiJson<{
          ok?: boolean;
          scanUrl?: string;
          expiresAt?: string;
          error?: string;
        }>(res);

        if (body.error === "scan_sessions_missing") {
          setError(copy.unavailable);
          return;
        }
        if (!res.ok || !body.ok || !body.scanUrl) {
          setError(copy.errorGeneric);
          return;
        }
        nextUrl = body.scanUrl;
        if (body.expiresAt) {
          writeCachedSession(projectId, {
            scanUrl: body.scanUrl,
            expiresAt: body.expiresAt,
          });
        }
      }

      setScanUrl(nextUrl);
      const dataUrl = await QRCode.toDataURL(nextUrl, {
        width: 220,
        margin: 1,
        color: { dark: "#e4e4e7", light: "#020202" },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setError(copy.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [copy.errorGeneric, copy.unavailable, locale, projectId]);

  useEffect(() => {
    void mintSession();
  }, [mintSession]);

  const copyLink = async () => {
    if (!scanUrl) return;
    try {
      await navigator.clipboard.writeText(scanUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(copy.errorGeneric);
    }
  };

  return (
    <aside
      className={`relative overflow-hidden px-5 py-6 md:px-7 md:py-7 ${sanctuaryCardSurface} ${className}`}
      aria-label={copy.title}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 12% 20%, rgba(45,212,191,0.12) 0%, transparent 55%)",
        }}
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
        {/* Le QR ne sert qu'à passer d'un écran à un téléphone : sur téléphone,
            il demanderait de scanner l'écran qu'on tient déjà en main. */}
        <div
          className={`mx-auto h-[7.25rem] w-[7.25rem] shrink-0 items-center justify-center overflow-hidden rounded-sm border border-teal-400/35 bg-[#020202]/80 sm:mx-0 ${
            finePointer ? "flex" : "hidden"
          }`}
        >
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={copy.qrAlt}
              className="h-full w-full object-contain p-1"
            />
          ) : loading ? (
            <Loader2
              className="h-6 w-6 animate-spin text-teal-300/80"
              strokeWidth={1.25}
              aria-hidden
            />
          ) : (
            <Smartphone
              className="h-7 w-7 text-teal-300/80"
              strokeWidth={1.25}
              aria-hidden
            />
          )}
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-teal-400/75">
            {copy.eyebrow}
          </p>
          <h3 className="mt-2 font-editorial text-xl font-medium tracking-tight text-zinc-50 md:text-2xl">
            {copy.title}
          </h3>
          <p className="mt-3 text-sm font-light leading-relaxed text-white/50 md:text-[0.95rem]">
            {finePointer ? copy.description : copy.mobileDescription}
          </p>
          <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">
            {error ? error : loading ? copy.generating : copy.instructions}
          </p>
          {scanUrl && !error ? (
            <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row">
              {finePointer ? null : (
                <a
                  href={scanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-teal-400/35 bg-teal-400/[0.08] px-4 text-sm font-medium text-teal-100 transition-colors hover:border-teal-400/50 hover:bg-teal-400/[0.12] sm:w-auto"
                >
                  <Camera className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                  {copy.openCapture}
                </a>
              )}
              <button
                type="button"
                onClick={() => void copyLink()}
                className={sanctuaryGhostButton}
              >
                <Copy className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                {copied ? copy.copied : copy.copyLink}
              </button>
              {finePointer ? (
                <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-600">
                  {copy.waitingPhone}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
