"use client";

import type { ReactNode } from "react";

import { DashboardSignOut } from "@/src/components/dashboard/DashboardSignOut";
import {
  LocaleSwitcher,
  type LocaleSwitcherLabels,
} from "@/src/components/i18n/LocaleSwitcher";
import type { Locale } from "@/i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";

type HqShellProps = {
  lang: Locale;
  signOutLabel: string;
  localeSwitcher: LocaleSwitcherLabels;
  children: ReactNode;
};

export function HqShell({
  lang,
  signOutLabel,
  localeSwitcher,
  children,
}: HqShellProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#020202] text-white">
      <header className="relative z-10 mx-auto flex w-full max-w-[1400px] items-center justify-between gap-6 px-5 py-8 md:px-12">
        <p className="font-brand text-[11px] font-medium uppercase tracking-[0.28em] text-white/55">
          Odyssey
        </p>
        <div className="flex items-center gap-6">
          <LocaleSwitcher lang={lang} {...localeSwitcher} />
          <DashboardSignOut
            lang={lang}
            label={signOutLabel}
            signInHref={appRoutes.hqConnexion(lang)}
            className="px-0 py-0 text-[10px] font-bold uppercase tracking-[0.36em] text-zinc-500 shadow-none hover:border-transparent hover:bg-transparent hover:text-zinc-200"
          />
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-[1400px] px-5 pb-24 pt-4 md:px-12">
        {children}
      </main>
    </div>
  );
}
