"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Loader2, Type, X } from "lucide-react";

import { isSanctuaryVisualPreview } from "@/src/lib/contribute/sanctuaryPreview";
import {
  editorialFieldLabel,
} from "@/src/lib/editorialFormClasses";
import {
  sanctuaryFieldInput,
  sanctuaryHoverDashed,
  sanctuarySelectedSurface,
  sanctuarySubmitButton,
  sanctuaryFieldTextarea,
} from "@/src/lib/contribute/sanctuaryChrome";
import {
  DURATION_BREATH,
  DURATION_RITUAL,
  EASE_OUT_LUXE,
} from "@/src/lib/motion/easing";

export type SanctuaryDepositResult = {
  id: string;
  kind: "photo" | "message";
  contributorName: string;
  contributorEmail?: string | null;
};

export type SanctuaryDepositFormProps = {
  token: string;
  locale: "fr" | "en";
  onDeposited: (result: SanctuaryDepositResult) => void;
  /** Après un dépôt message ou un lot photo (au moins 1 succès) — panneau ack. */
  onFlowComplete?: () => void;
  /** Slots photo restants avant le plafond (ex. 5 − déjà déposées). */
  remainingPhotoSlots: number;
  /** Préremplissage après un dépôt précédent (enchaînement multi-photos). */
  initialName?: string;
  initialEmail?: string;
};

type DepositKind = "photo" | "message";

const copy = {
  fr: {
    kindPhoto: "Une photo",
    kindMessage: "Un mot",
    kindHint: "Choisissez la forme de votre souvenir.",
    nameLabel: "Votre nom",
    namePlaceholder: "Prénom et nom",
    emailLabel: "Courriel",
    emailHint: "Recommandé pour recevoir les suites de l'hommage",
    emailPlaceholder: "votre@courriel.com",
    messageLabel: "Votre mot",
    messagePlaceholder: "Quelques lignes pour immortaliser un souvenir…",
    photoLabel: "Vos photos",
    photoHint: (slots: number) =>
      slots <= 1
        ? "JPEG, PNG ou WebP — jusqu'à 12 Mo · 1 place restante"
        : `JPEG, PNG ou WebP — jusqu'à 12 Mo · jusqu'à ${slots} photos`,
    photoChoose: "Choisir des images",
    photoChange: "Modifier la sélection",
    photoRemove: "Retirer",
    photoTruncated: (kept: number) =>
      `Seules ${kept} photo${kept > 1 ? "s" : ""} ont été retenues — le plafond de cet hommage est atteint.`,
    consent:
      "J'accepte de recevoir occasionnellement des messages d'Odyssey liés à cet hommage.",
    submit: "Déposer dans le Sanctuaire",
    submitting: "Ajout au Sanctuaire…",
    submittingProgress: (current: number, total: number) =>
      `Ajout ${current} / ${total}…`,
    errorGeneric: "Impossible d'ajouter ce souvenir pour le moment.",
    errorFile: "Veuillez choisir au moins une image valide.",
    errorName: "Votre nom est requis.",
    errorMessage: "Écrivez quelques mots, ou choisissez une photo.",
    errorPhotoLimit:
      "Vous avez déjà offert cinq photos pour cet hommage. Merci.",
    errorPartialLimit:
      "Certaines photos ont été déposées. Le plafond de souvenirs est atteint.",
  },
  en: {
    kindPhoto: "A photo",
    kindMessage: "A few words",
    kindHint: "Choose how you wish to leave your memory.",
    nameLabel: "Your name",
    namePlaceholder: "First and last name",
    emailLabel: "Email",
    emailHint: "Recommended to receive updates on the tribute",
    emailPlaceholder: "you@email.com",
    messageLabel: "Your words",
    messagePlaceholder: "A few lines to immortalize a memory…",
    photoLabel: "Your photos",
    photoHint: (slots: number) =>
      slots <= 1
        ? "JPEG, PNG or WebP — up to 12 MB · 1 slot left"
        : `JPEG, PNG or WebP — up to 12 MB · up to ${slots} photos`,
    photoChoose: "Choose images",
    photoChange: "Change selection",
    photoRemove: "Remove",
    photoTruncated: (kept: number) =>
      `Only ${kept} photo${kept > 1 ? "s" : ""} could be kept — this tribute’s limit is reached.`,
    consent:
      "I agree to occasionally receive Odyssey messages related to this tribute.",
    submit: "Place in the Sanctuary",
    submitting: "Adding to the Sanctuary…",
    submittingProgress: (current: number, total: number) =>
      `Adding ${current} / ${total}…`,
    errorGeneric: "We could not add this memory right now.",
    errorFile: "Please choose at least one valid image.",
    errorName: "Your name is required.",
    errorMessage: "Write a few words, or choose a photo.",
    errorPhotoLimit:
      "You have already offered five photos for this tribute. Thank you.",
    errorPartialLimit:
      "Some photos were placed. The memory limit for this tribute is reached.",
  },
} as const;

/**
 * Étape 1 Sanctuaire — dépôt gratuit (photo(s) ou mot).
 * Tokens : editorial form + motion Breath/Ritual · Quiet Luxury.
 */
export function SanctuaryDepositForm({
  token,
  locale,
  onDeposited,
  onFlowComplete,
  remainingPhotoSlots,
  initialName = "",
  initialEmail = "",
}: SanctuaryDepositFormProps) {
  const t = copy[locale];
  const nameId = useId();
  const emailId = useId();
  const messageId = useId();
  const fileId = useId();
  const consentId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const slots = Math.max(0, remainingPhotoSlots);

  const [kind, setKind] = useState<DepositKind>("photo");
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [consentMarketing, setConsentMarketing] = useState(false);
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
      setError(t.errorFile);
      return;
    }

    const capped = images.slice(0, slots);
    setFiles(capped);
    setError(null);
    if (images.length > slots) {
      setInfo(t.photoTruncated(capped.length));
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
    if (emailTrimmed) form.set("contributorEmail", emailTrimmed);
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

    return {
      ok: true,
      deposit: {
        ...body.deposit,
        contributorEmail:
          body.deposit.contributorEmail ??
          (emailTrimmed ? emailTrimmed : null),
      },
    };
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

    if (kind === "message" && !message.trim()) {
      setError(t.errorMessage);
      return;
    }
    if (kind === "photo") {
      if (files.length === 0) {
        setError(t.errorFile);
        return;
      }
      if (slots <= 0) {
        setError(t.errorPhotoLimit);
        return;
      }
    }

    const emailTrimmed = email.trim();
    const batch = files.slice(0, slots);

    setSubmitting(true);
    setProgress(null);
    try {
      if (kind === "message") {
        if (isSanctuaryVisualPreview(token)) {
          await new Promise((r) => setTimeout(r, 480));
          onDeposited({
            id: `preview-${Date.now()}`,
            kind: "message",
            contributorName: trimmedName,
            ...(emailTrimmed ? { contributorEmail: emailTrimmed } : {}),
          });
          finishFlow();
          return;
        }

        const res = await fetch(
          `/api/contribute/${encodeURIComponent(token)}/deposit`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: "message",
              messageText: message.trim(),
              contributorName: trimmedName,
              ...(emailTrimmed ? { contributorEmail: emailTrimmed } : {}),
              consentMarketing,
            }),
          },
        );
        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          deposit?: SanctuaryDepositResult;
          error?: string;
        };
        if (!res.ok || !body.ok || !body.deposit) {
          setError(t.errorGeneric);
          return;
        }
        onDeposited({
          ...body.deposit,
          contributorEmail:
            body.deposit.contributorEmail ??
            (emailTrimmed ? emailTrimmed : null),
        });
        finishFlow();
        return;
      }

      // --- Photos : boucle séquentielle ---
      let successCount = 0;
      let hitLimit = false;

      for (let i = 0; i < batch.length; i++) {
        setProgress({ current: i + 1, total: batch.length });
        const file = batch[i]!;

        if (isSanctuaryVisualPreview(token)) {
          await new Promise((r) => setTimeout(r, 320));
          onDeposited({
            id: `preview-${Date.now()}-${i}`,
            kind: "photo",
            contributorName: trimmedName,
            ...(emailTrimmed ? { contributorEmail: emailTrimmed } : {}),
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
        setError(
          successCount > 0 ? t.errorPartialLimit : t.errorGeneric,
        );
        if (successCount > 0) finishFlow();
        return;
      }

      if (hitLimit) {
        setError(successCount > 0 ? t.errorPartialLimit : t.errorPhotoLimit);
        if (successCount > 0) finishFlow();
        return;
      }

      if (successCount > 0) {
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
      ? t.submittingProgress(progress.current, progress.total)
      : submitting
        ? t.submitting
        : t.submit;

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: DURATION_RITUAL, ease: EASE_OUT_LUXE }}
      className="space-y-10"
      noValidate
    >
      <div>
        <p className={editorialFieldLabel}>{t.kindHint}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(
            [
              { id: "photo" as const, label: t.kindPhoto, Icon: ImagePlus },
              { id: "message" as const, label: t.kindMessage, Icon: Type },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = kind === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setKind(id);
                  setError(null);
                  setInfo(null);
                }}
                className={`flex min-h-[52px] items-center justify-center gap-2 rounded-sm border px-3 py-3 text-left transition-colors duration-300 ${
                  active
                    ? `${sanctuarySelectedSurface} text-zinc-100`
                    : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-teal-400/25 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
                <span className="font-label text-[11px] uppercase tracking-[0.22em]">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {kind === "photo" ? (
          <motion.div
            key="photo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: DURATION_BREATH, ease: EASE_OUT_LUXE }}
          >
            <label htmlFor={fileId} className={editorialFieldLabel}>
              {t.photoLabel}
            </label>
            <p className="mt-2 text-xs font-light text-zinc-500">
              {t.photoHint(slots)}
            </p>
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
              disabled={slots <= 0 || submitting}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-sm font-light text-zinc-300 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${sanctuaryHoverDashed}`}
            >
              <ImagePlus className="h-5 w-5 text-zinc-500" strokeWidth={1.4} aria-hidden />
              {files.length > 0 ? t.photoChange : t.photoChoose}
            </button>

            {files.length > 0 ? (
              <ul className="mt-5 space-y-2 border-t border-white/8 pt-4" aria-live="polite">
                {files.map((f, index) => (
                  <li
                    key={`${f.name}-${f.size}-${index}`}
                    className="flex items-center justify-between gap-3 text-sm font-light text-zinc-400"
                  >
                    <span className="min-w-0 truncate tracking-wide">
                      {f.name}
                    </span>
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
              <p className="mt-3 text-xs font-light text-white/45" role="status">
                {info}
              </p>
            ) : null}
          </motion.div>
        ) : (
          <motion.div
            key="message"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: DURATION_BREATH, ease: EASE_OUT_LUXE }}
          >
            <label htmlFor={messageId} className={editorialFieldLabel}>
              {t.messageLabel}
            </label>
            {/* Phase 3b+ : Aide IA optionnelle — amorces à éditer (voir MONETIZATION_CATALOG §C) */}
            <textarea
              id={messageId}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder={t.messagePlaceholder}
              className={sanctuaryFieldTextarea}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <label htmlFor={nameId} className={editorialFieldLabel}>
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
          className={sanctuaryFieldInput}
        />
      </div>

      <div>
        <label htmlFor={emailId} className={editorialFieldLabel}>
          {t.emailLabel}
        </label>
        <p className="mt-2 text-xs font-light text-zinc-500">{t.emailHint}</p>
        <input
          id={emailId}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.emailPlaceholder}
          className={sanctuaryFieldInput}
        />
      </div>

      <label
        htmlFor={consentId}
        className="flex cursor-pointer items-start gap-3 text-xs font-light leading-relaxed text-zinc-500"
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
        <p className="text-sm font-light text-amber-200/90" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting || (kind === "photo" && slots <= 0)}
        className={`${sanctuarySubmitButton} inline-flex min-h-[48px] w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {submitting ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {submitLabel}
          </>
        ) : (
          t.submit
        )}
      </button>
    </motion.form>
  );
}
