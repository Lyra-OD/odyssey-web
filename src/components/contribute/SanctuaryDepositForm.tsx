"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Loader2, Type } from "lucide-react";

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
};

type DepositKind = "photo" | "message";

const copy = {
  fr: {
    kindPhoto: "Une photo",
    kindMessage: "Un mot",
    kindHint: "Choisissez la forme de votre souvenir.",
    nameLabel: "Votre nom",
    namePlaceholder: "Prénom et nom",
    emailLabel: "Courriel (facultatif)",
    emailPlaceholder: "pour recevoir des nouvelles de l'hommage",
    messageLabel: "Votre mot",
    messagePlaceholder: "Quelques lignes pour immortaliser un souvenir…",
    photoLabel: "Votre photo",
    photoHint: "JPEG, PNG ou WebP — jusqu'à 12 Mo",
    photoChoose: "Choisir une image",
    photoChange: "Changer l'image",
    consent:
      "J'accepte de recevoir occasionnellement des messages d'Odyssey liés à cet hommage.",
    submit: "Déposer dans le Sanctuaire",
    submitting: "Ajout au Sanctuaire…",
    errorGeneric: "Impossible d'ajouter ce souvenir pour le moment.",
    errorFile: "Veuillez choisir une image valide.",
    errorName: "Votre nom est requis.",
    errorMessage: "Écrivez quelques mots, ou choisissez une photo.",
  },
  en: {
    kindPhoto: "A photo",
    kindMessage: "A few words",
    kindHint: "Choose how you wish to leave your memory.",
    nameLabel: "Your name",
    namePlaceholder: "First and last name",
    emailLabel: "Email (optional)",
    emailPlaceholder: "to hear about this tribute",
    messageLabel: "Your words",
    messagePlaceholder: "A few lines to immortalize a memory…",
    photoLabel: "Your photo",
    photoHint: "JPEG, PNG or WebP — up to 12 MB",
    photoChoose: "Choose an image",
    photoChange: "Change image",
    consent:
      "I agree to occasionally receive Odyssey messages related to this tribute.",
    submit: "Place in the Sanctuary",
    submitting: "Adding to the Sanctuary…",
    errorGeneric: "We could not add this memory right now.",
    errorFile: "Please choose a valid image.",
    errorName: "Your name is required.",
    errorMessage: "Write a few words, or choose a photo.",
  },
} as const;

/**
 * Étape 1 Sanctuaire — dépôt gratuit (photo ou mot).
 * Tokens : editorial form + motion Breath/Ritual · Quiet Luxury.
 */
export function SanctuaryDepositForm({
  token,
  locale,
  onDeposited,
}: SanctuaryDepositFormProps) {
  const t = copy[locale];
  const nameId = useId();
  const emailId = useId();
  const messageId = useId();
  const fileId = useId();
  const consentId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<DepositKind>("photo");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFileChange = (list: FileList | null) => {
    const next = list?.[0] ?? null;
    if (!next) {
      setFile(null);
      return;
    }
    if (!next.type.startsWith("image/")) {
      setError(t.errorFile);
      setFile(null);
      return;
    }
    setError(null);
    setFile(next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t.errorName);
      return;
    }

    if (kind === "message" && !message.trim()) {
      setError(t.errorMessage);
      return;
    }
    if (kind === "photo" && !file) {
      setError(t.errorFile);
      return;
    }

    setSubmitting(true);
    try {
      if (isSanctuaryVisualPreview(token)) {
        await new Promise((r) => setTimeout(r, 480));
        onDeposited({
          id: `preview-${Date.now()}`,
          kind,
          contributorName: trimmedName,
          ...(email.trim() ? { contributorEmail: email.trim() } : {}),
        });
        return;
      }

      let res: Response;
      if (kind === "message") {
        res = await fetch(`/api/contribute/${encodeURIComponent(token)}/deposit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "message",
            messageText: message.trim(),
            contributorName: trimmedName,
            ...(email.trim() ? { contributorEmail: email.trim() } : {}),
            consentMarketing,
          }),
        });
      } else {
        const form = new FormData();
        form.set("kind", "photo");
        form.set("contributorName", trimmedName);
        if (email.trim()) form.set("contributorEmail", email.trim());
        form.set("consentMarketing", consentMarketing ? "true" : "false");
        form.set("file", file!);
        res = await fetch(`/api/contribute/${encodeURIComponent(token)}/deposit`, {
          method: "POST",
          body: form,
        });
      }

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
          (email.trim() ? email.trim() : null),
      });
    } catch {
      setError(t.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  };

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
            <p className="mt-2 text-xs font-light text-zinc-500">{t.photoHint}</p>
            <input
              ref={fileRef}
              id={fileId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="sr-only"
              onChange={(e) => onFileChange(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-sm font-light text-zinc-300 transition-colors ${sanctuaryHoverDashed}`}
            >
              <ImagePlus className="h-5 w-5 text-zinc-500" strokeWidth={1.4} aria-hidden />
              {file ? file.name : t.photoChoose}
            </button>
            {file ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-2 text-[10px] uppercase tracking-[0.28em] text-zinc-500 transition-colors hover:text-zinc-300"
              >
                {t.photoChange}
              </button>
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
        disabled={submitting}
        className={`${sanctuarySubmitButton} inline-flex min-h-[48px] w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {submitting ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {t.submitting}
          </>
        ) : (
          t.submit
        )}
      </button>
    </motion.form>
  );
}
