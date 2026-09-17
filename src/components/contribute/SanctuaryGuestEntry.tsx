"use client";

import { useEffect, useState, type ComponentType } from "react";

import { SanctuarySkyShell } from "@/src/components/contribute/SanctuarySkyShell";
import type { SanctuaryGuestPayload } from "@/src/lib/contribute/sanctuaryGuestPayload";
import type { AppDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";

type SanctuaryCopy = AppDictionary["sanctuary"];

type RitualProps = {
  token: string;
  locale: Locale;
  copyFr: SanctuaryCopy;
  copyEn: SanctuaryCopy;
  initial?: SanctuaryGuestPayload | null;
  initialPhase?: "sky" | "deposit" | "graft" | "bridge";
};

type RitualMod = ComponentType<RitualProps>;

export function SanctuaryGuestEntry({
  token,
  locale,
  copyFr,
  copyEn,
  initial,
  errorMessage,
}: {
  token: string;
  locale: Locale;
  copyFr: SanctuaryCopy;
  copyEn: SanctuaryCopy;
  initial: SanctuaryGuestPayload | null;
  errorMessage: string | null;
}) {
  const [uiLocale, setUiLocale] = useState(locale);
  const [Ritual, setRitual] = useState<RitualMod | null>(null);
  const [phaseHint, setPhaseHint] = useState<
    RitualProps["initialPhase"] | undefined
  >(undefined);
  const t = uiLocale === "en" ? copyEn : copyFr;

  useEffect(() => {
    setUiLocale(locale);
  }, [locale]);

  useEffect(() => {
    const contrib = new URLSearchParams(window.location.search).get("contrib");
    if (contrib === "success" || contrib === "cancel") {
      setPhaseHint("bridge");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void import("@/src/components/contribute/SanctuaryLanding").then((m) => {
      if (!cancelled) setRitual(() => m.SanctuaryLanding);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (errorMessage && !initial) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#020202] px-6 text-zinc-100">
        <p className="max-w-sm text-center text-sm font-light text-white/55">
          {errorMessage}
        </p>
      </main>
    );
  }

  if (Ritual) {
    return (
      <Ritual
        token={token}
        locale={uiLocale}
        copyFr={copyFr}
        copyEn={copyEn}
        initial={initial}
        initialPhase={phaseHint}
      />
    );
  }

  return (
    <SanctuarySkyShell
      locale={uiLocale}
      copy={t}
      tribute={initial?.tribute ?? null}
      onLocale={setUiLocale}
      onCta={() => setPhaseHint("deposit")}
      ctaReady={Boolean(initial)}
      ctaBusy={phaseHint === "deposit"}
    />
  );
}
