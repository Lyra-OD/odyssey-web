"use client";

import { usePathname, useRouter } from "next/navigation";

import type { Locale } from "@/i18n.config";
import { SalonCyanGlowText } from "@/src/components/salon/SalonCyanGlowText";
import { buildLocaleSwitchedHref } from "@/src/lib/i18n/buildLocaleSwitchedHref";

export type LocaleSwitcherLabels = {
  languageLabel: string;
  langOptionFr: string;
  langOptionEn: string;
};

type LocaleSwitcherProps = LocaleSwitcherLabels & {
  lang: Locale;
  className?: string;
};

const inactiveLocaleClass =
  "text-zinc-500 transition-colors hover:text-[var(--salon-cyan-dim)]";

function LocaleOption({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  if (!isActive) {
    return (
      <button type="button" onClick={onClick} className={inactiveLocaleClass}>
        {label}
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick} className="relative transition-colors">
      <SalonCyanGlowText>{label}</SalonCyanGlowText>
    </button>
  );
}

export function LocaleSwitcher({
  lang,
  languageLabel,
  langOptionFr,
  langOptionEn,
  className = "",
}: LocaleSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = (nextLang: Locale) => {
    if (nextLang === lang) return;
    const search =
      typeof window !== "undefined" ? window.location.search : "";
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    router.push(
      buildLocaleSwitchedHref(pathname ?? "/", nextLang, search, hash),
    );
  };

  return (
    <div
      className={`flex items-center gap-1.5 font-label text-[10px] font-bold uppercase tracking-[0.36em] ${className}`}
      role="group"
      aria-label={languageLabel}
    >
      <LocaleOption
        label={langOptionFr}
        isActive={lang === "fr"}
        onClick={() => switchTo("fr")}
      />
      <span className="text-zinc-600" aria-hidden>
        /
      </span>
      <LocaleOption
        label={langOptionEn}
        isActive={lang === "en"}
        onClick={() => switchTo("en")}
      />
    </div>
  );
}
