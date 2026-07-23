"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Loader2, Share2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";

import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";
import {
  DURATION_BREATH,
  DURATION_RITUAL,
  EASE_OUT_LUXE,
} from "@/src/lib/motion/easing";
import {
  SANCTUARY_HALO_TEAL,
  SANCTUARY_HALO_UV,
  sanctuaryCardSurface,
  sanctuaryGhostButton,
  sanctuaryHoverDashed,
  sanctuarySecondaryButton,
  sanctuarySelectedSurface,
  sanctuarySubmitButton,
} from "@/src/lib/contribute/sanctuaryChrome";

export type SanctuaryInvitePanelCopy = {
  triggerLabel: string;
  triggerCta: string;
  triggerOpenAria: string;
  title: string;
  description: string;
  generateCta: string;
  generating: string;
  /** CTA Web Share API (mobile) ; fallback = copyLink. */
  shareCta: string;
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
  brandWordmark: string;
  kicker: string;
  poweredBy: string;
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

function SanctuaryInviteAtmosphere({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div
        className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-55 blur-[120px] ${
          compact
            ? "top-[28%] h-[min(42vh,320px)] w-[min(140vw,28rem)]"
            : "top-[32%] h-[min(48vh,420px)] w-[min(140vw,36rem)]"
        }`}
        style={{ backgroundImage: SANCTUARY_HALO_UV }}
      />
      <div
        className={`sanctuary-halo-breathe absolute left-1/2 -translate-x-1/2 -translate-y-1/2 blur-[100px] ${
          compact
            ? "top-[36%] h-[min(36vh,260px)] w-[min(120vw,24rem)]"
            : "top-[40%] h-[min(40vh,340px)] w-[min(120vw,30rem)]"
        }`}
        style={{ backgroundImage: SANCTUARY_HALO_TEAL }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/25 to-transparent" />
    </div>
  );
}

function SanctuaryInviteBrandHeader({
  copy,
  compact = false,
}: {
  copy: Pick<SanctuaryInvitePanelCopy, "brandWordmark" | "kicker">;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "mb-6" : "mb-8"}>
      <div
        className={`mx-auto flex origin-top justify-center ${
          compact
            ? "max-w-[12rem] scale-[0.72]"
            : "max-w-[14rem] scale-[0.78] sm:max-w-[16rem] sm:scale-[0.84]"
        }`}
      >
        <OdysseyConnexionMark
          wordmark={copy.brandWordmark}
          animate
          className="mb-0"
        />
      </div>
      <p className="mt-4 text-center text-[10px] font-medium uppercase tracking-[0.55em] text-white/35">
        {copy.kicker}
      </p>
    </div>
  );
}

function SanctuaryInvitePoweredBy({
  copy,
}: {
  copy: Pick<SanctuaryInvitePanelCopy, "poweredBy" | "brandWordmark">;
}) {
  return (
    <div className="mt-10 flex flex-col items-center gap-1 pb-1 pt-6 text-center">
      <p className="text-[8px] font-medium uppercase tracking-[0.44em] text-white/26">
        {copy.poweredBy}
      </p>
      <p className="font-brand text-[10px] font-medium uppercase leading-none tracking-[0.28em] text-white/36 md:text-[11px]">
        {copy.brandWordmark}
      </p>
    </div>
  );
}

type ContentProps = {
  projectId: string | null;
  locale: "fr" | "en";
  tributeName: string;
  copy: SanctuaryInvitePanelCopy;
  /** Auto-génère le lien dès qu’un projectId est disponible (étape Wizard). */
  autoGenerate?: boolean;
  className?: string;
};

/**
 * Corps Inviter — lien Sanctuaire + QR + copy Immortaliser.
 * API : POST /api/projects/[id]/contribute-link
 */
export function SanctuaryInviteContent({
  projectId,
  locale,
  tributeName,
  copy,
  autoGenerate = false,
  className = "",
}: ContentProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function"
    );
  }, []);

  const generateLink = useCallback(async () => {
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
  }, [projectId, locale, copy.errorGeneric, copy.needProject]);

  useEffect(() => {
    if (!autoGenerate || !projectId || shareUrl || loading) return;
    void generateLink();
  }, [autoGenerate, projectId, shareUrl, loading, generateLink]);

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

  const shareNativeOrCopy = async () => {
    if (!shareUrl) return;
    if (typeof navigator.share !== "function") {
      await copyText(shareUrl, "link");
      return;
    }
    try {
      // Texte avec URL déjà inclus — pas de `url` séparé (évite le doublon WhatsApp).
      await navigator.share({
        title: tributeName.trim() || copy.title,
        text: shareMessage,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      await copyText(shareUrl, "link");
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
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
          ) : !projectId ? (
            copy.needProject
          ) : (
            copy.generateCta
          )}
        </button>
      ) : (
        <>
          {qrDataUrl ? (
            <div
              className={`flex flex-col items-center gap-3 px-4 py-6 ${sanctuaryCardSurface} ${sanctuarySelectedSurface}`}
            >
              <img
                src={qrDataUrl}
                alt={copy.qrAlt}
                className="h-[180px] w-[180px] rounded-sm"
              />
              <p className="text-center text-[10px] uppercase tracking-[0.28em] text-teal-400/70">
                {copy.shareHint}
              </p>
            </div>
          ) : null}

          <div className={`${sanctuaryCardSurface} px-4 py-3`}>
            <p className="break-all font-label text-[11px] leading-relaxed text-zinc-300">
              {shareUrl}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {canNativeShare ? (
              <button
                type="button"
                onClick={() => void shareNativeOrCopy()}
                className={`${sanctuarySubmitButton} inline-flex min-h-[48px] w-full items-center justify-center gap-2`}
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden />
                {copy.shareCta}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void copyText(shareUrl, "link")}
              className={
                canNativeShare
                  ? sanctuarySecondaryButton
                  : `${sanctuarySubmitButton} inline-flex min-h-[48px] w-full items-center justify-center gap-2`
              }
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
              className={sanctuaryGhostButton}
            >
              {messageCopied ? (
                <Check className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
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
  );
}

type StepProps = {
  projectId: string | null;
  locale: "fr" | "en";
  tributeName: string;
  titleId: string;
  stepTitle: string;
  stepDescription: string;
  skipLabel: string;
  onSkip: () => void;
  copy: SanctuaryInvitePanelCopy;
};

/**
 * Étape Wizard « Inviter le cercle » — chrome teal (mark / Propulsé = page Studio).
 */
export function SanctuaryInviteStep({
  projectId,
  locale,
  tributeName,
  titleId,
  stepTitle,
  stepDescription,
  skipLabel,
  onSkip,
  copy,
}: StepProps) {
  return (
    <div className="relative">
      <div className="text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-teal-400/75">
          {copy.triggerLabel}
        </p>
        <h2
          id={titleId}
          className="mt-3 font-editorial text-balance text-[1.65rem] font-medium leading-snug tracking-tight text-zinc-50 md:text-3xl"
        >
          {stepTitle}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light leading-relaxed text-white/50 md:text-base">
          {stepDescription}
        </p>
      </div>

      <div className={`mt-10 px-5 py-8 md:px-8 ${sanctuaryCardSurface}`}>
        <SanctuaryInviteContent
          projectId={projectId}
          locale={locale}
          tributeName={tributeName}
          autoGenerate
          copy={copy}
        />
      </div>

      <button
        type="button"
        className={`mt-8 w-full rounded-sm border border-dashed border-white/15 bg-white/[0.02] py-4 text-center text-base font-light text-zinc-400 transition-colors hover:text-teal-100/90 ${sanctuaryHoverDashed}`}
        onClick={onSkip}
      >
        {skipLabel}
      </button>
    </div>
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
 * Panneau Inviter (off-canvas) — raccourci depuis l’en-tête Wizard.
 */
export function SanctuaryInvitePanel({
  isOpen,
  onClose,
  projectId,
  locale,
  tributeName,
  copy,
}: PanelProps) {
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
            className="relative z-10 flex h-full w-full max-w-md flex-col overflow-hidden border-l border-white/10 bg-[#020202] shadow-[-24px_0_80px_rgba(0,0,0,0.45)]"
          >
            <SanctuaryInviteAtmosphere compact />

            <div className="relative z-10 flex h-full flex-col px-6 py-8 md:px-8">
              <button
                type="button"
                onClick={close}
                className="absolute right-5 top-6 z-20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-teal-400/[0.08] hover:text-teal-100 md:right-7 md:top-8"
                aria-label={copy.closeAria}
              >
                <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>

              <SanctuaryInviteBrandHeader copy={copy} compact />

              <div className="mt-2 text-center">
                <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-teal-400/75">
                  {copy.triggerLabel}
                </p>
                <h2 className="mt-3 font-editorial text-2xl font-medium tracking-tight text-zinc-50">
                  {copy.title}
                </h2>
                <p className="mt-4 text-sm font-light leading-relaxed text-white/50">
                  {copy.description}
                </p>
              </div>

              <div className="mt-8 flex-1 overflow-y-auto">
                <div className={`px-5 py-6 ${sanctuaryCardSurface}`}>
                  <SanctuaryInviteContent
                    projectId={projectId}
                    locale={locale}
                    tributeName={tributeName}
                    copy={copy}
                  />
                </div>
              </div>

              <SanctuaryInvitePoweredBy copy={copy} />
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
