"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { ConnexionEclipseLayer } from "@/src/components/auth/ConnexionEclipseLayer";
import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";
import {
  LocaleSwitcher,
  type LocaleSwitcherLabels,
} from "@/src/components/i18n/LocaleSwitcher";
import type { Locale } from "@/i18n.config";
import {
  editorialFieldInput,
  editorialFieldLabel,
  editorialSubmitButton,
} from "@/src/lib/editorialFormClasses";

export type DeckGateCopy = {
  title: string;
  hint: string;
  submit: string;
  error: string;
  unavailable: string;
  passwordLabel: string;
};

type DeckGateProps = {
  lang: Locale;
  wordmark: string;
  copy: DeckGateCopy;
  configured: boolean;
  localeSwitcher: LocaleSwitcherLabels;
};

/**
 * Sas password Quiet Luxury — avant intro + slides.
 */
export function DeckGate({
  lang,
  wordmark,
  copy,
  configured,
  localeSwitcher,
}: DeckGateProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!configured || pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/deck/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 503) {
        setError(copy.unavailable);
        return;
      }
      if (res.status === 429) {
        setError(copy.error);
        return;
      }
      if (!res.ok) {
        setError(copy.error);
        return;
      }
      router.refresh();
    } catch {
      setError(copy.error);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#020202] px-6">
      <div className="absolute right-5 top-5 z-20 md:right-8 md:top-8">
        <LocaleSwitcher lang={lang} {...localeSwitcher} />
      </div>

      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <ConnexionEclipseLayer />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <OdysseyConnexionMark wordmark={wordmark} animate className="mb-10" />
        <h1 className="font-label text-center text-[0.7rem] uppercase tracking-[0.36em] text-white/45">
          {copy.title}
        </h1>
        <p className="mt-4 text-center text-sm font-light leading-relaxed text-white/50">
          {configured ? copy.hint : copy.unavailable}
        </p>

        {configured ? (
          <form onSubmit={onSubmit} className="mt-10">
            <label className={editorialFieldLabel} htmlFor="deck-password">
              {copy.passwordLabel}
            </label>
            <input
              id="deck-password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={editorialFieldInput}
              disabled={pending}
              required
            />
            {error ? (
              <p
                className="mt-4 text-center text-sm font-light text-red-300/80"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <div className="mt-10 flex justify-center">
              <button
                type="submit"
                className={editorialSubmitButton}
                disabled={pending || !password}
              >
                {copy.submit}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
