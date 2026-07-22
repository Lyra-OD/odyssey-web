"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import {
  SanctuaryDepositForm,
  type SanctuaryDepositResult,
} from "@/src/components/contribute/SanctuaryDepositForm";
import {
  isSanctuaryVisualPreview,
  SANCTUARY_PREVIEW_TRIBUTE,
} from "@/src/lib/contribute/sanctuaryPreview";
import {
  DURATION_BREATH,
  DURATION_RITUAL,
  EASE_OUT_LUXE,
} from "@/src/lib/motion/easing";

export type SanctuaryLandingProps = {
  token: string;
  locale: "fr" | "en";
};

type TributePayload = {
  firstName: string | null;
  lastName: string | null;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; tribute: TributePayload };

function tributeDisplayName(
  tribute: TributePayload,
  locale: "fr" | "en",
): string {
  const parts = [tribute.firstName, tribute.lastName]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return locale === "en" ? "a loved one" : "un être cher";
}

const copy = {
  fr: {
    kicker: "Sanctuaire",
    welcome: (name: string) => `Bienvenue dans le Sanctuaire de ${name}.`,
    subtitle: "La famille rassemble les souvenirs pour en faire une œuvre intemporelle.",
    depositLead: "Laissez d'abord une empreinte — une photo, ou un mot.",
    loading: "Ouverture du Sanctuaire…",
    errorTitle: "Lien indisponible",
    errorBody:
      "Ce Sanctuaire est introuvable ou n'est plus accessible. Demandez un nouveau lien à la famille.",
    bridgeTitle: "Votre empreinte a été ajoutée.",
    bridgeBody:
      "Souhaitez-vous rejoindre le cercle des proches qui soutiennent la production de ce film hommage ?",
    bridgeNote: "Les façons de laisser une empreinte durable arrivent à l'instant…",
  },
  en: {
    kicker: "Sanctuary",
    welcome: (name: string) => `Welcome to ${name}'s Sanctuary.`,
    subtitle: "The family is gathering memories to weave a timeless work.",
    depositLead: "First, leave a mark — a photo, or a few words.",
    loading: "Opening the Sanctuary…",
    errorTitle: "Link unavailable",
    errorBody:
      "This Sanctuary could not be found or is no longer available. Ask the family for a new link.",
    bridgeTitle: "Your mark has been placed.",
    bridgeBody:
      "Would you like to join the circle of those who support the making of this tribute film?",
    bridgeNote: "Ways to leave a lasting imprint will appear here next…",
  },
} as const;

const HALO =
  "radial-gradient(ellipse 100% 70% at 50% 42%, rgba(139, 92, 246, 0.18) 0%, rgba(91, 33, 182, 0.07) 46%, transparent 72%)";

/**
 * Shell client du Sanctuaire public — Étape 1 (dépôt) → pont émotionnel.
 * Catalogue d'empreintes (Étape 2) branché au prochain lot.
 */
export function SanctuaryLanding({ token, locale }: SanctuaryLandingProps) {
  const t = copy[locale];
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [deposit, setDeposit] = useState<SanctuaryDepositResult | null>(null);

  useEffect(() => {
    if (isSanctuaryVisualPreview(token)) {
      setLoad({
        status: "ready",
        tribute: { ...SANCTUARY_PREVIEW_TRIBUTE },
      });
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(
          `/api/contribute/${encodeURIComponent(token)}?lang=${locale}`,
        );
        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          tribute?: TributePayload;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !body.ok || !body.tribute) {
          setLoad({
            status: "error",
            message: t.errorBody,
          });
          return;
        }
        setLoad({ status: "ready", tribute: body.tribute });
      } catch {
        if (!cancelled) {
          setLoad({ status: "error", message: t.errorBody });
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [token, locale, t.errorBody]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#020202] text-zinc-100 antialiased">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-[36%] h-[min(70vh,680px)] w-[min(150vw,68rem)] -translate-x-1/2 -translate-y-1/2 opacity-60 blur-[180px]"
          style={{ backgroundImage: HALO }}
        />
        {/* Filet champagne memorial — 5–10 % de surface, jamais concurrent du violet */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C4B5A0]/35 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col px-6 pb-20 pt-14 md:px-8 md:pt-20">
        <header className="mb-12 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.55em] text-white/35">
            {t.kicker}
          </p>
        </header>

        <AnimatePresence mode="wait">
          {load.status === "loading" ? (
            <motion.p
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION_BREATH, ease: EASE_OUT_LUXE }}
              className="text-center text-sm font-light text-zinc-500"
            >
              {t.loading}
            </motion.p>
          ) : null}

          {load.status === "error" ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION_RITUAL, ease: EASE_OUT_LUXE }}
              className="text-center"
            >
              <h1 className="font-editorial text-2xl font-medium tracking-tight text-zinc-50 md:text-3xl">
                {t.errorTitle}
              </h1>
              <p className="mt-4 text-sm font-light leading-relaxed text-white/55">
                {load.message}
              </p>
            </motion.div>
          ) : null}

          {load.status === "ready" && !deposit ? (
            <motion.div
              key="deposit"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: DURATION_RITUAL, ease: EASE_OUT_LUXE }}
              className="space-y-10"
            >
              <div className="text-center">
                <h1 className="font-editorial text-[1.65rem] font-medium leading-snug tracking-tight text-zinc-50 md:text-3xl">
                  {t.welcome(tributeDisplayName(load.tribute, locale))}
                </h1>
                <p className="mx-auto mt-5 max-w-md text-sm font-light leading-relaxed text-white/50 md:text-base">
                  {t.subtitle}
                </p>
                <p className="mt-8 text-[10px] font-medium uppercase tracking-[0.36em] text-[#C4B5A0]/80">
                  {t.depositLead}
                </p>
              </div>

              <div className="rounded-sm border border-white/10 bg-white/[0.03] px-5 py-8 backdrop-blur-sm md:px-8">
                <SanctuaryDepositForm
                  token={token}
                  locale={locale}
                  onDeposited={setDeposit}
                />
              </div>
            </motion.div>
          ) : null}

          {load.status === "ready" && deposit ? (
            <motion.div
              key="bridge"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION_RITUAL, ease: EASE_OUT_LUXE }}
              className="space-y-8 text-center"
            >
              <div className="mx-auto h-px w-16 bg-[#C4B5A0]/40" aria-hidden />
              <h2 className="font-editorial text-2xl font-medium tracking-tight text-zinc-50 md:text-3xl">
                {t.bridgeTitle}
              </h2>
              <p className="mx-auto max-w-md text-sm font-light leading-relaxed text-white/55 md:text-base">
                {t.bridgeBody}
              </p>
              <p className="text-[10px] uppercase tracking-[0.32em] text-zinc-600">
                {t.bridgeNote}
              </p>
              {/* Slot : ImprintCatalog + PatronAmountField — lot suivant */}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}
