"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Loader2, Share2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";

import {
  DURATION_BREATH,
  DURATION_RITUAL,
  EASE_OUT_LUXE,
} from "@/src/lib/motion/easing";
import { sanctuarySubmitButton } from "@/src/lib/contribute/sanctuaryChrome";

export type SanctuaryInvitePanelCopy = {
  triggerLabel: string;
  triggerCta: string;
  triggerOpenAria: string;
  title: string;
  description: string;
  generateCta: string;
  generating: string;
  copyLink: string;
  copied: string;
  copyMessage: string;
  messageCopied: string;
  shareHint: string;
  qrAlt: string;
  closeAria: string;
  errorGeneric: string;
  needProject: string;
  /** Contient `{name}` et `{url}`. */
  shareMessage: string;
};

type TriggerProps = {
  onOpen: () => void;
  copy: Pick<
    SanctuaryInvitePanelCopy,
    "triggerLabel" | "triggerCta" | "triggerOpenAria"
  >;
  disabled?: boolean;
  className?: string;
};

export function SanctuaryInviteTrigger({
  onOpen,
  copy,
  disabled = false,
  className = "",
}: TriggerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={disabled}
      aria-label={copy.triggerOpenAria}
      className={`group inline-flex flex-col items-start gap-0.5 text-left disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">
        {copy.triggerLabel}
      </span>
      <span className="inline-flex items-center gap-1.5 font-editorial text-base font-medium text-zinc-100">
        <span className="border-b border-transparent pb-0.5 transition-colors duration-200 group-hover:border-teal-400/40">
          {copy.triggerCta}
        </span>
        <Share2
          className="h-3.5 w-3.5 text-zinc-500 transition-colors duration-200 group-hover:text-teal-300"
          strokeWidth={1.5}
          aria-hidden
        />
      </span>
    </button>
  );
}

type PanelProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  locale: "fr" | "en";
  tributeName: string;
  copy: SanctuaryInvitePanelCopy;
};

/**
 * Panneau Inviter — génère lien Sanctuaire + QR + copy Immortaliser.
 * API : POST /api/projects/[id]/contribute-link
 */
export function SanctuaryInvitePanel({
  isOpen,
  onClose,
  projectId,
  locale,
  tributeName,
  copy,
}: PanelProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close]);

  useEffect(() => {
    if (!isOpen) {
      setShareUrl(null);
      setQrDataUrl(null);
      setError(null);
      setLinkCopied(false);
      setMessageCopied(false);
      setLoading(false);
    }
  }, [isOpen]);

  const generateLink = async () => {
    if (!projectId) {
      setError(copy.needProject);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/contribute-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        shareUrl?: string;
        error?: string;
      };
      if (!res.ok || !body.ok || !body.shareUrl) {
        setError(copy.errorGeneric);
        return;
      }
      setShareUrl(body.shareUrl);
      const dataUrl = await QRCode.toDataURL(body.shareUrl, {
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
  };

  const shareMessage = shareUrl
    ? copy.shareMessage
        .replace("{name}", tributeName)
        .replace("{url}", shareUrl)
    : "";

  const copyText = async (text: string, kind: "link" | "message") => {
    try {
      await navigator.clipboard.writeText(text);
      if (kind === "link") {
        setLinkCopied(true);
        window.setTimeout(() => setLinkCopied(false), 2000);
      } else {
        setMessageCopied(true);
        window.setTimeout(() => setMessageCopied(false), 2000);
      }
    } catch {
      setError(copy.errorGeneric);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[60] flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION_BREATH, ease: EASE_OUT_LUXE }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label={copy.closeAria}
            onClick={close}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={copy.title}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: DURATION_RITUAL, ease: EASE_OUT_LUXE }}
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#020202] px-6 py-8 shadow-[-24px_0_80px_rgba(0,0,0,0.45)] md:px-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-teal-400/75">
                  {copy.triggerLabel}
                </p>
                <h2 className="mt-3 font-editorial text-2xl font-medium tracking-tight text-zinc-50">
                  {copy.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
                aria-label={copy.closeAria}
              >
                <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>
            </div>

            <p className="mt-4 text-sm font-light leading-relaxed text-zinc-400">
              {copy.description}
            </p>

            <div className="mt-8 flex-1 space-y-6 overflow-y-auto">
              {!shareUrl ? (
                <button
                  type="button"
                  onClick={() => void generateLink()}
                  disabled={loading || !projectId}
                  className={`${sanctuarySubmitButton} inline-flex min-h-[48px] w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      {copy.generating}
                    </>
                  ) : (
                    copy.generateCta
                  )}
                </button>
              ) : (
                <>
                  {qrDataUrl ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-teal-400/20 bg-teal-400/[0.04] px-4 py-6">
                      <img
                        src={qrDataUrl}
                        alt={copy.qrAlt}
                        className="h-[180px] w-[180px] rounded-lg"
                      />
                      <p className="text-center text-[10px] uppercase tracking-[0.28em] text-zinc-500">
                        {copy.shareHint}
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <p className="break-all font-label text-[11px] leading-relaxed text-zinc-300">
                      {shareUrl}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => void copyText(shareUrl, "link")}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-teal-400/30 bg-teal-400/[0.06] px-4 text-[11px] font-medium uppercase tracking-[0.22em] text-teal-100 transition-colors hover:border-teal-400/45"
                    >
                      {linkCopied ? (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {linkCopied ? copy.copied : copy.copyLink}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyText(shareMessage, "message")}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-4 text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-300 transition-colors hover:border-white/20 hover:text-zinc-100"
                    >
                      {messageCopied ? (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Share2 className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {messageCopied ? copy.messageCopied : copy.copyMessage}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void generateLink()}
                    disabled={loading}
                    className="w-full text-center text-[10px] uppercase tracking-[0.28em] text-zinc-600 transition-colors hover:text-teal-300/80 disabled:opacity-40"
                  >
                    {loading ? copy.generating : copy.generateCta}
                  </button>
                </>
              )}

              {error ? (
                <p className="text-sm font-light text-amber-200/90" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
