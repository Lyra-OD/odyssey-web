"use client";

/*
 * -----------------------------------------------------------------------------
 * MFA / 2FA — Phase ultérieure (TOTP Authenticator)
 * -----------------------------------------------------------------------------
 * Une fois le flux email + mot de passe stabilisé en production : prévoir
 * l’enrollment des facteurs MFA via `supabase.auth.mfa.enroll({ factorType: 'totp' })`,
 * les flux challenge/verify (`mfa.challenge`, `mfa.verify`), et l’exigence d’un
 * niveau AAL2 (`aal2`) sur les routes dashboard sensibles + réglages projet
 * Supabase Auth (MFA). Ne pas activer tant que la création de compte et la
 * confirmation courriel ne sont pas validées de bout en bout.
 * -----------------------------------------------------------------------------
 */

import { Eye, EyeOff, Loader2, Phone, User } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";
import {
  defaultPartnerPostAuthPath,
  defaultPostAuthPath,
} from "@/src/lib/appRoutes";
import {
  LocaleSwitcher,
  type LocaleSwitcherLabels,
} from "@/src/components/i18n/LocaleSwitcher";
import {
  normalizePartnerSlugParam,
  persistPartnerConnexionSlug,
} from "@/src/lib/partner/partnerBrandingTypes";
import { createClient } from "@/utils/supabase/client";

type AuthCopy = AppDictionary["auth"];
export type LoginAudience = "salon" | "studio";

/** Halos atmosphériques (pur UI) — centrés au foyer ; ellipse légèrement resserrée pour éviter la “bave” sur la carte. */
const HALO_SIGN_IN =
  "radial-gradient(ellipse 108% 76% at 50% 50%, rgba(192, 167, 255, 0.62) 0%, rgba(139, 92, 246, 0.38) 18%, rgba(91, 33, 182, 0.18) 40%, transparent 68%)";
const HALO_SIGN_UP =
  "radial-gradient(ellipse 106% 74% at 50% 50%, rgba(103, 232, 249, 0.6) 0%, rgba(34, 211, 238, 0.42) 20%, rgba(8, 145, 178, 0.22) 42%, transparent 68%)";
const HALO_CONFIRMATION =
  "radial-gradient(ellipse 104% 72% at 50% 50%, rgba(110, 231, 183, 0.52) 0%, rgba(52, 211, 153, 0.36) 22%, rgba(6, 95, 70, 0.22) 44%, transparent 70%)";
/** Halo erreur — magenta fluo (#ff00ff), ~0.3 au cœur du radial. */
const HALO_ERROR =
  "radial-gradient(ellipse 108% 76% at 50% 50%, rgba(255, 0, 255, 0.3) 0%, rgba(255, 0, 255, 0.14) 38%, transparent 68%)";

function mapAuthError(
  err: { message: string; status?: number; code?: string },
  t: AuthCopy["errors"],
): string {
  const msg = err.message.toLowerCase();
  const code = err.code?.toLowerCase() ?? "";

  if (err.status === 429) return t.rateLimit;
  if (
    code === "invalid_credentials" ||
    msg.includes("invalid login") ||
    msg.includes("invalid credentials")
  ) {
    return t.invalidCredentials;
  }
  if (
    code === "email_not_confirmed" ||
    msg.includes("email not confirmed")
  ) {
    return t.emailNotConfirmed;
  }
  if (
    msg.includes("already registered") ||
    msg.includes("user already registered")
  ) {
    return t.alreadyRegistered;
  }
  if (
    msg.includes("password") &&
    (msg.includes("least") || msg.includes("short") || msg.includes("6"))
  ) {
    return t.weakPassword;
  }

  return t.generic;
}

function defaultPathForAudience(lang: Locale, audience: LoginAudience): string {
  return audience === "salon"
    ? defaultPartnerPostAuthPath(lang)
    : defaultPostAuthPath(lang);
}

function sanitizeClientNextPath(
  raw: string | null,
  lang: Locale,
  audience: LoginAudience,
): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return defaultPathForAudience(lang, audience);
  }
  if (!/^\/(fr|en)(\/|$)/.test(raw)) {
    return defaultPathForAudience(lang, audience);
  }
  return raw;
}

function resolveDestination(
  lang: Locale,
  explicitNext: string | null,
  audience: LoginAudience,
): string {
  if (explicitNext) {
    return sanitizeClientNextPath(explicitNext, lang, audience);
  }
  return defaultPathForAudience(lang, audience);
}

function buildAuthCallbackUrl(lang: Locale, nextPath: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
        "http://localhost:3000";
  const next = encodeURIComponent(nextPath);
  return `${origin}/auth/callback?next=${next}`;
}

type StrengthTier = "idle" | "weak" | "medium" | "strong";

function getPasswordStrengthTier(p: string): StrengthTier {
  if (!p.length) return "idle";
  const hasDigit = /\d/.test(p);
  const hasUpper = /[A-Z]/.test(p);
  if (p.length >= 8 && (hasDigit || hasUpper)) return "strong";
  if (
    (p.length >= 6 && p.length < 8) ||
    (p.length >= 8 && !hasDigit && !hasUpper)
  ) {
    return "medium";
  }
  return "weak";
}

function isPasswordStrong(p: string): boolean {
  return p.length >= 8 && (/\d/.test(p) || /[A-Z]/.test(p));
}

async function fadeThenNavigate(
  router: ReturnType<typeof useRouter>,
  path: string,
  setExitFade: (v: boolean) => void,
) {
  setExitFade(true);
  await new Promise((r) => setTimeout(r, 520));
  router.push(path);
  router.refresh();
}

export function LoginForm({
  lang,
  copy,
  audience,
  brandSlot,
  localeSwitcher,
  animateConnexion = true,
}: {
  lang: Locale;
  copy: AuthCopy;
  audience: LoginAudience;
  brandSlot?: ReactNode;
  localeSwitcher: LocaleSwitcherLabels;
  animateConnexion?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = copy;
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordConfirmVisible, setPasswordConfirmVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [exitFade, setExitFade] = useState(false);
  const [shakeGeneration, setShakeGeneration] = useState(0);
  const [shakeActive, setShakeActive] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const allowSignUp = audience === "studio";

  const postAuthPath = useMemo(
    () => sanitizeClientNextPath(searchParams.get("next"), lang, audience),
    [searchParams, lang, audience],
  );

  const raiseError = useCallback((message: string) => {
    setError(message);
    setShakeGeneration((g) => g + 1);
  }, []);

  const isSignUp = allowSignUp && mode === "signUp";
  const passwordsMatch = password === passwordConfirm;
  const confirmMismatchVisible =
    isSignUp &&
    passwordConfirm.length > 0 &&
    password.length > 0 &&
    !passwordsMatch;
  const passwordStrength = useMemo(
    () => getPasswordStrengthTier(password),
    [password],
  );
  const signUpSubmitBlocked =
    isSignUp &&
    (!displayName.trim() ||
      !passwordsMatch ||
      !isPasswordStrong(password) ||
      passwordConfirm.length < 8);

  useEffect(() => {
    if (searchParams.get("error") === "callback") {
      raiseError(t.errors.generic);
    }
  }, [searchParams, t.errors, raiseError]);

  const partnerSlugFromUrl = useMemo(() => {
    if (audience !== "salon") return null;
    return (
      normalizePartnerSlugParam(searchParams.get("partenaire")) ??
      normalizePartnerSlugParam(searchParams.get("partner"))
    );
  }, [audience, searchParams]);

  useEffect(() => {
    if (partnerSlugFromUrl) {
      persistPartnerConnexionSlug(partnerSlugFromUrl);
    }
  }, [partnerSlugFromUrl]);

  useEffect(() => {
    if (!shakeGeneration) return;
    setShakeActive(true);
    const timer = window.setTimeout(() => setShakeActive(false), 220);
    return () => window.clearTimeout(timer);
  }, [shakeGeneration]);

  function switchMode(next: "signIn" | "signUp") {
    if (!allowSignUp && next === "signUp") return;
    setMode(next);
    setError(null);
    setPasswordVisible(false);
    setPasswordConfirmVisible(false);
    setMarketingConsent(false);
    if (next === "signIn") {
      setPasswordConfirm("");
      setDisplayName("");
      setPhone("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signUp") {
      if (!displayName.trim()) {
        raiseError(t.errors.displayNameRequired);
        return;
      }
      if (!passwordsMatch) {
        raiseError(t.errors.passwordMismatch);
        return;
      }
      if (!isPasswordStrong(password)) {
        raiseError(t.errors.passwordTooWeak);
        return;
      }
    }

    setLoading(true);

    if (mode === "signIn") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (signInError) {
        raiseError(mapAuthError(signInError, t.errors));
        return;
      }
      if (audience === "salon" && partnerSlugFromUrl) {
        persistPartnerConnexionSlug(partnerSlugFromUrl);
      }
      const destination = resolveDestination(
        lang,
        searchParams.get("next"),
        audience,
      );
      await fadeThenNavigate(router, destination, setExitFade);
      return;
    }

    /*
     * Double opt-in : l’email de confirmation est envoyé par Supabase lorsque
     * « Confirm email » est activé dans Authentication > Providers > Email (projet).
     * Ne pas contourner côté client ; `emailRedirectTo` aligne le lien sur /auth/callback.
     */
    const emailRedirectTo = buildAuthCallbackUrl(lang, postAuthPath);
    const display_name = displayName.trim();
    /** Métadonnées Supabase : propriété littérale `phone` (minuscules). */
    const phoneMeta =
      phone.trim().length > 0 ? phone.trim() : t.phoneNotProvided;
    const marketing_consent = marketingConsent ?? false;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name,
          phone: phoneMeta,
          marketing_consent,
        },
        emailRedirectTo,
      },
    });
    setLoading(false);

    if (signUpError) {
      raiseError(mapAuthError(signUpError, t.errors));
      return;
    }

    if (data.session) {
      const destination = resolveDestination(
        lang,
        searchParams.get("next"),
        audience,
      );
      await fadeThenNavigate(router, destination, setExitFade);
      return;
    }

    setVerificationSent(true);
  }

  const homeHref = `/${lang}`;
  const haloNormal = isSignUp ? HALO_SIGN_UP : HALO_SIGN_IN;
  const haloBackground = error ? HALO_ERROR : haloNormal;
  const headline = isSignUp
    ? t.createAccess
    : audience === "salon"
      ? t.salonAccess
      : t.studioAccess;
  const subtitle =
    audience === "salon" && !isSignUp ? t.salonSubtitle : null;

  const tabActiveRingSignIn =
    "bg-white/[0.08] text-white shadow-[0_0_24px_-8px_rgba(139,92,246,0.45)]";
  const tabActiveRingSignUp =
    "bg-white/[0.08] text-white shadow-[0_0_24px_-8px_rgba(34,211,238,0.42)]";

  const cardGlow = isSignUp
    ? "shadow-[0_0_80px_-20px_rgba(34,211,238,0.32)]"
    : "shadow-[0_0_80px_-20px_rgba(139,92,246,0.35)]";

  const inputFocus = isSignUp
    ? "focus:border-cyan-400/40 focus:shadow-[0_0_0_1px_rgba(34,211,238,0.28)]"
    : "focus:border-violet-500/35 focus:shadow-[0_0_0_1px_rgba(139,92,246,0.25)]";

  const strengthBarWidth =
    passwordStrength === "strong"
      ? "100%"
      : passwordStrength === "medium"
        ? "66%"
        : passwordStrength === "weak"
          ? "33%"
          : "0%";
  const strengthBarColor =
    passwordStrength === "strong"
      ? "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.55)]"
      : passwordStrength === "medium"
        ? "bg-yellow-400/90"
        : "bg-red-500/90";

  if (verificationSent) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#020202] px-6 py-16">
        <div className="absolute right-5 top-5 z-20 md:right-8 md:top-8">
          <LocaleSwitcher lang={lang} {...localeSwitcher} />
        </div>
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(85vh,820px)] w-[min(150vw,68rem)] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-28 blur-[200px]"
            style={{ backgroundImage: HALO_CONFIRMATION }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(105vh,980px)] w-[min(185vw,82rem)] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.17] blur-[240px]"
            style={{ backgroundImage: HALO_CONFIRMATION }}
          />
        </div>
        <div className="relative z-10 isolate mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-4 text-center">
          <p className="mb-8 text-[10px] font-medium uppercase tracking-[0.55em] text-white/35">
            Odyssey
          </p>
          <p className="max-w-md text-base font-light leading-[1.75] tracking-[0.02em] text-white/75 md:text-lg">
            {t.confirmationMessage}
          </p>
          <p className="mt-16">
            <Link
              href={homeHref}
              className="text-[11px] uppercase tracking-[0.35em] text-white/35 underline decoration-white/15 underline-offset-4 transition-colors hover:text-white/55"
            >
              {t.backToSite}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#020202] px-6 py-16 transition-[background] duration-500">
      <div className="absolute right-5 top-5 z-20 md:right-8 md:top-8">
        <LocaleSwitcher lang={lang} {...localeSwitcher} />
      </div>
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden transition-[background-image] duration-300 ease-out">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(88vh,840px)] w-[min(160vw,70rem)] max-w-none -translate-x-1/2 -translate-y-1/2 blur-[200px]"
          style={{ backgroundImage: haloBackground }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[min(112vh,1020px)] w-[min(195vw,88rem)] max-w-none -translate-x-1/2 -translate-y-1/2 blur-[240px]"
          style={{ backgroundImage: haloBackground }}
        />
      </div>

      <div
        className={`fixed inset-0 z-[200] bg-black transition-opacity duration-500 ease-in-out ${exitFade ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!exitFade}
      />

      <div className="relative z-10 isolate w-full max-w-md">
        {brandSlot}

        <h1
          className={`mb-2 text-center text-white transition-colors duration-300 ${
            audience === "salon"
              ? `font-brand text-lg font-medium uppercase tracking-[0.22em] md:text-xl md:tracking-[0.26em] ${animateConnexion ? "salon-title-reveal" : ""}`
              : `text-xl font-light tracking-[0.08em] md:text-2xl ${animateConnexion ? "salon-title-reveal" : ""}`
          }`}
        >
          {headline}
        </h1>
        {subtitle ? (
          <p
            className={`mb-8 text-center text-sm font-light leading-relaxed text-white/45 ${animateConnexion ? "salon-subtitle-reveal" : ""}`}
          >
            {subtitle}
          </p>
        ) : (
          <div className="mb-8" aria-hidden />
        )}

        {allowSignUp ? (
          <div
            className={`mb-8 flex rounded-xl border border-white/10 bg-black/30 p-1 backdrop-blur-sm ${animateConnexion ? "salon-subtitle-reveal" : ""}`}
            role="tablist"
            aria-label={headline}
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signIn"}
              onClick={() => switchMode("signIn")}
              className={`flex-1 rounded-lg py-2.5 text-[10px] font-semibold uppercase tracking-[0.28em] transition-[color,background,box-shadow] ${
                mode === "signIn"
                  ? tabActiveRingSignIn
                  : "text-white/40 hover:text-white/65"
              }`}
            >
              {t.tabSignIn}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signUp"}
              onClick={() => switchMode("signUp")}
              className={`flex-1 rounded-lg py-2.5 text-[10px] font-semibold uppercase tracking-[0.28em] transition-[color,background,box-shadow] ${
                mode === "signUp"
                  ? tabActiveRingSignUp
                  : "text-white/40 hover:text-white/65"
              }`}
            >
              {t.tabSignUp}
            </button>
          </div>
        ) : null}

        <div
          className={`rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl transition-shadow duration-500 ${cardGlow} ${shakeActive ? "animate-login-form-shake" : ""} ${animateConnexion ? "salon-form-reveal" : ""}`}
        >
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="auth-email"
                className="text-[11px] font-medium uppercase tracking-[0.35em] text-white/45"
              >
                {t.email}
              </label>
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                suppressHydrationWarning
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className={`w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/90 outline-none transition-[border,box-shadow] placeholder:text-white/25 disabled:opacity-50 ${inputFocus}`}
                placeholder={t.emailPlaceholder}
              />
            </div>

            {isSignUp ? (
              <>
                <div className="space-y-2">
                  <label
                    htmlFor="auth-display-name"
                    className="text-[11px] font-medium uppercase tracking-[0.35em] text-white/45"
                  >
                    {t.displayName}
                  </label>
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-zinc-500"
                      strokeWidth={1.35}
                      aria-hidden
                    />
                    <input
                      id="auth-display-name"
                      name="displayName"
                      type="text"
                      autoComplete="name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required={isSignUp}
                      disabled={loading}
                      className={`w-full rounded-lg border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-sm text-white/90 outline-none transition-[border,box-shadow] placeholder:text-white/25 disabled:opacity-50 ${inputFocus}`}
                      placeholder={t.displayNamePlaceholder}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="auth-phone"
                    className="text-[11px] font-medium uppercase tracking-[0.35em] text-white/45"
                  >
                    {t.phone}
                  </label>
                  <div className="relative">
                    <Phone
                      className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-zinc-500"
                      strokeWidth={1.35}
                      aria-hidden
                    />
                    <input
                      id="auth-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={loading}
                      className={`w-full rounded-lg border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-sm text-white/90 outline-none transition-[border,box-shadow] placeholder:text-white/25 disabled:opacity-50 ${inputFocus}`}
                      placeholder={t.phonePlaceholder}
                    />
                  </div>
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <label
                htmlFor="auth-password"
                className="text-[11px] font-medium uppercase tracking-[0.35em] text-white/45"
              >
                {t.password}
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  name="password"
                  type={passwordVisible ? "text" : "password"}
                  autoComplete={
                    mode === "signIn" ? "current-password" : "new-password"
                  }
                  suppressHydrationWarning
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isSignUp ? 8 : 6}
                  disabled={loading}
                  className={`w-full rounded-lg border border-white/10 bg-black/40 py-3 pl-4 pr-11 text-sm text-white/90 outline-none transition-[border,box-shadow] placeholder:text-white/25 disabled:opacity-50 ${inputFocus}`}
                  placeholder={t.passwordPlaceholder}
                />
                <button
                  type="button"
                  disabled={loading}
                  aria-label={
                    passwordVisible
                      ? t.passwordVisibilityHide
                      : t.passwordVisibilityShow
                  }
                  aria-pressed={passwordVisible}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 shrink-0 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 outline-none transition-colors hover:text-zinc-400 focus-visible:text-zinc-400 focus-visible:ring-1 focus-visible:ring-white/15 disabled:pointer-events-none disabled:opacity-40"
                  onClick={() => setPasswordVisible((v) => !v)}
                >
                  {passwordVisible ? (
                    <EyeOff className="h-[15px] w-[15px]" strokeWidth={1.35} aria-hidden />
                  ) : (
                    <Eye className="h-[15px] w-[15px]" strokeWidth={1.35} aria-hidden />
                  )}
                </button>
              </div>
              {isSignUp && password.length > 0 ? (
                <div
                  className="h-0.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
                  aria-hidden
                >
                  <div
                    className={`h-full rounded-full transition-[width,background-color,box-shadow] duration-300 ease-out ${strengthBarColor}`}
                    style={{ width: strengthBarWidth }}
                  />
                </div>
              ) : null}
            </div>

            {isSignUp ? (
              <div className="space-y-2">
                <label
                  htmlFor="auth-password-confirm"
                  className="text-[11px] font-medium uppercase tracking-[0.35em] text-white/45"
                >
                  {t.passwordConfirm}
                </label>
                <div className="relative">
                  <input
                    id="auth-password-confirm"
                    name="passwordConfirm"
                    type={passwordConfirmVisible ? "text" : "password"}
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                    minLength={8}
                    disabled={loading}
                    className={`w-full rounded-lg border border-white/10 bg-black/40 py-3 pl-4 pr-11 text-sm text-white/90 outline-none transition-[border,box-shadow] placeholder:text-white/25 disabled:opacity-50 ${inputFocus}`}
                    placeholder={t.passwordConfirmPlaceholder}
                    aria-invalid={confirmMismatchVisible}
                  />
                  <button
                    type="button"
                    disabled={loading}
                    aria-label={
                      passwordConfirmVisible
                        ? t.passwordVisibilityHide
                        : t.passwordVisibilityShow
                    }
                    aria-pressed={passwordConfirmVisible}
                    className="absolute right-1.5 top-1/2 flex h-8 w-8 shrink-0 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 outline-none transition-colors hover:text-zinc-400 focus-visible:text-zinc-400 focus-visible:ring-1 focus-visible:ring-white/15 disabled:pointer-events-none disabled:opacity-40"
                    onClick={() =>
                      setPasswordConfirmVisible((v) => !v)
                    }
                  >
                    {passwordConfirmVisible ? (
                      <EyeOff className="h-[15px] w-[15px]" strokeWidth={1.35} aria-hidden />
                    ) : (
                      <Eye className="h-[15px] w-[15px]" strokeWidth={1.35} aria-hidden />
                    )}
                  </button>
                </div>
              </div>
            ) : null}

            {confirmMismatchVisible ? (
              <p
                className="text-center text-sm font-light text-red-400/85"
                role="alert"
              >
                {t.errors.passwordMismatch}
              </p>
            ) : null}

            {error ? (
              <p
                className="text-center text-sm font-light text-red-400/80"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            {isSignUp ? (
              <>
                <label className="flex cursor-pointer items-start gap-3 text-left">
                  <input
                    type="checkbox"
                    name="marketingConsent"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    disabled={loading}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border border-white/20 bg-black/50 text-cyan-500 accent-cyan-500 focus:ring-1 focus:ring-cyan-500/40 disabled:opacity-40"
                  />
                  <span className="text-[11px] font-light leading-snug tracking-wide text-white/50">
                    {t.marketingConsent}
                  </span>
                </label>

                <p className="text-center text-[10px] font-light leading-relaxed text-white/35">
                  {t.legalSignupIntro}{" "}
                  <a
                    href="#"
                    className="text-white/45 underline decoration-white/20 underline-offset-2 transition-colors hover:text-white/60"
                  >
                    {t.legalTerms}
                  </a>{" "}
                  {t.legalSignupMid}{" "}
                  <a
                    href="#"
                    className="text-white/45 underline decoration-white/20 underline-offset-2 transition-colors hover:text-white/60"
                  >
                    {t.legalPrivacy}
                  </a>
                  {t.legalSignupSuffix}
                </p>
              </>
            ) : null}

            <button
              type="submit"
              disabled={loading || (isSignUp && signUpSubmitBlocked)}
              aria-busy={loading}
              aria-label={loading ? t.loading : undefined}
              className="flex min-h-[44px] w-full items-center justify-center rounded-lg border border-white/12 bg-white/[0.06] py-3.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/90 transition-[background,opacity] hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? (
                <Loader2
                  className="h-4 w-4 shrink-0 animate-spin opacity-85"
                  aria-hidden
                />
              ) : mode === "signIn" ? (
                t.submitSignIn
              ) : (
                t.submitSignUp
              )}
            </button>
          </form>
        </div>

        <p className="mt-10 text-center text-[11px] text-white/30">
          <Link
            href={homeHref}
            className="underline decoration-white/15 underline-offset-4 transition-colors hover:text-white/55"
          >
            {t.backToSite}
          </Link>
        </p>
      </div>
    </div>
  );
}
