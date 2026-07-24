"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";
import type { Locale } from "@/i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";

type Props = {
  token: string;
  locale: Locale;
};

type RedeemState = "loading" | "error";

type RedeemBody = {
  ok?: boolean;
  error?: string;
  redirectPath?: string;
};

type RedeemResult = {
  ok: boolean;
  error: string | null;
  redirectPath: string;
};

/**
 * Déduplication module-scope : React Strict Mode (dev) monte/démonté
 * l'effet deux fois. Sans cache, le 1er POST révoque le token one-shot,
 * le cleanup ignore le succès (`cancelled`), et le 2e POST échoue.
 * Une seule Promise HTTP par token pour toute la durée de vie de la page.
 */
const redeemInflight = new Map<string, Promise<RedeemResult>>();

function redeemCollabTokenOnce(
  token: string,
  locale: Locale,
): Promise<RedeemResult> {
  const existing = redeemInflight.get(token);
  if (existing) return existing;

  const promise = (async (): Promise<RedeemResult> => {
    const res = await fetch("/api/collab/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, locale }),
    });
    const body = (await res.json().catch(() => ({}))) as RedeemBody;
    const redirectPath = body.redirectPath ?? appRoutes.studio(locale);

    if (!res.ok || !body.ok) {
      return {
        ok: false,
        error: body.error ?? "invalid_token",
        redirectPath,
      };
    }

    return { ok: true, error: null, redirectPath };
  })();

  redeemInflight.set(token, promise);
  return promise;
}

/**
 * Consomme le token URL Co-Créateur → cookie httpOnly → redirect Studio.
 */
export function CollabRedeemClient({ token, locale }: Props) {
  const router = useRouter();
  const [state, setState] = useState<RedeemState>("loading");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = token.trim();
    if (trimmed.length < 20) {
      setErrorCode("invalid_token");
      setState("error");
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const result = await redeemCollabTokenOnce(trimmed, locale);

        // Succès : toujours rediriger. Le cookie httpOnly est déjà posé par le
        // POST ; ignorer à cause de `cancelled` (Strict Mode) laisserait l'UI
        // en erreur alors que la session éditeur est valide.
        if (result.ok) {
          router.replace(result.redirectPath);
          return;
        }

        if (cancelled) return;

        // Lien déjà consommé dans la même seconde (course) : tenter Studio —
        // le 1er POST jumeau a pu poser le cookie.
        if (result.error === "token_revoked") {
          router.replace(result.redirectPath);
          return;
        }

        setErrorCode(result.error ?? "invalid_token");
        setState("error");
      } catch {
        if (!cancelled) {
          setErrorCode("network_error");
          setState("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, locale, router]);

  const errorMessage =
    locale === "en"
      ? errorCode === "token_expired"
        ? "This collaboration link has expired."
        : errorCode === "token_revoked"
          ? "This collaboration link is no longer valid."
          : "We could not open this collaboration link."
      : errorCode === "token_expired"
        ? "Ce lien de collaboration a expiré."
        : errorCode === "token_revoked"
          ? "Ce lien de collaboration n’est plus valide."
          : "Impossible d’ouvrir ce lien de collaboration.";

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-[#020202] px-6 text-zinc-100">
      <div className="mx-auto flex max-w-[16rem] origin-center scale-[0.82] justify-center">
        <OdysseyConnexionMark wordmark="Odyssey" animate />
      </div>

      {state === "loading" ? (
        <p className="mt-10 text-center text-sm font-light text-white/55">
          {locale === "en"
            ? "Opening co-creator access…"
            : "Ouverture de l’accès Co-Créateur…"}
        </p>
      ) : (
        <p
          className="mt-10 max-w-sm text-center text-sm font-light text-amber-200/90"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      <footer className="mt-16 flex flex-col items-center gap-1 text-center">
        <p className="text-[8px] font-medium uppercase tracking-[0.44em] text-white/26">
          {locale === "en" ? "Powered by" : "Propulsé par"}
        </p>
        <p className="font-brand text-[10px] font-medium uppercase tracking-[0.28em] text-white/36">
          Odyssey
        </p>
      </footer>
    </main>
  );
}
