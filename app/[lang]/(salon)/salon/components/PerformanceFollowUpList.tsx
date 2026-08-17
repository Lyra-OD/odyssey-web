"use client";

import { useRef, useState } from "react";

import type { Locale } from "@/i18n.config";
import type { PartnerMyPerformanceRow } from "@/src/lib/partner/partnerPerformance";

type PerformanceFollowUpListProps = {
  lang: Locale;
  rows: PartnerMyPerformanceRow[];
  onSent: (invitationId: string) => void;
};

function followUpCopy(lang: Locale) {
  return lang === "en"
    ? {
        title: "Follow up",
        empty: "No pending links older than 3 days.",
        caption: "One email, sent when you click. No prices.",
        date: "Sent",
        send: "Send reminder",
        sending: "Sending…",
        errorGeneric: "The reminder could not be sent. Please try again.",
        errorNotConfigured: "Email sending is not configured on this server.",
        errorNotDue: "This invitation is not due for a reminder yet.",
      }
    : {
        title: "À relancer",
        empty: "Aucun lien en attente depuis plus de 3 jours.",
        caption: "Un courriel, au moment où vous cliquez. Pas de prix.",
        date: "Envoyé",
        send: "Envoyer le rappel",
        sending: "Envoi…",
        errorGeneric: "Le rappel n’a pas pu partir. Réessayez.",
        errorNotConfigured:
          "L’envoi d’e-mail n’est pas configuré sur ce serveur.",
        errorNotDue: "Cette invitation n’est pas encore à relancer.",
      };
}

function formatDate(iso: string, lang: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "en" ? "en-CA" : "fr-CA", {
    dateStyle: "medium",
  }).format(date);
}

function followUpErrorMessage(
  error: string | undefined,
  copy: ReturnType<typeof followUpCopy>,
): string {
  if (error === "email_not_configured") return copy.errorNotConfigured;
  if (error === "follow_up_not_due") return copy.errorNotDue;
  return copy.errorGeneric;
}

export function PerformanceFollowUpList({
  lang,
  rows,
  onSent,
}: PerformanceFollowUpListProps) {
  const copy = followUpCopy(lang);
  const title =
    rows.length > 0 ? `${copy.title} (${rows.length})` : copy.title;
  const lockRef = useRef(new Set<string>());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{
    invitationId: string;
    message: string;
  } | null>(null);

  async function sendFollowUp(invitationId: string) {
    if (lockRef.current.has(invitationId)) return;
    lockRef.current.add(invitationId);
    setSendingId(invitationId);
    setRowError(null);

    try {
      const response = await fetch(
        `/api/partner/invitations/${encodeURIComponent(invitationId)}/follow-up`,
        { method: "POST", credentials: "same-origin" },
      );
      const payload: unknown = await response.json().catch(() => null);
      const errorCode =
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof (payload as { error: unknown }).error === "string"
          ? (payload as { error: string }).error
          : undefined;

      if (response.ok || errorCode === "follow_up_already_sent") {
        onSent(invitationId);
        return;
      }

      setRowError({
        invitationId,
        message: followUpErrorMessage(errorCode, copy),
      });
    } catch {
      setRowError({
        invitationId,
        message: copy.errorGeneric,
      });
    } finally {
      lockRef.current.delete(invitationId);
      setSendingId((current) => (current === invitationId ? null : current));
    }
  }

  return (
    <section
      aria-labelledby="performance-followup-title"
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8"
    >
      <h2
        id="performance-followup-title"
        className="font-label text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500"
      >
        {title}
      </h2>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm font-light text-zinc-500">{copy.empty}</p>
      ) : (
        <ul className="mt-6 divide-y divide-white/[0.06]">
          {rows.map((row) => {
            const isSending = sendingId === row.invitationId;
            return (
              <li
                key={row.invitationId}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-label text-sm font-light tracking-wide text-white/90">
                    {row.familyEmailMasked}
                  </p>
                  <p className="mt-1 text-sm font-light tabular-nums text-zinc-500">
                    {copy.date} {formatDate(row.createdAt, lang)}
                  </p>
                  {rowError?.invitationId === row.invitationId ? (
                    <p
                      role="alert"
                      className="mt-2 text-xs font-light text-rose-300/90"
                    >
                      {rowError.message}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => {
                    void sendFollowUp(row.invitationId);
                  }}
                  className="font-label shrink-0 self-start px-4 py-2 text-[9px] font-bold uppercase tracking-[0.32em] text-[var(--salon-cyan)] transition-opacity hover:opacity-80 disabled:cursor-wait disabled:opacity-50 sm:self-center"
                >
                  {isSending ? copy.sending : copy.send}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 max-w-2xl text-xs font-light leading-relaxed text-zinc-500">
        {copy.caption}
      </p>
    </section>
  );
}
