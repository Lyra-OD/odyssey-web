"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Languages, LogIn, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AppDictionary } from "../../lib/dictionaries";
import type { Locale } from "../../i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";

const MotionLink = motion(Link);

const menuSpring = { type: "spring" as const, stiffness: 420, damping: 24 };

const MOBILE_PANEL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function Navbar({
  lang,
  dictionary,
}: {
  lang: Locale;
  dictionary: AppDictionary["header"];
}) {
  const t = dictionary;
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const navItems = useMemo(() => {
    const nav = t.nav;
    const localeRoot = `/${lang}`;
    return [
      { href: `${localeRoot}`, label: nav.home },
      { href: `${localeRoot}#manifesto`, label: nav.manifesto },
      { href: `${localeRoot}#process`, label: nav.process },
      { href: `${localeRoot}#pricing`, label: nav.pricing },
      { href: `${localeRoot}/partners`, label: nav.partners },
      { href: `${localeRoot}/contact`, label: nav.contact },
    ] as const;
  }, [lang, t.nav]);

  useEffect(() => {
    setMobileOpen(false);
  }, [lang]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  const switchLocale = (nextLang: Locale) => {
    const currentPath = pathname ?? "/";
    const search =
      typeof window !== "undefined" ? window.location.search : "";
    /* Legacy /login → connexion studio */
    if (currentPath === "/login") {
      router.push(appRoutes.studioConnexion(nextLang));
      return;
    }
    const legacyLoginMatch = /^\/(fr|en)\/login$/.exec(currentPath);
    if (legacyLoginMatch) {
      router.push(appRoutes.studioConnexion(nextLang));
      return;
    }
    const connexionMatch =
      /^\/(fr|en)\/(studio|salon)\/connexion$/.exec(currentPath);
    if (connexionMatch) {
      const segment = connexionMatch[2] as "studio" | "salon";
      const base =
        segment === "salon"
          ? appRoutes.salonConnexion(nextLang)
          : appRoutes.studioConnexion(nextLang);
      router.push(`${base}${search}`);
      return;
    }
    const parts = currentPath.split("/").filter(Boolean);
    const rest = parts[0] === "fr" || parts[0] === "en" ? parts.slice(1) : parts;
    const nextPath = `/${nextLang}${rest.length > 0 ? `/${rest.join("/")}` : ""}`;
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    router.push(`${nextPath}${hash}`);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: MOBILE_PANEL_EASE }}
      className="font-label fixed left-0 right-0 top-0 z-50 border-b border-zinc-900/80 bg-black/70 backdrop-blur-md"
      style={{
        paddingLeft: "max(0px, env(safe-area-inset-left))",
        paddingRight: "max(0px, env(safe-area-inset-right))",
        paddingTop: "max(0px, env(safe-area-inset-top))",
      }}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-5 sm:py-4 md:px-10">
        <MotionLink
          href={`/${lang}`}
          aria-label={t.logo}
          onClick={closeMobile}
          className="group flex min-w-0 flex-1 items-center gap-2.5 text-[11px] font-light uppercase tracking-[0.38em] text-zinc-400 transition-colors duration-300 hover:text-violet-300 sm:gap-3 md:flex-none touch-manipulation"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={menuSpring}
        >
          <span className="relative -ml-3 inline-flex items-center group/odyssey">
            <video
              src="/eclipse.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="absolute top-1/2 left-[60%] -translate-x-1/2 -translate-y-1/2 min-w-[250%] h-[300%] max-w-none object-cover mix-blend-screen opacity-20 pointer-events-none transition-all duration-1000 ease-out group-hover/odyssey:opacity-40 group-hover/odyssey:scale-110"
            />
            <span className="relative z-[1] font-brand truncate text-[clamp(0.8125rem,3.2vw,1.4375rem)] font-light uppercase leading-none tracking-[0.48em] text-zinc-300 transition-colors duration-300 group-hover:text-violet-200 sm:tracking-[0.55em] md:text-[23px] md:tracking-[0.62em]">
              {t.logoFallback}
            </span>
          </span>
        </MotionLink>

        <nav
          className="font-label hidden items-center gap-4 lg:gap-7 xl:gap-8 md:flex"
          aria-label={t.mainNavAria}
        >
          {navItems.map(({ href, label }) => (
            <MotionLink
              key={href + label}
              href={href}
              className="inline-block origin-center text-[10px] uppercase tracking-[0.3em] text-zinc-400 transition-colors duration-300 hover:text-violet-300 touch-manipulation"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.97 }}
              transition={menuSpring}
            >
              {label}
            </MotionLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4 md:gap-8">
          <div
            className="group/lang flex items-center gap-1 border border-zinc-800 bg-zinc-950/80 p-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors duration-300 hover:border-purple-500/35 touch-manipulation"
            role="group"
            aria-label={t.languageLabel}
          >
            <Languages
              className="mx-1 h-3.5 w-3.5 text-zinc-600 transition-colors duration-300 group-hover/lang:text-violet-400"
              aria-hidden
            />
            <motion.button
              type="button"
              onClick={() => switchLocale("fr")}
              className={`min-h-[40px] min-w-[36px] origin-center px-2 py-1 transition-colors duration-300 sm:min-h-0 sm:min-w-0 ${
                lang === "fr"
                  ? "text-violet-300 hover:text-violet-200"
                  : "text-zinc-600 hover:text-violet-300"
              }`}
              animate={{ scale: lang === "fr" ? 1.1 : 1 }}
              whileHover={lang === "fr" ? { scale: 1.12 } : { scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              transition={menuSpring}
            >
              {t.langOptionFr}
            </motion.button>
            <span className="text-zinc-700 transition-colors duration-300 group-hover/lang:text-purple-600/70" aria-hidden>
              /
            </span>
            <motion.button
              type="button"
              onClick={() => switchLocale("en")}
              className={`min-h-[40px] min-w-[36px] origin-center px-2 py-1 transition-colors duration-300 sm:min-h-0 sm:min-w-0 ${
                lang === "en"
                  ? "text-violet-300 hover:text-violet-200"
                  : "text-zinc-600 hover:text-violet-300"
              }`}
              animate={{ scale: lang === "en" ? 1.1 : 1 }}
              whileHover={lang === "en" ? { scale: 1.12 } : { scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              transition={menuSpring}
            >
              {t.langOptionEn}
            </motion.button>
          </div>

          <MotionLink
            href={appRoutes.studioConnexion(lang)}
            className="font-label group hidden min-h-[44px] items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400 transition-colors duration-300 hover:text-violet-300 sm:inline-flex sm:text-[11px] touch-manipulation"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            transition={menuSpring}
          >
            <LogIn
              className="h-3.5 w-3.5 shrink-0 transition-colors duration-300 group-hover:text-violet-300"
              strokeWidth={1.5}
              aria-hidden
            />
            <span className="underline-offset-4 transition-all group-hover:underline">{t.login}</span>
          </MotionLink>

          <motion.button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-zinc-800 bg-zinc-950/80 text-zinc-300 transition-colors hover:border-purple-500/45 hover:text-violet-200 md:hidden touch-manipulation"
            aria-expanded={mobileOpen}
            aria-controls="mobile-primary-nav"
            aria-label={mobileOpen ? t.menuClose : t.menuOpen}
            onClick={() => setMobileOpen((o) => !o)}
            whileTap={{ scale: 0.96 }}
          >
            {mobileOpen ? <X className="h-5 w-5" strokeWidth={1.25} aria-hidden /> : <Menu className="h-5 w-5" strokeWidth={1.25} aria-hidden />}
          </motion.button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {mobileOpen ? (
          <motion.div
            key="mobile-nav"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: MOBILE_PANEL_EASE }}
            className="overflow-hidden border-t border-zinc-900/60 bg-black/85 backdrop-blur-lg md:hidden"
          >
            <nav
              id="mobile-primary-nav"
              aria-label={t.mainNavAria}
              className="flex flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-1"
            >
              {navItems.map(({ href, label }) => (
                <MotionLink
                  key={`m-${href}-${label}`}
                  href={href}
                  onClick={closeMobile}
                  className="border-b border-zinc-900/70 py-3.5 text-[11px] uppercase tracking-[0.28em] text-zinc-300 transition-colors last:border-b-0 active:bg-zinc-950/80 touch-manipulation"
                  whileTap={{ scale: 0.99 }}
                >
                  {label}
                </MotionLink>
              ))}
              <MotionLink
                href={appRoutes.studioConnexion(lang)}
                onClick={closeMobile}
                className="mt-2 flex min-h-[48px] items-center gap-2 border border-zinc-800 bg-zinc-950/60 px-3 py-3 text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-300 touch-manipulation"
                whileTap={{ scale: 0.99 }}
              >
                <LogIn className="h-4 w-4 shrink-0 text-zinc-500" strokeWidth={1.5} aria-hidden />
                {t.login}
              </MotionLink>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
