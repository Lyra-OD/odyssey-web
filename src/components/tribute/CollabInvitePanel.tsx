"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Loader2, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";
import { parseApiJson } from "@/src/lib/http/parseApiJson";
import {
  DURATION_BREATH,
  DURATION_RITUAL,
  EASE_OUT_LUXE,
} from "@/src/lib/motion/easing";
import type { WizardAccessRole } from "@/src/lib/wizard/collabCapabilities";
import {
  SANCTUARY_HALO_TEAL,
  SANCTUARY_HALO_UV,
  sanctuaryCardSurface,
  sanctuaryGhostButton,
  sanctuarySubmitButton,
} from "@/src/lib/contribute/sanctuaryChrome";

export type CollabInvitePanelCopy = {
  triggerLabel: string;
  triggerCta: string;
  triggerOpenAria: string;
  title: string;
  description: string;
  generateCta: string;
  generating: string;
  copyLink: string;
  copied: string;
  regenerateCta: string;
  closeAria: string;
  errorGeneric: string;
  needProject: string;
  /** Avertissement : un nouveau lien invalide le précédent. */
  warnInvalidate: string;
  /** Avertissement : one-shot. */
  warnOneShot: string;
  /** Indice TTL (ex. valide 14 jours). */
  ttlHint: string;
  brandWordmark: string;
  kicker: string;
  poweredBy: string;
};

type TriggerProps = {
  onOpen: () => void;
  copy: Pick<
    CollabInvitePanelCopy,
    "triggerLabel" | "triggerCta" | "triggerOpenAria"
  >;
  accessRole?: WizardAccessRole;
  disabled?: boolean;
  className?: string;
};

/** Raccourci en-tête Wizard — Owner only. */
export function CollabInviteTrigger({
  onOpen,
  copy,
  accessRole = "owner",
  disabled = false,
  className = "",
}: TriggerProps) {
  if (accessRole === "editor") return null;

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
        <Users
          className="h-3.5 w-3.5 text-zinc-500 transition-colors duration-200 group-hover:text-teal-300"
          strokeWidth={1.5}
          aria-hidden
        />
      </span>
    </button>
  );
}

function CollabInviteAtmosphere({ compact = false }: { compact?: boolean }) {
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

function CollabInviteBrandHeader({
  copy,
  compact = false,
}: {
  copy: Pick<CollabInvitePanelCopy, "brandWordmark" | "kicker">;
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
      <p className="mt-4 text-center text-[10px] font-medium uppercase tracking-[0.55em] text-teal-400/50">
        {copy.kicker}
      </p>
    </div>
  );
}

function CollabInvitePoweredBy({
  copy,
}: {
  copy: Pick<CollabInvitePanelCopy, "poweredBy" | "brandWordmark">;
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
  copy: CollabInvitePanelCopy;
  accessRole?: WizardAccessRole;
  className?: string;
};

/**
 * Corps Co-Créateur — mint / copy / régénérer.
 * API : POST /api/projects/[id]/collab-link (Owner only côté serveur).
 * Pas de QR — Quiet Luxury, geste volontaire.
 */
export function CollabInviteContent({
  projectId,
  locale,
  copy,
  accessRole = "owner",
  className = "",
}: ContentProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const mintLink = useCallback(async () => {
    if (!projectId) {
      setError(copy.needProject);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/collab-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const body = await parseApiJson<{
        ok?: boolean;
        shareUrl?: string;
        error?: string;
      }>(res);
      if (!res.ok || !body.ok || !body.shareUrl) {
        setError(copy.errorGeneric);
        return;
      }
      setShareUrl(body.shareUrl);
      setLinkCopied(false);
    } catch {
      setError(copy.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [projectId, locale, copy.errorGeneric, copy.needProject]);

  const copyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setError(copy.errorGeneric);
    }
  }, [shareUrl, copy.errorGeneric]);

  if (accessRole === "editor") return null;

  return (
    <div className={`space-y-5 ${className}`}>
      <ul className="space-y-2 text-center text-[11px] font-light leading-relaxed text-white/45">
        <li className="text-teal-400/50">{copy.warnInvalidate}</li>
        <li>{copy.warnOneShot}</li>
        <li className="text-zinc-500">{copy.ttlHint}</li>
      </ul>

      {!shareUrl ? (
        <button
          type="button"
          onClick={() => void mintLink()}
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
          <div className={`${sanctuaryCardSurface} border-teal-400/25 px-4 py-3`}>
            <p className="break-all font-label text-[11px] leading-relaxed text-zinc-300">
              {shareUrl}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void copyLink()}
              className={`${sanctuarySubmitButton} inline-flex min-h-[48px] w-full items-center justify-center gap-2`}
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
              onClick={() => void mintLink()}
              disabled={loading}
              className={`${sanctuaryGhostButton} w-full disabled:opacity-40`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  {copy.generating}
                </>
              ) : (
                copy.regenerateCta
              )}
            </button>
          </div>
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

type InlineCardProps = {
  projectId: string | null;
  locale: "fr" | "en";
  copy: CollabInvitePanelCopy;
  accessRole?: WizardAccessRole;
  className?: string;
};

/**
 * Carte embarquée (étapes 2 / 5) — même Content, chrome Quiet Luxury.
 */
export function CollabInviteInlineCard({
  projectId,
  locale,
  copy,
  accessRole = "owner",
  className = "",
}: InlineCardProps) {
  if (accessRole === "editor") return null;

  return (
    <div className={`mt-10 ${className}`}>
      <div className="mb-5 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-teal-400/50">
          {copy.triggerLabel}
        </p>
        <h3 className="mt-2 font-editorial text-xl font-medium tracking-tight text-zinc-100 md:text-2xl">
          {copy.title}
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm font-light leading-relaxed text-white/45">
          {copy.description}
        </p>
      </div>
      <div className={`px-5 py-6 ${sanctuaryCardSurface}`}>
        <CollabInviteContent
          projectId={projectId}
          locale={locale}
          copy={copy}
          accessRole={accessRole}
        />
      </div>
    </div>
  );
}

type PanelProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  locale: "fr" | "en";
  copy: CollabInvitePanelCopy;
  accessRole?: WizardAccessRole;
};

/**
 * Panneau Co-Créateur (off-canvas) — raccourci depuis l’en-tête Wizard.
 */
export function CollabInvitePanel({
  isOpen,
  onClose,
  projectId,
  locale,
  copy,
  accessRole = "owner",
}: PanelProps) {
  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || accessRole === "editor") return;
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
  }, [isOpen, close, accessRole]);

  if (accessRole === "editor") return null;

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
            <CollabInviteAtmosphere compact />

            <div className="relative z-10 flex h-full flex-col px-6 py-8 md:px-8">
              <button
                type="button"
                onClick={close}
                className="absolute right-5 top-6 z-20 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-teal-400/[0.08] hover:text-teal-100 md:right-7 md:top-8"
                aria-label={copy.closeAria}
              >
                <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>

              <CollabInviteBrandHeader copy={copy} compact />

              <div className="mt-2 text-center">
                <p className="text-[10px] font-medium uppercase tracking-[0.36em] text-teal-400/50">
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
                  <CollabInviteContent
                    projectId={projectId}
                    locale={locale}
                    copy={copy}
                    accessRole={accessRole}
                  />
                </div>
              </div>

              <CollabInvitePoweredBy copy={copy} />
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Helper : map dictionnaire tributeWizard → copy Collab. */
export function collabInviteCopyFromDictionary(copy: {
  collabTriggerLabel: string;
  collabTriggerCta: string;
  collabOpenAria: string;
  collabTitle: string;
  collabDescription: string;
  collabGenerateCta: string;
  collabGenerating: string;
  collabCopyLink: string;
  collabCopied: string;
  collabRegenerateCta: string;
  collabCloseAria: string;
  collabErrorGeneric: string;
  collabNeedProject: string;
  collabWarnInvalidate: string;
  collabWarnOneShot: string;
  collabTtlHint: string;
  collabKicker: string;
  inviteBrandWordmark: string;
  invitePoweredBy: string;
}): CollabInvitePanelCopy {
  return {
    triggerLabel: copy.collabTriggerLabel,
    triggerCta: copy.collabTriggerCta,
    triggerOpenAria: copy.collabOpenAria,
    title: copy.collabTitle,
    description: copy.collabDescription,
    generateCta: copy.collabGenerateCta,
    generating: copy.collabGenerating,
    copyLink: copy.collabCopyLink,
    copied: copy.collabCopied,
    regenerateCta: copy.collabRegenerateCta,
    closeAria: copy.collabCloseAria,
    errorGeneric: copy.collabErrorGeneric,
    needProject: copy.collabNeedProject,
    warnInvalidate: copy.collabWarnInvalidate,
    warnOneShot: copy.collabWarnOneShot,
    ttlHint: copy.collabTtlHint,
    brandWordmark: copy.inviteBrandWordmark,
    kicker: copy.collabKicker,
    poweredBy: copy.invitePoweredBy,
  };
}
