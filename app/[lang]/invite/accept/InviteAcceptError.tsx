import Link from "next/link";

import type { Locale } from "@/i18n.config";

type InviteAcceptErrorProps = {
  lang: Locale;
  title: string;
  message: string;
};

export function InviteAcceptError({
  lang,
  title,
  message,
}: InviteAcceptErrorProps) {
  const homeHref = `/${lang}`;
  const contactHref = `/${lang}/contact`;
  const homeLabel = lang === "en" ? "Back to home" : "Retour à l'accueil";
  const contactLabel = lang === "en" ? "Contact us" : "Nous contacter";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020202] px-6 text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(72vh,640px)] w-[min(140vw,56rem)] -translate-x-1/2 -translate-y-1/2 opacity-40 blur-[160px]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 100% 70% at 50% 50%, rgba(139, 92, 246, 0.18) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-md text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.55em] text-white/35">
          Odyssey
        </p>
        <h1 className="mt-6 text-xl font-light tracking-[0.04em] text-white">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/55">{message}</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={homeHref}
            className="rounded-full border border-white/15 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-white/80 transition hover:border-white/30 hover:text-white"
          >
            {homeLabel}
          </Link>
          <Link
            href={contactHref}
            className="text-xs uppercase tracking-[0.2em] text-white/45 transition hover:text-white/70"
          >
            {contactLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
