"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { OdysseyConnexionMark } from "@/src/components/auth/OdysseyConnexionMark";
import {
  ImprintCatalog,
  type ImprintPack,
} from "@/src/components/contribute/ImprintCatalog";
import { ImprintCheckoutCta } from "@/src/components/contribute/ImprintCheckoutCta";
import { GuestVoiceRecorder } from "@/src/components/contribute/GuestVoiceRecorder";
import { GuestVideoRecorder } from "@/src/components/contribute/GuestVideoRecorder";
import { SanctuaryLueurOrb } from "@/src/components/contribute/SanctuaryLueurOrb";
import { SanctuaryLueurPanel } from "@/src/components/contribute/SanctuaryLueurPanel";
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
  SANCTUARY_HALO_TEAL,
  SANCTUARY_HALO_UV,
  SANCTUARY_LAST_IMPRINT_KEY,
  sanctuaryGhostButton,
  sanctuarySecondaryButton,
} from "@/src/lib/contribute/sanctuaryChrome";
import { SANCTUARY_GUEST_PHOTO_MAX } from "@/src/lib/contribute/sanctuaryLimits";
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
  displayName?: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      tribute: TributePayload;
      packs: ImprintPack[];
      guestPhotoCount: number;
      guestPhotoMax: number;
    };

/** Dépôt (formulaire / accusé inline) → catalogue empreintes. */
type Phase = "deposit" | "bridge";

/** Dans la phase dépôt : formulaire actif, ou panneau après succès. */
type DepositLane = "form" | "ack";

function tributeDisplayName(
  tribute: TributePayload,
  locale: "fr" | "en",
): string {
  if (tribute.displayName?.trim()) return tribute.displayName.trim();
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
    depositLead: "Laissez d'abord une empreinte : une photo ou un mot.",
    loading: "Ouverture du Sanctuaire…",
    errorTitle: "Lien indisponible",
    errorBody:
      "Ce Sanctuaire est introuvable ou n'est plus accessible. Demandez un nouveau lien à la famille.",
    ackTitle: "Votre souvenir a été déposé.",
    ackBody:
      "Vous pouvez en ajouter d'autres, en toute sérénité, jusqu'à cinq photos.",
    photoCounter: (n: number, max: number) => `${n} / ${max} souvenirs`,
    addAnother: "Ajouter un autre souvenir",
    continueToImprints: "Continuer",
    photoLimitReached:
      "Vous avez offert cinq photos. Un geste déjà généreux. Poursuivez si vous le souhaitez.",
    bridgeTitle: "Votre empreinte a été ajoutée.",
    bridgeBody:
      "Souhaitez-vous soutenir la production de ce film hommage, avec le geste qui vous ressemble ?",
    bridgeBodyAfterGift:
      "Si le cœur vous en dit, vous pouvez offrir un autre geste, sans obligation.",
    contribSuccess: "Merci. Votre soutien a bien été enregistré.",
    contribCancel: "Paiement annulé. Vous pouvez choisir une autre empreinte.",
    lueurSettle: "Votre lueur rejoint le Sanctuaire…",
  },
  en: {
    brandWordmark: "Odyssey",
    kicker: "Sanctuary",
    poweredBy: "Powered by",
    welcome: (name: string) => `Welcome to ${name}'s Sanctuary.`,
    subtitle: "The family is gathering memories to weave a timeless work.",
    depositLead: "First, leave a mark: a photo or a few words.",
    loading: "Opening the Sanctuary…",
    errorTitle: "Link unavailable",
    errorBody:
      "This Sanctuary could not be found or is no longer available. Ask the family for a new link.",
    ackTitle: "Your memory has been placed.",
    ackBody: "You may add more, gently, up to five photos.",
    photoCounter: (n: number, max: number) =>
      `${n} / ${max} memor${n === 1 ? "y" : "ies"}`,
    addAnother: "Add another memory",
    continueToImprints: "Continue",
    photoLimitReached:
      "You have offered five photos. Already a generous gift. Continue whenever you wish.",
    bridgeTitle: "Your mark has been placed.",
    bridgeBody:
      "Would you like to support the making of this tribute film, with a gift that feels right?",
    bridgeBodyAfterGift:
      "If you wish, you may offer another gesture, with no obligation.",
    contribSuccess: "Thank you. Your support has been recorded.",
    contribCancel: "Payment cancelled. You can choose another imprint.",
    lueurSettle: "Your glow joins the Sanctuary…",
  },
} as const;

/**
 * Shell client du Sanctuaire — dépôt (multi photos) → catalogue → checkout.
 */
export function SanctuaryLanding({ token, locale }: SanctuaryLandingProps) {
  const t = copy[locale];
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [deposit, setDeposit] = useState<SanctuaryDepositResult | null>(null);
  const [phase, setPhase] = useState<Phase>("deposit");
  const [depositLane, setDepositLane] = useState<DepositLane>("form");
  const [photoCount, setPhotoCount] = useState(0);
  const [photoMax, setPhotoMax] = useState(SANCTUARY_GUEST_PHOTO_MAX);
  const [formKey, setFormKey] = useState(0);
  const [selectedPackKey, setSelectedPackKey] = useState<string | null>(null);
  const [voiceMediaId, setVoiceMediaId] = useState<string | null>(null);
  const [videoMediaId, setVideoMediaId] = useState<string | null>(null);
  const [patronAmountCents, setPatronAmountCents] = useState(
    GUEST_PATRON_SUGGESTED_CENTS,
  );
  const [contribFlash, setContribFlash] = useState<
    "success" | "cancel" | null
  >(null);
  const [lueurSettling, setLueurSettling] = useState(false);

  const handleSelectPack = (key: string) => {
    setSelectedPackKey(key);
    if (key !== "guest_voice") {
      setVoiceMediaId(null);
    }
    if (key !== "guest_video") {
      setVideoMediaId(null);
    }
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

  const canAddAnotherPhoto = photoCount < photoMax;
  const showDepositAck =
    phase === "deposit" &&
    (depositLane === "ack" || !canAddAnotherPhoto);
  const showDepositForm =
    phase === "deposit" && depositLane === "form" && canAddAnotherPhoto;

  const handleDeposited = (result: SanctuaryDepositResult) => {
    setDeposit(result);
    if (result.kind === "photo") {
      setPhotoCount((n) => Math.min(n + 1, photoMax));
    }
  };

  const handleDepositFlowComplete = () => {
    setDepositLane("ack");
  };

  const handleAddAnother = () => {
    setDepositLane("form");
    setFormKey((k) => k + 1);
  };

  const remainingPhotoSlots = Math.max(0, photoMax - photoCount);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const contrib = params.get("contrib");
    if (contrib === "success" || contrib === "cancel") {
      // Relancer le catalogue (pas le dépôt) pour empiler un autre geste.
      setPhase("bridge");
      setSelectedPackKey(null);
      setVoiceMediaId(null);
      setVideoMediaId(null);

      let lastImprint: string | null = null;
      try {
        lastImprint = sessionStorage.getItem(SANCTUARY_LAST_IMPRINT_KEY);
        sessionStorage.removeItem(SANCTUARY_LAST_IMPRINT_KEY);
      } catch {
        lastImprint = null;
      }

      if (contrib === "success" && lastImprint === "guest_candle") {
        setLueurSettling(true);
        const timer = window.setTimeout(() => {
          setLueurSettling(false);
          setContribFlash("success");
        }, 2600);
        params.delete("contrib");
        params.delete("session_id");
        const next = `${window.location.pathname}${
          params.toString() ? `?${params.toString()}` : ""
        }`;
        window.history.replaceState({}, "", next);
        return () => window.clearTimeout(timer);
      }

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
        guestPhotoCount: 0,
        guestPhotoMax: SANCTUARY_GUEST_PHOTO_MAX,
      });
      setPhotoCount(0);
      setPhotoMax(SANCTUARY_GUEST_PHOTO_MAX);
      setDepositLane("form");
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
          guestPhotoCount?: number;
          guestPhotoMax?: number;
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
        const max = body.guestPhotoMax ?? SANCTUARY_GUEST_PHOTO_MAX;
        const count = Math.max(0, body.guestPhotoCount ?? 0);
        setPhotoMax(max);
        setPhotoCount(count);
        setDepositLane(count >= max ? "ack" : "form");
        setLoad({
          status: "ready",
          tribute: body.tribute,
          packs: Array.isArray(body.packs) ? body.packs : [],
          guestPhotoCount: count,
          guestPhotoMax: max,
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
          style={{ backgroundImage: SANCTUARY_HALO_UV }}
        />
        <div
          className="sanctuary-halo-breathe absolute left-1/2 top-[42%] h-[min(55vh,520px)] w-[min(120vw,52rem)] -translate-x-1/2 -translate-y-1/2 blur-[140px]"
          style={{ backgroundImage: SANCTUARY_HALO_TEAL }}
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

        {lueurSettling ? (
          <div
            className="mb-10 flex flex-col items-center gap-5"
            role="status"
            aria-live="polite"
          >
            <div className="sanctuary-lueur-settle">
              <SanctuaryLueurOrb
                variant="single"
                size="ritual"
                aria-label={locale === "fr" ? "Lueur" : "Glow"}
              />
            </div>
            <p className="text-center font-editorial text-lg text-teal-100/90">
              {t.lueurSettle}
            </p>
          </div>
        ) : null}

        {contribFlash && !lueurSettling ? (
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

            {load.status === "ready" && phase === "deposit" ? (
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
                  {showDepositForm ? (
                    <p className="mt-8 text-[10px] font-medium uppercase tracking-[0.36em] text-teal-400/75">
                      {t.depositLead}
                    </p>
                  ) : null}
                  {photoCount > 0 ? (
                    <p
                      className="mt-4 text-[11px] font-medium uppercase tracking-[0.28em] text-teal-400/80"
                      aria-live="polite"
                    >
                      {t.photoCounter(photoCount, photoMax)}
                    </p>
                  ) : null}
                </div>

                {showDepositAck ? (
                  <div
                    className="space-y-6 rounded-sm border border-white/10 bg-white/[0.03] px-5 py-7 backdrop-blur-sm md:px-8"
                    role="status"
                  >
                    <div className="space-y-3 text-center">
                      <div
                        className="mx-auto h-px w-12 bg-teal-400/35"
                        aria-hidden
                      />
                      {canAddAnotherPhoto ? (
                        <>
                          <p className="font-editorial text-xl font-medium tracking-tight text-zinc-50 md:text-2xl">
                            {t.ackTitle}
                          </p>
                          <p className="text-sm font-light leading-relaxed text-white/55">
                            {t.ackBody}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-light leading-relaxed text-white/55 md:text-base">
                          {t.photoLimitReached}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      {canAddAnotherPhoto ? (
                        <button
                          type="button"
                          onClick={handleAddAnother}
                          className={`${sanctuarySecondaryButton} w-full`}
                        >
                          {t.addAnother}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setPhase("bridge")}
                        className={`${sanctuaryGhostButton} w-full`}
                      >
                        {t.continueToImprints}
                      </button>
                    </div>
                  </div>
                ) : null}

                {showDepositForm ? (
                  <div className="rounded-sm border border-white/10 bg-white/[0.03] px-5 py-8 backdrop-blur-sm md:px-8">
                    <SanctuaryDepositForm
                      key={formKey}
                      token={token}
                      locale={locale}
                      remainingPhotoSlots={remainingPhotoSlots}
                      initialName={deposit?.contributorName ?? ""}
                      initialEmail={deposit?.contributorEmail ?? ""}
                      onDeposited={handleDeposited}
                      onFlowComplete={handleDepositFlowComplete}
                    />
                  </div>
                ) : null}
              </motion.div>
            ) : null}

            {load.status === "ready" && phase === "bridge" ? (
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
                    {contribFlash === "success"
                      ? t.bridgeBodyAfterGift
                      : t.bridgeBody}
                  </p>
                  {photoCount > 0 ? (
                    <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/40">
                      {t.photoCounter(photoCount, photoMax)}
                    </p>
                  ) : null}
                </div>

                <ImprintCatalog
                  locale={locale}
                  packs={load.packs}
                  selectedKey={selectedPackKey}
                  onSelect={handleSelectPack}
                  voiceSlot={
                    <GuestVoiceRecorder
                      token={token}
                      locale={locale}
                      contributorName={deposit?.contributorName ?? ""}
                      contributorEmail={deposit?.contributorEmail}
                      mediaId={voiceMediaId}
                      onMediaIdChange={setVoiceMediaId}
                      embedded
                    />
                  }
                  videoSlot={
                    <GuestVideoRecorder
                      token={token}
                      locale={locale}
                      contributorName={deposit?.contributorName ?? ""}
                      contributorEmail={deposit?.contributorEmail}
                      mediaId={videoMediaId}
                      onMediaIdChange={setVideoMediaId}
                      embedded
                    />
                  }
                  lueurSlot={<SanctuaryLueurPanel locale={locale} />}
                  patronSlot={
                    <PatronAmountField
                      locale={locale}
                      open
                      embedded
                      amountCents={patronAmountCents}
                      onChange={setPatronAmountCents}
                      amountMinCents={patronPack?.amountMinCents}
                      amountMaxCents={patronPack?.amountMaxCents}
                      amountSuggestedCents={patronPack?.amountSuggestedCents}
                    />
                  }
                />

                <ImprintCheckoutCta
                  token={token}
                  locale={locale}
                  productKey={selectedPackKey}
                  patronAmountCents={patronAmountCents}
                  patronMinCents={patronPack?.amountMinCents}
                  patronMaxCents={patronPack?.amountMaxCents}
                  contributorName={deposit?.contributorName ?? ""}
                  contributorEmail={deposit?.contributorEmail}
                  fixedPriceCents={selectedPack?.priceCents}
                  mediaId={
                    selectedPackKey === "guest_video"
                      ? videoMediaId
                      : voiceMediaId
                  }
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
