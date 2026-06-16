"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Locale } from "@/i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";
import { createClient } from "@/utils/supabase/client";

export function DashboardSignOut({
  lang,
  label,
  className = "",
  signInHref,
}: {
  lang: string;
  label: string;
  className?: string;
  signInHref?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const locale: Locale = lang === "en" ? "en" : "fr";
  const destination = signInHref ?? appRoutes.studioConnexion(locale);

  async function handleSignOut() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(destination);
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void handleSignOut()}
      className={`rounded-lg border border-white/12 bg-white/[0.06] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/85 shadow-[0_0_40px_-12px_rgba(139,92,246,0.35)] transition-colors hover:bg-white/[0.12] hover:border-white/18 disabled:opacity-50 ${className}`}
    >
      {pending ? "…" : label}
    </button>
  );
}
