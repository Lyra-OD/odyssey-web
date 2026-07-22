"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";
import {
  ImprintCatalog,
  type ImprintPack,
} from "@/src/components/contribute/ImprintCatalog";
import { ImprintCheckoutCta } from "@/src/components/contribute/ImprintCheckoutCta";
import { PatronAmountField } from "@/src/components/contribute/PatronAmountField";
import {
  SanctuaryDepositForm,
  type SanctuaryDepositResult,
} from "@/src/components/contribute/SanctuaryDepositForm";
import { LocaleSwitcher } from "@/src/components/i18n/LocaleSwitcher";
import {
  isSanctuaryVisualPreview,
  SANCTUARY_PREVIEW_TRIBUTE,
  sanctuaryPreviewPacks,
} from "@/src/lib/contribute/sanctuaryPreview";
import {
  DURATION_BREATH,
  DURATION_RITUAL,
  EASE_OUT_LUXE,
} from "@/src/lib/motion/easing";
import { GUEST_PATRON_SUGGESTED_CENTS } from "@/src/lib/wizard/guestSupportPacks";
import type { Locale } from "@/i18n.config";

export type SanctuaryLandingProps = {
  token: string;
  locale: Locale;
};

type TributePayload = {
  firstName: string | null;
  lastName: string | null;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; tribute: TributePayload; packs: ImprintPack[] };

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
    brandWordmark: "Odyssey",
    kicker: "Sanctuaire",
    poweredBy: "Propulsé par",
    welcome: (name: string) => `Bienvenue dans le Sanctuaire de ${name}.`,
    subtitle:
      "La famille rassemble les souvenirs pour en faire une œuvre intemporelle.",
    depositLead: "Laissez d'abord une empreinte — une photo, ou un mot.",
    loading: "Ouverture du Sanctuaire…",
    errorTitle: "Lien indisponible",
    errorBody:
      "Ce Sanctuaire est introuvable ou n'est plus accessible. Demandez un nouveau lien à la famille.",
    bridgeTitle: "Votre empreinte a été ajoutée.",
    bridgeBody:
      "Souhaitez-vous rejoindre le cercle des proches qui soutiennent la production de ce film hommage ?",
    contribSuccess: "Merci — votre soutien a bien été enregistré.",
    contribCancel: "Paiement annulé. Vous pouvez choisir une autre empreinte.",
  },
  en: {
    brandWordmark: "Odyssey",
    kicker: "Sanctuary",
    poweredBy: "Powered by",
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
    contribSuccess: "Thank you — your support has been recorded.",
    contribCancel: "Payment cancelled. You can choose another imprint.",
  },
} as const;

const HALO_UV =
  "radial-gradient(ellipse 100% 70% at 50% 42%, rgba(139, 92, 246, 0.16) 0%, rgba(91, 33, 182, 0.06) 46%, transparent 72%)";

const HALO_TEAL =
  "radial-gradient(ellipse 90% 60% at 50% 48%, rgba(34, 211, 238, 0.22) 0%, rgba(45, 212, 191, 0.1) 38%, transparent 68%)";

/**
 * Shell client du Sanctuaire — dépôt → catalogue → checkout Stripe.
 */
export function SanctuaryLanding({ token, locale }: SanctuaryLandingProps) {
  const t = copy[locale];
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [deposit, setDeposit] = useState<SanctuaryDepositResult | null>(null);
  const [selectedPackKey, setSelectedPackKey] = useState<string | null>(null);
  const [patronAmountCents, setPatronAmountCents] = useState(
    GUEST_PATRON_SUGGESTED_CENTS,
  );
  const [contribFlash, setContribFlash] = useState<
    "success" | "cancel" | null
  >(null);

  const handleSelectPack = (key: string) => {
    setSelectedPackKey(key);
    if (key === "guest_patron" && load.status === "ready") {
      const patron = load.packs.find((p) => p.key === "guest_patron");
      const suggested =
        patron?.amountSuggestedCents ?? GUEST_PATRON_SUGGESTED_CENTS;
      setPatronAmountCents(suggested);
    }
  };

  const patronPack =
    load.status === "ready"
      ? load.packs.find((p) => p.key === "guest_patron")
      : undefined;

  const selectedPack =
    load.status === "ready" && selectedPackKey
      ? load.packs.find((p) => p.key === selectedPackKey)
      : undefined;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const contrib = params.get("contrib");
    if (contrib === "success" || contrib === "cancel") {
      setContribFlash(contrib);
      params.delete("contrib");
      params.delete("session_id");
      const next = `${window.location.pathname}${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      window.history.replaceState({}, "", next);
    }
  }, []);

  useEffect(() => {
    if (isSanctuaryVisualPreview(token)) {
      setLoad({
        status: "ready",
        tribute: { ...SANCTUARY_PREVIEW_TRIBUTE },
        packs: sanctuaryPreviewPacks(locale),
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
          packs?: ImprintPack[];
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
        setLoad({
          status: "ready",
          tribute: body.tribute,
          packs: Array.isArray(body.packs) ? body.packs : [],
        });
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
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute left-1/2 top-[36%] h-[min(70vh,680px)] w-[min(150vw,68rem)] -translate-x-1/2 -translate-y-1/2 opacity-55 blur-[180px]"
          style={{ backgroundImage: HALO_UV }}
        />
        <div
          className="sanctuary-halo-breathe absolute left-1/2 top-[42%] h-[min(55vh,520px)] w-[min(120vw,52rem)] -translate-x-1/2 -translate-y-1/2 blur-[140px]"
          style={{ backgroundImage: HALO_TEAL }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/25 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col px-6 pb-10 pt-12 md:px-8 md:pt-16">
        <header className="relative mb-10">
          <div className="absolute right-0 top-0 z-10">
            <LocaleSwitcher
              lang={locale}
              languageLabel={locale === "en" ? "Language" : "Langue"}
              langOptionFr="FR"
              langOptionEn="EN"
            />
          </div>
          <div className="mx-auto flex max-w-[16rem] scale-[0.82] origin-top justify-center sm:max-w-[18rem] sm:scale-[0.88]">
            <OdysseyConnexionMark
              wordmark={t.brandWordmark}
              animate
              className="mb-0"
            />
          </div>
          <p className="mt-5 text-center text-[10px] font-medium uppercase tracking-[0.55em] text-white/35">
            {t.kicker}
          </p>
        </header>

        {contribFlash ? (
          <p
            className={`mb-8 text-center text-sm font-light ${
              contribFlash === "success"
                ? "text-teal-300/90"
                : "text-zinc-400"
            }`}
            role="status"
          >
            {contribFlash === "success" ? t.contribSuccess : t.contribCancel}
          </p>
        ) : null}

        <div className="flex-1">
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
                  <p className="mt-8 text-[10px] font-medium uppercase tracking-[0.36em] text-teal-400/75">
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
                className="space-y-8"
              >
                <div className="space-y-6 text-center">
                  <div
                    className="mx-auto h-px w-16 bg-teal-400/35"
                    aria-hidden
                  />
                  <h2 className="font-editorial text-2xl font-medium tracking-tight text-zinc-50 md:text-3xl">
                    {t.bridgeTitle}
                  </h2>
                  <p className="mx-auto max-w-md text-sm font-light leading-relaxed text-white/55 md:text-base">
                    {t.bridgeBody}
                  </p>
                </div>

                <ImprintCatalog
                  locale={locale}
                  packs={load.packs}
                  selectedKey={selectedPackKey}
                  onSelect={handleSelectPack}
                />

                <PatronAmountField
                  locale={locale}
                  open={selectedPackKey === "guest_patron"}
                  amountCents={patronAmountCents}
                  onChange={setPatronAmountCents}
                  amountMinCents={patronPack?.amountMinCents}
                  amountMaxCents={patronPack?.amountMaxCents}
                  amountSuggestedCents={patronPack?.amountSuggestedCents}
                />

                <ImprintCheckoutCta
                  token={token}
                  locale={locale}
                  productKey={selectedPackKey}
                  patronAmountCents={patronAmountCents}
                  patronMinCents={patronPack?.amountMinCents}
                  patronMaxCents={patronPack?.amountMaxCents}
                  contributorName={deposit.contributorName}
                  contributorEmail={deposit.contributorEmail}
                  fixedPriceCents={selectedPack?.priceCents}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <footer className="mt-16 flex flex-col items-center gap-1 pb-2 pt-8 text-center">
          <p className="text-[8px] font-medium uppercase tracking-[0.44em] text-white/26">
            {t.poweredBy}
          </p>
          <p className="font-brand text-[10px] font-medium uppercase leading-none tracking-[0.28em] text-white/36 md:text-[11px]">
            {t.brandWordmark}
          </p>
        </footer>
      </div>
    </main>
  );
}
