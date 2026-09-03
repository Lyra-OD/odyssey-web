"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ImagePlus, Loader2, X } from "lucide-react";

import { isSanctuaryVisualPreview } from "@/src/lib/contribute/sanctuaryPreview";
import { guestDepositHasSouvenir } from "@/src/lib/contribute/guestDepositSouvenir";
import {
  sanctuaryHoverDashed,
  sanctuaryWizardField,
  sanctuaryWizardLabel,
  sanctuaryWizardTextarea,
} from "@/src/lib/contribute/sanctuaryChrome";
import { connexionSubmitButtonClass } from "@/src/components/salon/SalonCyanGlowText";
import { DURATION_RITUAL, EASE_OUT_LUXE } from "@/src/lib/motion/easing";
import type { AppDictionary } from "@/lib/dictionaries";

export type SanctuaryDepositCopy = AppDictionary["sanctuary"]["deposit"];

export type SanctuaryDepositResult = {
  id: string;
  kind: "photo" | "message";
  contributorName: string;
  contributorEmail?: string | null;
};

export type SanctuaryDepositFormProps = {
  token: string;
  locale: "fr" | "en";
  copy: SanctuaryDepositCopy;
  onDeposited: (result: SanctuaryDepositResult) => void;
  /** Après un dépôt message et/ou un lot photo (au moins 1 succès) — greffe étoile. */
  onFlowComplete?: () => void;
  remainingPhotoSlots: number;
  initialName?: string;
  initialEmail?: string;
};

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(vars[key] ?? ""),
  );
}

/**
 * Dépôt gratuit — photos ET/OU mot + courriel (même écran).
 */
export function SanctuaryDepositForm({
  token,
  copy: t,
  onDeposited,
  onFlowComplete,
  remainingPhotoSlots,
  initialName = "",
  initialEmail = "",
}: SanctuaryDepositFormProps) {
  const nameId = useId();
  const emailId = useId();
  const consentId = useId();
  const messageId = useId();
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const slots = Math.max(0, remainingPhotoSlots);

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const finishFlow = () => {
    onFlowComplete?.();
  };

  const onFileChange = (list: FileList | null) => {
    if (!list || list.length === 0) return;

    const images = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) {
      setError(t.errorNeedSouvenir);
      return;
    }

    const capped = images.slice(0, slots);
    setFiles(capped);
    setError(null);
    if (images.length > slots) {
      setInfo(fill(t.photoTruncated, { kept: capped.length }));
    } else {
      setInfo(null);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFileAt = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setInfo(null);
  };

  const depositOnePhoto = async (
    file: File,
    trimmedName: string,
    emailTrimmed: string,
  ): Promise<
    | { ok: true; deposit: SanctuaryDepositResult }
    | { ok: false; limit: boolean }
  > => {
    const form = new FormData();
    form.set("kind", "photo");
    form.set("contributorName", trimmedName);
    form.set("contributorEmail", emailTrimmed);
    form.set("consentMarketing", consentMarketing ? "true" : "false");
    form.set("file", file);

    const res = await fetch(
      `/api/contribute/${encodeURIComponent(token)}/deposit`,
      { method: "POST", body: form },
    );
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      deposit?: SanctuaryDepositResult;
      error?: string;
    };

    if (body.error === "guest_photo_limit_reached" || res.status === 403) {
      return { ok: false, limit: true };
    }
    if (!res.ok || !body.ok || !body.deposit) {
      return { ok: false, limit: false };
    }

    return { ok: true, deposit: body.deposit };
  };

  const depositMessage = async (
    trimmedName: string,
    emailTrimmed: string,
    messageText: string,
  ): Promise<boolean> => {
    if (isSanctuaryVisualPreview(token)) {
      await new Promise((r) => setTimeout(r, 320));
      onDeposited({
        id: `preview-${Date.now()}`,
        kind: "message",
        contributorName: trimmedName,
        contributorEmail: emailTrimmed,
      });
      return true;
    }

    const res = await fetch(
      `/api/contribute/${encodeURIComponent(token)}/deposit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "message",
          messageText,
          contributorName: trimmedName,
          contributorEmail: emailTrimmed,
          consentMarketing,
        }),
      },
    );
    const body = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      deposit?: SanctuaryDepositResult;
    };
    if (!res.ok || !body.ok || !body.deposit) {
      return false;
    }
    onDeposited(body.deposit);
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t.errorName);
      return;
    }

    const emailTrimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setError(t.errorEmail);
      return;
    }

    const batch = files.slice(0, slots);
    if (
      !guestDepositHasSouvenir({
        photoCount: batch.length,
        messageText: message,
      })
    ) {
      setError(t.errorNeedSouvenir);
      return;
    }

    const messageText = message.trim();
    const photoTotal = batch.length;
    const stepTotal = (messageText ? 1 : 0) + photoTotal;

    setSubmitting(true);
    setProgress(stepTotal > 1 ? { current: 1, total: stepTotal } : null);
    try {
      let step = 0;
      if (messageText) {
        step += 1;
        setProgress({ current: step, total: stepTotal });
        const ok = await depositMessage(trimmedName, emailTrimmed, messageText);
        if (!ok) {
          setError(t.errorGeneric);
          return;
        }
      }

      let successCount = 0;
      let hitLimit = false;
      for (let i = 0; i < batch.length; i++) {
        step += 1;
        setProgress({ current: step, total: stepTotal });
        const file = batch[i]!;

        if (isSanctuaryVisualPreview(token)) {
          await new Promise((r) => setTimeout(r, 280));
          onDeposited({
            id: `preview-${Date.now()}-${i}`,
            kind: "photo",
            contributorName: trimmedName,
            contributorEmail: emailTrimmed,
          });
          successCount += 1;
          continue;
        }

        const outcome = await depositOnePhoto(file, trimmedName, emailTrimmed);
        if (outcome.ok) {
          onDeposited(outcome.deposit);
          successCount += 1;
          continue;
        }
        if (outcome.limit) {
          hitLimit = true;
          break;
        }
        setError(successCount > 0 || messageText ? t.errorPartialLimit : t.errorGeneric);
        if (successCount > 0 || messageText) finishFlow();
        return;
      }

      if (hitLimit) {
        setError(successCount > 0 || messageText ? t.errorPartialLimit : t.errorPhotoLimit);
        if (successCount > 0 || messageText) finishFlow();
        return;
      }

      if (successCount > 0 || messageText) {
        finishFlow();
      }
    } catch {
      setError(t.errorGeneric);
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  const submitLabel =
    submitting && progress
      ? fill(t.submittingProgress, progress)
      : submitting
        ? t.submitting
        : t.submit;

  const photoHint =
    slots <= 1 ? t.photoHintOne : fill(t.photoHintMany, { slots });

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: DURATION_RITUAL, ease: EASE_OUT_LUXE }}
      className="space-y-8"
      noValidate
    >
      <div className="space-y-2">
        <label htmlFor={nameId} className={sanctuaryWizardLabel}>
          {t.nameLabel}
        </label>
        <input
          id={nameId}
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.namePlaceholder}
          className={sanctuaryWizardField}
        />
      </div>

      {slots > 0 ? (
        <div className="space-y-2">
          <label htmlFor={fileId} className={sanctuaryWizardLabel}>
            {t.photoLabel}
          </label>
          <p className="text-sm font-light text-zinc-500">{photoHint}</p>
          <input
            ref={fileRef}
            id={fileId}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="sr-only"
            onChange={(e) => onFileChange(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={submitting}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.04] px-4 py-8 text-sm font-light text-zinc-300 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${sanctuaryHoverDashed}`}
          >
            <ImagePlus className="h-5 w-5 text-zinc-500" strokeWidth={1.4} aria-hidden />
            {files.length > 0 ? t.photoChange : t.photoChoose}
          </button>

          {files.length > 0 ? (
            <ul className="space-y-2 border-t border-white/10 pt-4" aria-live="polite">
              {files.map((f, index) => (
                <li
                  key={`${f.name}-${f.size}-${index}`}
                  className="flex items-center justify-between gap-3 text-sm font-light text-zinc-400"
                >
                  <span className="min-w-0 truncate tracking-wide">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFileAt(index)}
                    disabled={submitting}
                    className="inline-flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-40"
                    aria-label={`${t.photoRemove} ${f.name}`}
                  >
                    <X className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                    {t.photoRemove}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {info ? (
            <p className="text-xs font-light text-white/45" role="status">
              {info}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor={messageId} className={sanctuaryWizardLabel}>
          {t.messageLabel}
        </label>
        <textarea
          id={messageId}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder={t.messagePlaceholder}
          className={sanctuaryWizardTextarea}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor={emailId} className={sanctuaryWizardLabel}>
          {t.emailLabel}
        </label>
        <p className="text-sm font-light text-zinc-500">{t.emailHint}</p>
        <input
          id={emailId}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.emailPlaceholder}
          className={sanctuaryWizardField}
        />
      </div>

      <label
        htmlFor={consentId}
        className="flex cursor-pointer items-start gap-3 text-sm font-light leading-relaxed text-zinc-400"
      >
        <input
          id={consentId}
          type="checkbox"
          checked={consentMarketing}
          onChange={(e) => setConsentMarketing(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-teal-400"
        />
        <span>{t.consent}</span>
      </label>

      {error ? (
        <p className="text-sm font-light text-rose-400/90" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className={`parcours-monolith-continue ${connexionSubmitButtonClass} min-h-[52px] touch-manipulation`}
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {submitLabel}
          </span>
        ) : (
          t.submit
        )}
      </button>
    </motion.form>
  );
}
