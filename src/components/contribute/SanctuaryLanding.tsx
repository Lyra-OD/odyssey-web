"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { GuestStarPills } from "@/src/components/contribute/GuestStarPills";
import { SanctuaryMonolith } from "@/src/components/contribute/SanctuaryMonolith";
import { connexionSubmitButtonClass } from "@/src/components/salon/SalonCyanGlowText";
import { formatCircleDisplayName } from "@/src/lib/contribute/circle";
import { LocaleSwitcher } from "@/src/components/i18n/LocaleSwitcher";
import type { AppDictionary } from "@/lib/dictionaries";
import {
  isSanctuarySkyPreview,
  isSanctuaryVisualPreview,
  SANCTUARY_PREVIEW_TRIBUTE,
  sanctuaryPreviewPacks,
} from "@/src/lib/contribute/sanctuaryPreview";
import { useConstellationCraftReveal } from "@/src/components/contribute/constellation/useConstellationCraftReveal";
import {
  SANCTUARY_HALO_TEAL,
  SANCTUARY_HALO_UV,
  SANCTUARY_LAST_IMPRINT_KEY,
  sanctuaryGhostButton,
} from "@/src/lib/contribute/sanctuaryChrome";
import { SANCTUARY_GUEST_PHOTO_MAX } from "@/src/lib/contribute/sanctuaryLimits";
import {
  DURATION_RITUAL,
  EASE_OUT_LUXE,
} from "@/src/lib/motion/easing";
import { SKY_GUEST_DEMO_LAYERS } from "@/src/components/contribute/constellation/skyCraftLayers";
import type { ConstellationRevealCraft } from "@/src/components/contribute/SanctuaryUniverse";
import {
  DEFAULT_HERO_GLOBAL_SCALE,
  DEFAULT_HERO_SPIKES,
  DEFAULT_HERO_TEAL,
  DEFAULT_HERO_WHITE,
} from "@/src/components/contribute/constellation/HeroStar";
import { HUB_HERO_BREATH_SPEED_INVITE } from "@/src/components/contribute/constellation/graphs/hubIdle";
import { WIZARD_BIRTH_REVEAL_END } from "@/src/lib/contribute/wizardBirthReveal";
import { GUEST_PATRON_SUGGESTED_CENTS } from "@/src/lib/wizard/guestSupportPacks";
import type { Locale } from "@/i18n.config";

const GUEST_KEEP_REVEAL_REF = { current: WIZARD_BIRTH_REVEAL_END };

const SanctuaryUniverse = dynamic(
  () =>
    import("@/src/components/contribute/SanctuaryUniverse").then(
      (m) => m.SanctuaryUniverse,
    ),
  {
    ssr: false,
    loading: () => <div className="h-screen w-full bg-black" />,
  },
);

export type SanctuaryCopy = AppDictionary["sanctuary"];

export type SanctuaryLandingProps = {
  token: string;
  locale: Locale;
  copy: SanctuaryCopy;
};

type TributePayload = {
  firstName: string | null;
  lastName: string | null;
  displayName?: string;
};

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(vars[key] ?? ""),
  );
}

function tributeSkyName(
  tribute: TributePayload,
  locale: Locale,
): string {
  const first = tribute.firstName?.trim();
  if (first) return first;
  return tributeDisplayName(tribute, locale);
}

function starIdFromName(name: string): string {
  return name.trim().toLowerCase();
}

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

/** Ciel d'abord → dépôt (courriel inclus) → greffe étoile → offres. */
type Phase = "sky" | "deposit" | "graft" | "bridge";

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

/** Preview `test-ciel` — même reveal que onglet Constellation (`/test-lueur`). */
function SkyPreviewExperience({ locale }: { locale: Locale }) {
  const [skyOpen, setSkyOpen] = useState(true);
  const { craftReveal, restart } = useConstellationCraftReveal({
    autoPlay: skyOpen,
    heroName: SANCTUARY_PREVIEW_TRIBUTE.firstName,
  });
  const seeSky = locale === "en" ? "See the sky" : "Voir le ciel";
  const whisper =
    locale === "en" ? "The sky is filling" : "Le ciel se remplit";

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-zinc-100 antialiased">
      <SanctuaryUniverse
        mode={skyOpen ? "immersive" : "background"}
        className={skyOpen ? "fixed inset-0 z-40" : "absolute inset-0 z-0"}
        onClose={skyOpen ? () => setSkyOpen(false) : undefined}
        locale={locale}
        craftReveal={craftReveal}
      />
      <div className="absolute right-4 top-4 z-50 md:right-8 md:top-8">
        <LocaleSwitcher
          lang={locale}
          languageLabel={locale === "en" ? "Language" : "Langue"}
          langOptionFr="FR"
          langOptionEn="EN"
        />
      </div>
      {!skyOpen ? (
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-8 px-6">
          <p className="text-sm font-light uppercase tracking-[0.35em] text-teal-50/35">
            {whisper}
          </p>
          <button
            type="button"
            onClick={() => {
              setSkyOpen(true);
              restart();
            }}
            className={`${sanctuaryGhostButton} px-6 py-3 text-[11px] uppercase tracking-[0.28em]`}
          >
            {seeSky}
          </button>
        </div>
      ) : null}
    </main>
  );
}

/**
 * Shell client du Sanctuaire — dépôt (multi photos) → catalogue → checkout.
 */
export function SanctuaryLanding({ token, locale, copy: t }: SanctuaryLandingProps) {
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [deposit, setDeposit] = useState<SanctuaryDepositResult | null>(null);
  const [phase, setPhase] = useState<Phase>("sky");
  const [guestStars, setGuestStars] = useState<
    { id: string; label: string }[]
  >([]);
  const [graftingStarId, setGraftingStarId] = useState<string | null>(null);
  const pendingStarNameRef = useRef<string | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [photoMax, setPhotoMax] = useState(SANCTUARY_GUEST_PHOTO_MAX);
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
  const [skyOpen, setSkyOpen] = useState(false);

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

  const remainingPhotoSlots = Math.max(0, photoMax - photoCount);

  const upsertGuestStar = (rawName: string) => {
    const label = formatCircleDisplayName(rawName) ?? rawName.trim();
    if (!label) return;
    const id = starIdFromName(rawName);
    setGraftingStarId(id);
    setGuestStars((prev) => {
      if (prev.some((s) => s.id === id)) return prev;
      return [...prev, { id, label }];
    });
  };

  const handleDeposited = (result: SanctuaryDepositResult) => {
    setDeposit(result);
    pendingStarNameRef.current = result.contributorName;
    if (result.kind === "photo") {
      setPhotoCount((n) => Math.min(n + 1, photoMax));
    }
  };

  const handleDepositFlowComplete = () => {
    const raw = pendingStarNameRef.current ?? deposit?.contributorName;
    if (raw) upsertGuestStar(raw);
    setPhase("graft");
  };

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
    if (isSanctuarySkyPreview(token)) {
      return;
    }

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
          circle?: { displayName?: string }[];
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
        const fromCircle = (body.circle ?? [])
          .map((m) => {
            const label = (m.displayName ?? "").trim();
            if (!label) return null;
            return { id: starIdFromName(label), label };
          })
          .filter((s): s is { id: string; label: string } => s !== null);
        if (fromCircle.length > 0) {
          setGuestStars(fromCircle);
        }
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

  if (isSanctuarySkyPreview(token)) {
    return (
      <SkyPreviewExperience locale={locale} />
    );
  }

  const skyFirst = load.status === "ready" && phase === "sky";
  const grafting = load.status === "ready" && phase === "graft";
  const showMonolith =
    load.status === "ready" &&
    (phase === "deposit" || phase === "bridge") &&
    !skyOpen &&
    !lueurSettling;
  const universeImmersive =
    skyFirst || grafting || skyOpen || load.status === "loading" || lueurSettling;
  const hideLegacySheet =
    skyFirst ||
    grafting ||
    skyOpen ||
    showMonolith ||
    lueurSettling ||
    load.status === "loading";
  const lockPageScroll =
    skyFirst ||
    grafting ||
    skyOpen ||
    lueurSettling ||
    load.status === "loading";

  useEffect(() => {
    if (!lockPageScroll) return;
    const root = document.documentElement;
    const prevRoot = root.style.overflow;
    const prevBody = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      root.style.overflow = prevRoot;
      document.body.style.overflow = prevBody;
    };
  }, [lockPageScroll]);

  const localeSwitcher = (
    <LocaleSwitcher
      lang={locale}
      languageLabel={t.languageLabel}
      langOptionFr={t.langOptionFr}
      langOptionEn={t.langOptionEn}
    />
  );

  const guestHeroName =
    load.status === "ready" ? tributeSkyName(load.tribute, locale) : undefined;
  const guestCraftReveal = useMemo((): ConstellationRevealCraft => {
    GUEST_KEEP_REVEAL_REF.current = WIZARD_BIRTH_REVEAL_END;
    return {
      controlled: true,
      revealT: WIZARD_BIRTH_REVEAL_END,
      revealTRef: GUEST_KEEP_REVEAL_REF,
      hubHeroOnly: true,
      heroName: guestHeroName,
      skyActive: true,
      heroAtom: {
        white: { ...DEFAULT_HERO_WHITE, breath: HUB_HERO_BREATH_SPEED_INVITE },
        teal: { ...DEFAULT_HERO_TEAL, breath: HUB_HERO_BREATH_SPEED_INVITE },
        spikes: { ...DEFAULT_HERO_SPIKES, breath: HUB_HERO_BREATH_SPEED_INVITE },
        embedScale: 0.42,
        globalScale: DEFAULT_HERO_GLOBAL_SCALE,
      },
    };
  }, [guestHeroName]);

  return (
    <main
      className={`relative bg-[#020202] text-zinc-100 antialiased ${
        lockPageScroll
          ? "h-dvh overflow-hidden overscroll-none"
          : "min-h-screen overflow-x-hidden"
      }`}
    >
      <SanctuaryUniverse
        mode={universeImmersive ? "immersive" : "background"}
        className={
          universeImmersive ? "fixed inset-0 z-40" : "absolute inset-0 z-0"
        }
        constellationVisible
        skyCraftChrome={false}
        wanderChrome={false}
        skyLayers={SKY_GUEST_DEMO_LAYERS}
        craftReveal={guestCraftReveal}
        skipConstellationReveal
        parallaxIntensity={0}
        wizardRewardFullPerf={universeImmersive}
        onClose={
          skyOpen && !skyFirst && !grafting ? () => setSkyOpen(false) : undefined
        }
        locale={locale}
      />

      <GuestStarPills
        stars={showMonolith ? [] : guestStars}
        ariaLabelFor={(name) => fill(t.guestStarAria, { name })}
        graftingId={grafting ? graftingStarId : null}
        className={
          skyFirst || grafting || skyOpen || lueurSettling ? "z-[45]" : "z-[25]"
        }
      />

      {load.status === "loading" ? (
        <p className="fixed inset-0 z-[46] flex items-center justify-center text-sm font-light text-zinc-500">
          {t.loading}
        </p>
      ) : null}

      {skyFirst ? (
        <div className="pointer-events-none fixed inset-0 z-[46] flex flex-col">
          <div className="flex justify-end px-4 pt-4 md:px-8 md:pt-8">
            <div className="pointer-events-auto">
              <LocaleSwitcher
                lang={locale}
                languageLabel={t.languageLabel}
                langOptionFr={t.langOptionFr}
                langOptionEn={t.langOptionEn}
              />
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex flex-col items-center gap-6 px-6 pb-16 text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.55em] text-white/35">
              {t.kicker}
            </p>
            <h1 className="font-editorial text-[1.85rem] font-medium tracking-tight text-zinc-50 md:text-4xl">
              {fill(t.skyOf, {
                name: tributeSkyName(load.tribute, locale),
              })}
            </h1>
            <button
              type="button"
              onClick={() => setPhase("deposit")}
              className={`pointer-events-auto parcours-monolith-continue ${connexionSubmitButtonClass} max-w-xs touch-manipulation`}
            >
              {t.skyCta}
            </button>
            <p className="text-[8px] font-medium uppercase tracking-[0.44em] text-white/26">
              {t.poweredBy} {t.brandWordmark}
            </p>
          </div>
        </div>
      ) : null}

      {grafting ? (
        <div className="pointer-events-none fixed inset-0 z-[46] flex flex-col">
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[42vh] bg-gradient-to-t from-black/70 via-black/25 to-transparent"
            aria-hidden
          />
          <div className="flex justify-end px-4 pt-4 md:px-8 md:pt-8">
            <div className="pointer-events-auto">{localeSwitcher}</div>
          </div>
          <div className="flex-1" />
          <div className="relative flex flex-col items-center gap-5 px-6 pb-16 text-center">
            <h2 className="font-editorial text-[1.65rem] font-medium tracking-tight text-zinc-50 md:text-3xl">
              {t.graftTitle}
            </h2>
            <p className="max-w-sm text-sm font-light leading-relaxed text-white/70 md:text-base">
              {t.graftBody}
            </p>
            <button
              type="button"
              onClick={() => setPhase("bridge")}
              className={`pointer-events-auto parcours-monolith-continue ${connexionSubmitButtonClass} max-w-xs touch-manipulation`}
            >
              {t.graftCta}
            </button>
          </div>
        </div>
      ) : null}

      {lueurSettling ? (
        <div
          className="fixed inset-0 z-[50] flex flex-col items-center justify-center gap-5"
          role="status"
          aria-live="polite"
        >
          <div className="sanctuary-lueur-settle">
            <SanctuaryLueurOrb
              variant="single"
              size="ritual"
              aria-label={t.lueurLabel}
            />
          </div>
          <p className="text-center font-editorial text-lg text-teal-100/90">
            {t.lueurSettle}
          </p>
        </div>
      ) : null}

      {showMonolith && load.status === "ready" && phase === "deposit" ? (
        <SanctuaryMonolith header={localeSwitcher}>
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="font-editorial text-[1.65rem] font-medium leading-snug tracking-tight text-zinc-50 md:text-3xl">
                {fill(t.welcome, {
                  name: tributeDisplayName(load.tribute, locale),
                })}
              </h1>
              <p className="mx-auto mt-4 max-w-md text-sm font-light leading-relaxed text-white/55 md:text-base">
                {t.subtitle}
              </p>
              <p className="mt-6 text-[10px] font-medium uppercase tracking-[0.36em] text-teal-400/75">
                {t.depositLead}
              </p>
              {photoCount > 0 ? (
                <p
                  className="mt-3 text-[11px] font-medium uppercase tracking-[0.28em] text-teal-400/80"
                  aria-live="polite"
                >
                  {fill(t.photoCounter, {
                    n: photoCount,
                    max: photoMax,
                  })}
                </p>
              ) : null}
            </div>
            <SanctuaryDepositForm
              token={token}
              locale={locale}
              copy={t.deposit}
              remainingPhotoSlots={remainingPhotoSlots}
              initialName={deposit?.contributorName ?? ""}
              initialEmail={deposit?.contributorEmail ?? ""}
              onDeposited={handleDeposited}
              onFlowComplete={handleDepositFlowComplete}
            />
          </div>
        </SanctuaryMonolith>
      ) : null}

      {showMonolith && load.status === "ready" && phase === "bridge" ? (
        <SanctuaryMonolith header={localeSwitcher}>
          <div className="space-y-8">
            {contribFlash ? (
              <p
                className={`text-center text-sm font-light ${
                  contribFlash === "success" ? "text-teal-300/90" : "text-zinc-400"
                }`}
                role="status"
              >
                {contribFlash === "success" ? t.contribSuccess : t.contribCancel}
              </p>
            ) : null}
            <ImprintCatalog
              locale={locale}
              packs={load.packs}
              selectedKey={selectedPackKey}
              onSelect={handleSelectPack}
              title={t.packsTitle}
              promise={
                contribFlash === "success" ? t.bridgeBodyAfterGift : t.packsPromise
              }
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
                selectedPackKey === "guest_video" ? videoMediaId : voiceMediaId
              }
              copy={t}
            />
            <button
              type="button"
              onClick={() => setPhase("sky")}
              className={`${sanctuaryGhostButton} w-full`}
            >
              {t.skipSupport}
            </button>
          </div>
        </SanctuaryMonolith>
      ) : null}

      <div
        className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute left-1/2 top-[36%] h-[min(70vh,680px)] w-[min(150vw,68rem)] -translate-x-1/2 -translate-y-1/2 opacity-25 blur-[180px]"
          style={{ backgroundImage: SANCTUARY_HALO_UV }}
        />
        <div
          className="sanctuary-halo-breathe absolute left-1/2 top-[42%] h-[min(55vh,520px)] w-[min(120vw,52rem)] -translate-x-1/2 -translate-y-1/2 opacity-40 blur-[140px]"
          style={{ backgroundImage: SANCTUARY_HALO_TEAL }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/25 to-transparent" />
      </div>

      {!hideLegacySheet ? (
      <div
        className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col px-6 pb-10 pt-12 md:px-8 md:pt-16"
      >
        <header className="relative mb-10">
          <div className="absolute right-0 top-0 z-10 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSkyOpen(true)}
              className={`${sanctuaryGhostButton} px-3 py-1.5 text-[10px] uppercase tracking-[0.22em]`}
            >
              {t.seeSky}
            </button>
            <LocaleSwitcher
              lang={locale}
              languageLabel={t.languageLabel}
              langOptionFr={t.langOptionFr}
              langOptionEn={t.langOptionEn}
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

        <div className="flex-1">
          <AnimatePresence mode="wait">
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
      ) : null}
    </main>
  );
}
