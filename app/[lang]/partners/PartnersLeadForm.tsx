"use client";

import { useState } from "react";

import {
  sanctuaryFieldInput,
  sanctuaryFieldTextarea,
  sanctuarySubmitButton,
} from "@/src/lib/contribute/sanctuaryChrome";
import { editorialFieldLabel } from "@/src/lib/editorialFormClasses";
import type { Locale } from "@/i18n.config";

export type PartnersLeadFormLabels = {
  organization: string;
  contactName: string;
  email: string;
  phone: string;
  region: string;
  context: string;
  message: string;
  submit: string;
  sending: string;
  success: string;
  error: string;
  errorRate: string;
};

type PartnersLeadFormProps = {
  lang: Locale;
  labels: PartnersLeadFormLabels;
};

export function PartnersLeadForm({ lang, labels }: PartnersLeadFormProps) {
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || success) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/partners/lead", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization: String(data.get("organization") ?? ""),
          contactName: String(data.get("contactName") ?? ""),
          email: String(data.get("email") ?? ""),
          phone: String(data.get("phone") ?? ""),
          region: String(data.get("region") ?? ""),
          context: String(data.get("context") ?? ""),
          message: String(data.get("message") ?? ""),
          locale: lang,
          website: String(data.get("website") ?? ""),
        }),
      });

      if (response.status === 429) {
        throw new Error("rate_limited");
      }
      if (!response.ok) {
        throw new Error("lead_failed");
      }

      setSuccess(true);
      form.reset();
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message === "rate_limited"
          ? labels.errorRate
          : labels.error,
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="mt-14 space-y-10" onSubmit={(event) => void handleSubmit(event)}>
      <div className="sr-only" aria-hidden="true">
        <label>
          <span>Website</span>
        <input
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
        />
        </label>
      </div>

      <label className="block">
        <span className={editorialFieldLabel}>{labels.organization}</span>
        <input
          name="organization"
          type="text"
          autoComplete="organization"
          className={sanctuaryFieldInput}
          required
          maxLength={200}
          disabled={sending || success}
        />
      </label>

      <label className="block">
        <span className={editorialFieldLabel}>{labels.contactName}</span>
        <input
          name="contactName"
          type="text"
          autoComplete="name"
          className={sanctuaryFieldInput}
          required
          maxLength={120}
          disabled={sending || success}
        />
      </label>

      <label className="block">
        <span className={editorialFieldLabel}>{labels.email}</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          className={sanctuaryFieldInput}
          required
          maxLength={320}
          disabled={sending || success}
        />
      </label>

      <label className="block">
        <span className={editorialFieldLabel}>{labels.phone}</span>
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          className={sanctuaryFieldInput}
          maxLength={40}
          disabled={sending || success}
        />
      </label>

      <label className="block">
        <span className={editorialFieldLabel}>{labels.region}</span>
        <input
          name="region"
          type="text"
          autoComplete="address-level1"
          className={sanctuaryFieldInput}
          maxLength={120}
          disabled={sending || success}
        />
      </label>

      <label className="block">
        <span className={editorialFieldLabel}>{labels.context}</span>
        <textarea
          name="context"
          rows={3}
          className={sanctuaryFieldTextarea}
          maxLength={1000}
          disabled={sending || success}
        />
      </label>

      <label className="block">
        <span className={editorialFieldLabel}>{labels.message}</span>
        <textarea
          name="message"
          rows={5}
          className={sanctuaryFieldTextarea}
          required
          maxLength={4000}
          disabled={sending || success}
        />
      </label>

      {success ? (
        <p className="text-sm font-light text-teal-300/90" role="status">
          {labels.success}
        </p>
      ) : (
        <button
          type="submit"
          className={`${sanctuarySubmitButton} min-h-[52px] w-full rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] touch-manipulation`}
          disabled={sending}
        >
          {sending ? labels.sending : labels.submit}
        </button>
      )}

      {error ? (
        <p className="text-sm font-light text-red-400/90" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
